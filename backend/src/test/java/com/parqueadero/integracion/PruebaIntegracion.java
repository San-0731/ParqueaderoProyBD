package com.parqueadero.integracion;

import static org.junit.jupiter.api.Assertions.fail;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.config.Configuracion;
import com.parqueadero.util.TipoPorPlaca;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Base de todas las pruebas de integración (las que usan MySQL real).
 *
 * <p>Las subclases quedan marcadas con {@code @Tag("integracion")} porque esa
 * anotación se hereda. Por eso no corren con {@code mvn clean package}; solo
 * con el perfil de Maven:
 *
 * <pre>
 * ./database/scripts/recrear-bd-pruebas.sh
 * cd backend &amp;&amp; mvn verify -Pintegracion
 * </pre>
 *
 * <p>Ofrece utilidades para:
 * <ul>
 *   <li>abrir conexiones a la base de pruebas ({@link #conexion()});</li>
 *   <li>generar placas y documentos que no existen en la base
 *       ({@link #identificadorUnico(String)}, {@link #documentoUnico()});</li>
 *   <li>crear datos mínimos ({@link #crearPropietario(Connection)},
 *       {@link #crearVehiculo(Connection, String)});</li>
 *   <li>borrar lo creado al terminar cada prueba ({@link #limpiarDatosCreados()}).</li>
 * </ul>
 *
 * <p>Las utilidades que crean datos reciben la conexión: así una prueba puede
 * crearlos dentro de su propia transacción y deshacerlos con {@code rollback()}.
 */
@Tag("integracion")
public abstract class PruebaIntegracion {

    /** Las pruebas solo aceptan bases cuyo nombre termine así. */
    private static final String SUFIJO_BASE_PRUEBAS = "_test";

    private static final String LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    /** Identificadores y documentos ya entregados en esta ejecución, para no repetirlos. */
    private static final Set<String> GENERADOS = ConcurrentHashMap.newKeySet();

    private static Configuracion configuracion;
    private static ConexionBD conexionBD;

    // JUnit crea un objeto nuevo de la clase de prueba para cada método @Test,
    // así que estas listas solo guardan lo que creó la prueba actual.
    private final List<Long> vehiculosCreados = new ArrayList<>();
    private final List<Long> propietariosCreados = new ArrayList<>();

    /** Vehículo creado para una prueba, con su propietario. */
    public record VehiculoPrueba(long idVehiculo, String identificador, long idTipo, long idCliente) {
    }

    /**
     * Carga la configuración (variables de entorno o {@code .env}) y comprueba
     * que apunte a la base de pruebas. Si no, falla sin tocar nada: así nunca se
     * ensucia la base de desarrollo, aunque la prueba se ejecute desde el IDE.
     */
    @BeforeAll
    static void prepararBaseDePruebas() {
        if (configuracion != null) {
            return; // Ya la cargó otra clase de prueba en esta ejecución.
        }
        Configuracion cargada = Configuracion.cargar();
        if (!cargada.getDbNombre().endsWith(SUFIJO_BASE_PRUEBAS)) {
            fail("Las pruebas de integración solo usan una base que termine en "
                    + SUFIJO_BASE_PRUEBAS + ", pero DB_NAME es '" + cargada.getDbNombre()
                    + "'. Ejecútalas con: cd backend && mvn verify -Pintegracion"
                    + " (o define DB_NAME=parqueadero_test).");
        }
        configuracion = cargada;
        conexionBD = new ConexionBD(cargada);
    }

    /** Configuración de la base de pruebas, por ejemplo para levantar el {@code Servidor}. */
    protected static Configuracion configuracion() {
        return configuracion;
    }

    /** Abre una conexión nueva a la base de pruebas; quien la pide debe cerrarla. */
    protected static Connection conexion() throws SQLException {
        return conexionBD.obtenerConexion();
    }

    /**
     * Genera un identificador que no existe en la base y que, según
     * {@link TipoPorPlaca}, corresponde al tipo pedido:
     * carro {@code ABC123}, moto {@code ABC12D}, camión {@code R12345} o
     * {@code S12345}, bicicleta {@code BICI} y seis números.
     *
     * @param tipo una de las constantes de {@link TipoPorPlaca}
     */
    protected static String identificadorUnico(String tipo) {
        ThreadLocalRandom azar = ThreadLocalRandom.current();
        for (int intento = 0; intento < 100; intento++) {
            String candidato = switch (tipo) {
                case TipoPorPlaca.CARRO -> letras(3) + digitos(3);
                case TipoPorPlaca.MOTO -> letras(3) + digitos(2) + letras(1);
                case TipoPorPlaca.CAMION -> (azar.nextBoolean() ? "R" : "S") + digitos(5);
                case TipoPorPlaca.BICICLETA -> "BICI" + digitos(6);
                default -> throw new IllegalArgumentException("Tipo de vehículo desconocido: " + tipo);
            };
            if (!existe("SELECT 1 FROM vehiculo WHERE identificador = ?", candidato)
                    && GENERADOS.add(candidato)) {
                return candidato;
            }
        }
        throw new IllegalStateException("No se encontró un identificador libre para " + tipo);
    }

    /** Genera un documento de identidad (10 números, empieza por 99) que no existe en la base. */
    protected static String documentoUnico() {
        for (int intento = 0; intento < 100; intento++) {
            String candidato = "99" + digitos(8);
            if (!existe("SELECT 1 FROM cliente WHERE documento = ?", candidato)
                    && GENERADOS.add(candidato)) {
                return candidato;
            }
        }
        throw new IllegalStateException("No se encontró un documento libre.");
    }

    /** Id del tipo de vehículo con ese nombre (tabla {@code tipo_vehiculo}). */
    protected static long idTipo(Connection conexion, String nombreTipo) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "SELECT id_tipo FROM tipo_vehiculo WHERE nombre = ?")) {
            consulta.setString(1, nombreTipo);
            try (ResultSet fila = consulta.executeQuery()) {
                if (!fila.next()) {
                    throw new IllegalArgumentException("No existe el tipo de vehículo " + nombreTipo);
                }
                return fila.getLong(1);
            }
        }
    }

    /**
     * Crea un propietario (cliente) con un documento único y lo anota para
     * borrarlo al final de la prueba.
     *
     * @return el id del cliente creado
     */
    protected long crearPropietario(Connection conexion) throws SQLException {
        String sql = "INSERT INTO cliente (documento, nombres, apellidos, telefono)"
                + " VALUES (?, 'Prueba', 'Integración', NULL)";
        try (PreparedStatement insercion = conexion.prepareStatement(sql,
                Statement.RETURN_GENERATED_KEYS)) {
            insercion.setString(1, documentoUnico());
            insercion.executeUpdate();
            long idCliente = llaveGenerada(insercion);
            propietariosCreados.add(idCliente);
            return idCliente;
        }
    }

    /**
     * Crea un propietario y un vehículo suyo del tipo pedido, con una placa
     * única que corresponde a ese tipo. Ambos se borran al final de la prueba.
     *
     * @param tipo una de las constantes de {@link TipoPorPlaca}
     */
    protected VehiculoPrueba crearVehiculo(Connection conexion, String tipo) throws SQLException {
        long idCliente = crearPropietario(conexion);
        long idTipo = idTipo(conexion, tipo);
        String identificador = identificadorUnico(tipo);
        String sql = "INSERT INTO vehiculo (identificador, id_tipo, id_modelo, id_cliente, color, anio)"
                + " VALUES (?, ?, NULL, ?, NULL, NULL)";
        try (PreparedStatement insercion = conexion.prepareStatement(sql,
                Statement.RETURN_GENERATED_KEYS)) {
            insercion.setString(1, identificador);
            insercion.setLong(2, idTipo);
            insercion.setLong(3, idCliente);
            insercion.executeUpdate();
            long idVehiculo = llaveGenerada(insercion);
            vehiculosCreados.add(idVehiculo);
            return new VehiculoPrueba(idVehiculo, identificador, idTipo, idCliente);
        }
    }

    /** Anota un vehículo creado por otra vía (por ejemplo, por la API) para borrarlo al final. */
    protected void registrarVehiculoCreado(long idVehiculo) {
        vehiculosCreados.add(idVehiculo);
    }

    /** Anota un propietario creado por otra vía (por ejemplo, por la API) para borrarlo al final. */
    protected void registrarPropietarioCreado(long idCliente) {
        propietariosCreados.add(idCliente);
    }

    /**
     * Borra lo que creó la prueba, en orden inverso a las llaves foráneas:
     * pagos → registros de parqueo → vehículos → propietarios. Se ejecuta solo
     * después de cada prueba; si los datos ya se deshicieron con
     * {@code rollback()}, los DELETE no encuentran nada y no pasa nada.
     */
    @AfterEach
    protected void limpiarDatosCreados() throws SQLException {
        if (vehiculosCreados.isEmpty() && propietariosCreados.isEmpty()) {
            return;
        }
        try (Connection conexion = conexion()) {
            conexion.setAutoCommit(false);
            try {
                if (!vehiculosCreados.isEmpty()) {
                    String ids = marcadores(vehiculosCreados.size());
                    borrar(conexion, "DELETE p FROM pago p"
                            + " JOIN registro_parqueo r ON r.id_registro = p.id_registro"
                            + " WHERE r.id_vehiculo IN (" + ids + ")", vehiculosCreados);
                    borrar(conexion, "DELETE FROM registro_parqueo WHERE id_vehiculo IN (" + ids + ")",
                            vehiculosCreados);
                    borrar(conexion, "DELETE FROM vehiculo WHERE id_vehiculo IN (" + ids + ")",
                            vehiculosCreados);
                }
                if (!propietariosCreados.isEmpty()) {
                    borrar(conexion, "DELETE FROM cliente WHERE id_cliente IN ("
                            + marcadores(propietariosCreados.size()) + ")", propietariosCreados);
                }
                conexion.commit();
            } catch (SQLException e) {
                conexion.rollback();
                throw e;
            }
        }
        vehiculosCreados.clear();
        propietariosCreados.clear();
    }

    // ---------------------------------------------------------------- auxiliares

    /** Consulta si la búsqueda con un parámetro devuelve al menos una fila. */
    private static boolean existe(String sql, String valor) {
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, valor);
            try (ResultSet fila = consulta.executeQuery()) {
                return fila.next();
            }
        } catch (SQLException e) {
            throw new IllegalStateException("No se pudo consultar la base de pruebas: " + e.getMessage(), e);
        }
    }

    private static void borrar(Connection conexion, String sql, List<Long> ids) throws SQLException {
        try (PreparedStatement borrado = conexion.prepareStatement(sql)) {
            for (int i = 0; i < ids.size(); i++) {
                borrado.setLong(i + 1, ids.get(i));
            }
            borrado.executeUpdate();
        }
    }

    /** {@code "?, ?, ?"} con tantos signos como valores: los ids van como parámetros, nunca pegados al SQL. */
    private static String marcadores(int cantidad) {
        return String.join(", ", Collections.nCopies(cantidad, "?"));
    }

    private static long llaveGenerada(PreparedStatement insercion) throws SQLException {
        try (ResultSet llaves = insercion.getGeneratedKeys()) {
            if (!llaves.next()) {
                throw new SQLException("La base no devolvió el id generado.");
            }
            return llaves.getLong(1);
        }
    }

    private static String letras(int cantidad) {
        StringBuilder texto = new StringBuilder(cantidad);
        for (int i = 0; i < cantidad; i++) {
            texto.append(LETRAS.charAt(ThreadLocalRandom.current().nextInt(LETRAS.length())));
        }
        return texto.toString();
    }

    private static String digitos(int cantidad) {
        StringBuilder texto = new StringBuilder(cantidad);
        for (int i = 0; i < cantidad; i++) {
            texto.append(ThreadLocalRandom.current().nextInt(10));
        }
        return texto.toString();
    }
}
