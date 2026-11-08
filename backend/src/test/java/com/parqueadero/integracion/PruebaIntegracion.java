package com.parqueadero.integracion;

import static org.junit.jupiter.api.Assertions.fail;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.config.Configuracion;
import com.parqueadero.model.Rol;
import com.parqueadero.util.Contrasenas;
import com.parqueadero.util.TipoPorPlaca;
import com.parqueadero.util.Tokens;
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
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

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
 *       {@link #crearVehiculo(Connection, String)},
 *       {@link #crearEspacio(Connection, String, boolean)},
 *       {@link #crearUsuario(Connection, Rol)});</li>
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
    private final List<Long> espaciosCreados = new ArrayList<>();
    private final List<Long> usuariosCreados = new ArrayList<>();
    private final List<Long> zonasCreadas = new ArrayList<>();
    private final List<Long> modelosCreados = new ArrayList<>();
    private final List<Long> marcasCreadas = new ArrayList<>();

    /**
     * Iteraciones de PBKDF2 de los usuarios de prueba: pocas, para que crear
     * uno no tarde medio segundo. La verificación lee las iteraciones del hash,
     * así que el inicio de sesión funciona igual que con un usuario real.
     */
    private static final int ITERACIONES_PRUEBA = 1_000;

    /**
     * Piso de las zonas de prueba. La semilla solo usa los pisos 1 y 2, así que
     * las pruebas nunca tocan los espacios de V002.
     */
    public static final String PISO_PRUEBAS = "99";

    /**
     * Letra de la zona de prueba de cada tipo de vehículo, todas en el piso
     * {@link #PISO_PRUEBAS}. Una zona admite un solo tipo (V006), por eso hay
     * una por tipo: C99 carros, M99 motos, T99 camiones y B99 bicicletas.
     */
    public static final Map<String, String> LETRA_ZONA_PRUEBAS = Map.of(
            TipoPorPlaca.CARRO, "C",
            TipoPorPlaca.MOTO, "M",
            TipoPorPlaca.CAMION, "T",
            TipoPorPlaca.BICICLETA, "B");

    /** Máximo de espacios por zona: los números van del 01 al 99 (V006). */
    private static final int MAX_ESPACIOS_POR_ZONA = 99;

    /** Contador para elegir el número del próximo espacio de prueba; empieza al azar. */
    private static final AtomicInteger SIGUIENTE_ESPACIO =
            new AtomicInteger(ThreadLocalRandom.current().nextInt(MAX_ESPACIOS_POR_ZONA));

    /** Vehículo creado para una prueba, con su propietario. */
    public record VehiculoPrueba(long idVehiculo, String identificador, long idTipo, long idCliente) {
    }

    /** Usuario creado para una prueba, con su contraseña en claro (solo existe aquí). */
    public record UsuarioPrueba(long idUsuario, String nombreUsuario, String clave, Rol rol) {
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

    /**
     * Crea un usuario activo de la aplicación con el rol pedido, un nombre que
     * no existe ({@code prueba_} y 10 letras o números) y una contraseña
     * aleatoria. Se borra al final de la prueba, con sus sesiones.
     */
    protected UsuarioPrueba crearUsuario(Connection conexion, Rol rol) throws SQLException {
        String nombre;
        do {
            nombre = "prueba_" + minusculasYDigitos(10);
        } while (existe("SELECT 1 FROM usuario WHERE nombre_usuario = ?", nombre)
                || !GENERADOS.add(nombre));
        String clave = Tokens.generar();
        String sql = "INSERT INTO usuario (nombre_usuario, nombre_completo, clave_hash, id_rol)"
                + " VALUES (?, 'Usuario de prueba', ?, (SELECT id_rol FROM rol WHERE nombre = ?))";
        try (PreparedStatement insercion = conexion.prepareStatement(sql,
                Statement.RETURN_GENERATED_KEYS)) {
            insercion.setString(1, nombre);
            insercion.setString(2, Contrasenas.hash(clave, ITERACIONES_PRUEBA));
            insercion.setString(3, rol.name());
            insercion.executeUpdate();
            long idUsuario = llaveGenerada(insercion);
            usuariosCreados.add(idUsuario);
            return new UsuarioPrueba(idUsuario, nombre, clave, rol);
        }
    }

    /**
     * Crea un espacio propio de la prueba en la zona de prueba de su tipo (piso
     * {@link #PISO_PRUEBAS}; por ejemplo C99 para carros), con un número libre
     * del 01 al 99. Así la prueba no depende de qué espacios de la semilla V003
     * están libres. El espacio se borra al final de la prueba; la zona se queda,
     * porque la comparten todas las pruebas.
     *
     * @param tipo una de las constantes de {@link TipoPorPlaca}
     * @return el id del espacio creado
     */
    protected long crearEspacio(Connection conexion, String tipo, boolean habilitado)
            throws SQLException {
        long idZona = zonaDePrueba(conexion, tipo);
        String numero;
        int intentos = 0;
        do {
            if (++intentos > MAX_ESPACIOS_POR_ZONA) {
                throw new IllegalStateException("La zona de prueba de " + tipo + " ya tiene "
                        + MAX_ESPACIOS_POR_ZONA + " espacios. Recrea la base de pruebas:"
                        + " ./database/scripts/recrear-bd-pruebas.sh");
            }
            int siguiente = Math.floorMod(SIGUIENTE_ESPACIO.getAndIncrement(), MAX_ESPACIOS_POR_ZONA);
            numero = String.format("%02d", siguiente + 1);
        } while (existe("SELECT 1 FROM espacio WHERE id_zona = ? AND numero = ?", idZona, numero));
        String sql = "INSERT INTO espacio (id_zona, numero, habilitado) VALUES (?, ?, ?)";
        try (PreparedStatement insercion = conexion.prepareStatement(sql,
                Statement.RETURN_GENERATED_KEYS)) {
            insercion.setLong(1, idZona);
            insercion.setString(2, numero);
            insercion.setBoolean(3, habilitado);
            insercion.executeUpdate();
            long idEspacio = llaveGenerada(insercion);
            espaciosCreados.add(idEspacio);
            return idEspacio;
        }
    }

    /** Anota un vehículo creado por otra vía (por ejemplo, por la API) para borrarlo al final. */
    protected void registrarVehiculoCreado(long idVehiculo) {
        vehiculosCreados.add(idVehiculo);
    }

    /** Anota un espacio creado por otra vía (por ejemplo, por la API) para borrarlo al final. */
    protected void registrarEspacioCreado(long idEspacio) {
        espaciosCreados.add(idEspacio);
    }

    /** Anota una zona creada por la API para borrarla al final (después de sus espacios). */
    protected void registrarZonaCreada(long idZona) {
        zonasCreadas.add(idZona);
    }

    /** Anota una marca creada por la API para borrarla al final (después de sus modelos). */
    protected void registrarMarcaCreada(long idMarca) {
        marcasCreadas.add(idMarca);
    }

    /** Anota un modelo creado por la API para borrarlo al final. */
    protected void registrarModeloCreado(long idModelo) {
        modelosCreados.add(idModelo);
    }

    /** Anota un usuario creado por otra vía (por ejemplo, por la API) para borrarlo al final. */
    protected void registrarUsuarioCreado(long idUsuario) {
        usuariosCreados.add(idUsuario);
    }

    /** Anota un propietario creado por otra vía (por ejemplo, por la API) para borrarlo al final. */
    protected void registrarPropietarioCreado(long idCliente) {
        propietariosCreados.add(idCliente);
    }

    /**
     * Borra lo que creó la prueba, en orden inverso a las llaves foráneas:
     * pagos → registros de parqueo (de sus vehículos o en sus espacios) →
     * vehículos → propietarios → espacios → zonas → modelos → marcas →
     * auditoría → sesiones → usuarios. Se ejecuta solo después de cada
     * prueba; si los datos ya se deshicieron con {@code rollback()}, los DELETE
     * no encuentran nada y no pasa nada.
     */
    @AfterEach
    protected void limpiarDatosCreados() throws SQLException {
        if (vehiculosCreados.isEmpty() && propietariosCreados.isEmpty() && espaciosCreados.isEmpty()
                && usuariosCreados.isEmpty() && zonasCreadas.isEmpty() && modelosCreados.isEmpty()
                && marcasCreadas.isEmpty()) {
            return;
        }
        // Registros de parqueo de la prueba: los de sus vehículos o los hechos en sus espacios.
        List<String> condiciones = new ArrayList<>();
        List<Long> parametros = new ArrayList<>();
        if (!vehiculosCreados.isEmpty()) {
            condiciones.add("id_vehiculo IN (" + marcadores(vehiculosCreados.size()) + ")");
            parametros.addAll(vehiculosCreados);
        }
        if (!espaciosCreados.isEmpty()) {
            condiciones.add("id_espacio IN (" + marcadores(espaciosCreados.size()) + ")");
            parametros.addAll(espaciosCreados);
        }
        try (Connection conexion = conexion()) {
            conexion.setAutoCommit(false);
            try {
                if (!condiciones.isEmpty()) {
                    String registros = "SELECT id_registro FROM registro_parqueo WHERE "
                            + String.join(" OR ", condiciones);
                    borrar(conexion, "DELETE FROM pago WHERE id_registro IN (" + registros + ")",
                            parametros);
                    borrar(conexion, "DELETE FROM registro_parqueo WHERE "
                            + String.join(" OR ", condiciones), parametros);
                }
                // Los nombres de tabla y columna son fijos (no vienen de afuera).
                borrarPorIds(conexion, "vehiculo", "id_vehiculo", vehiculosCreados);
                borrarPorIds(conexion, "cliente", "id_cliente", propietariosCreados);
                borrarPorIds(conexion, "espacio", "id_espacio", espaciosCreados);
                borrarPorIds(conexion, "zona", "id_zona", zonasCreadas);
                borrarPorIds(conexion, "modelo", "id_modelo", modelosCreados);
                borrarPorIds(conexion, "marca", "id_marca", marcasCreadas);
                // Lo que hicieron los usuarios de prueba quedó en la auditoría (V008), que
                // apunta al usuario: se borra antes que él.
                borrarPorIds(conexion, "auditoria", "id_usuario", usuariosCreados);
                borrarPorIds(conexion, "sesion", "id_usuario", usuariosCreados);
                borrarPorIds(conexion, "usuario", "id_usuario", usuariosCreados);
                conexion.commit();
            } catch (SQLException e) {
                conexion.rollback();
                throw e;
            }
        }
        vehiculosCreados.clear();
        propietariosCreados.clear();
        espaciosCreados.clear();
        usuariosCreados.clear();
        zonasCreadas.clear();
        modelosCreados.clear();
        marcasCreadas.clear();
    }

    private static void borrarPorIds(Connection conexion, String tabla, String columna, List<Long> ids)
            throws SQLException {
        if (!ids.isEmpty()) {
            borrar(conexion, "DELETE FROM " + tabla + " WHERE " + columna + " IN ("
                    + marcadores(ids.size()) + ")", ids);
        }
    }

    // ---------------------------------------------------------------- auxiliares

    /**
     * Id de la zona de prueba del tipo pedido. Si todavía no existe, la crea con
     * la misma conexión (si esa conexión tiene una transacción que luego se
     * deshace, la zona se vuelve a crear la próxima vez).
     */
    private static long zonaDePrueba(Connection conexion, String tipo) throws SQLException {
        String letra = LETRA_ZONA_PRUEBAS.get(tipo);
        if (letra == null) {
            throw new IllegalArgumentException("No hay zona de prueba para el tipo " + tipo);
        }
        String buscar = "SELECT id_zona FROM zona WHERE piso = ? AND letra = ?";
        try (PreparedStatement consulta = conexion.prepareStatement(buscar)) {
            consulta.setString(1, PISO_PRUEBAS);
            consulta.setString(2, letra);
            try (ResultSet fila = consulta.executeQuery()) {
                if (fila.next()) {
                    return fila.getLong(1);
                }
            }
        }
        String crear = "INSERT INTO zona (piso, letra, id_tipo) VALUES (?, ?, ?)";
        try (PreparedStatement insercion = conexion.prepareStatement(crear,
                Statement.RETURN_GENERATED_KEYS)) {
            insercion.setString(1, PISO_PRUEBAS);
            insercion.setString(2, letra);
            insercion.setLong(3, idTipo(conexion, tipo));
            insercion.executeUpdate();
            return llaveGenerada(insercion);
        }
    }

    /** Consulta si la búsqueda (con sus parámetros) devuelve al menos una fila. */
    private static boolean existe(String sql, Object... valores) {
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(sql)) {
            for (int i = 0; i < valores.length; i++) {
                consulta.setObject(i + 1, valores[i]);
            }
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

    private static String minusculasYDigitos(int cantidad) {
        String caracteres = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder texto = new StringBuilder(cantidad);
        for (int i = 0; i < cantidad; i++) {
            texto.append(caracteres.charAt(ThreadLocalRandom.current().nextInt(caracteres.length())));
        }
        return texto.toString();
    }
}
