package com.parqueadero.bd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.parqueadero.integracion.PruebaIntegracion;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Base de las pruebas de las reglas de la base de datos (CHECK, UNIQUE, llaves
 * foráneas, triggers y vistas). Van directo a MySQL con JDBC, sin servicios ni
 * servidor.
 *
 * <p>Cada prueba trabaja dentro de una transacción ({@link #transaccion}) que
 * se deshace con {@code rollback()} al terminar: la base de pruebas queda
 * igual que antes. Mientras la transacción está abierta, las consultas de la
 * misma conexión (incluidas las vistas) sí ven los datos que la prueba creó.
 *
 * <p>Si una instrucción falla (por ejemplo, por un CHECK), MySQL solo deshace
 * esa instrucción, no toda la transacción; por eso una prueba puede comprobar
 * un error y seguir trabajando con los datos que ya creó.
 */
abstract class PruebaBaseDatos extends PruebaIntegracion {

    /** Mensajes exactos de los SIGNAL de {@code V005__triggers.sql}. */
    static final String MENSAJE_TIPO_NO_COINCIDE = "El tipo del vehículo no coincide con el tipo del espacio";
    static final String MENSAJE_ESPACIO_DESHABILITADO = "El espacio no está habilitado";

    /** Códigos de error de MySQL que comprueban estas pruebas. */
    static final int ERROR_DUPLICADO = 1062;        // UNIQUE repetido
    static final int ERROR_CHECK = 3819;            // CHECK violado
    static final int ERROR_PADRE_EN_USO = 1451;     // borrar un padre que tiene hijos (RESTRICT)
    static final int ERROR_PADRE_INEXISTENTE = 1452; // llave foránea a un padre que no existe

    /** Conexión de la prueba, con una transacción abierta que se deshace al final. */
    protected Connection transaccion;

    /** Una instrucción SQL que puede fallar; se usa con las afirmaciones de error. */
    @FunctionalInterface
    protected interface AccionSql {
        void ejecutar() throws SQLException;
    }

    @BeforeEach
    void abrirTransaccion() throws SQLException {
        transaccion = conexion();
        transaccion.setAutoCommit(false);
    }

    /**
     * Deshace todo lo que hizo la prueba. JUnit ejecuta este {@code @AfterEach}
     * antes que el de {@link PruebaIntegracion}, así que su limpieza ya no
     * encuentra nada que borrar.
     */
    @AfterEach
    void deshacerTransaccion() throws SQLException {
        if (transaccion != null) {
            try {
                transaccion.rollback();
            } finally {
                transaccion.close();
            }
        }
    }

    // ------------------------------------------------------------ datos de prueba

    /**
     * Crea, dentro de la transacción, un espacio propio de la prueba en la zona
     * de prueba de su tipo (piso 99), para no depender de qué espacios de la
     * semilla V003 están libres.
     *
     * @param tipo una de las constantes de {@link com.parqueadero.util.TipoPorPlaca}
     * @return el id del espacio creado
     */
    protected long crearEspacio(String tipo, boolean habilitado) throws SQLException {
        return crearEspacio(transaccion, tipo, habilitado);
    }

    /** Inserta un vehículo con el identificador tal como se escribe (el trigger lo normaliza). */
    protected long insertarVehiculo(String identificador, String tipo, long idCliente) throws SQLException {
        return insertar("INSERT INTO vehiculo (identificador, id_tipo, id_cliente) VALUES (?, ?, ?)",
                identificador, idTipo(transaccion, tipo), idCliente);
    }

    /**
     * Registra la entrada de un vehículo con hora de entrada hace 2 horas. Así
     * se puede cerrar enseguida sin chocar con el CHECK de que la salida sea
     * posterior a la entrada.
     *
     * @return el id del registro de parqueo
     */
    protected long registrarEntrada(long idVehiculo, long idEspacio) throws SQLException {
        return insertar("INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada)"
                + " VALUES (?, ?, NOW() - INTERVAL 2 HOUR)", idVehiculo, idEspacio);
    }

    /**
     * Cierra un registro como lo hace la aplicación al cobrar: salida ahora,
     * minutos calculados, valor y estado {@code 'PAGO'}.
     */
    protected void cerrarRegistro(long idRegistro, String valorTotal) throws SQLException {
        ejecutar("UPDATE registro_parqueo SET salida = NOW(),"
                        + " minutos_totales = TIMESTAMPDIFF(MINUTE, entrada, NOW()),"
                        + " valor_total = ?, estado = 'PAGO' WHERE id_registro = ?",
                new BigDecimal(valorTotal), idRegistro);
    }

    /** Inserta un pago con la fecha de ahora. {@code referencia} puede ser {@code null} (efectivo). */
    protected long insertarPago(long idRegistro, String metodo, String monto, String referencia)
            throws SQLException {
        return insertar("INSERT INTO pago (id_registro, id_metodo, monto, referencia)"
                        + " VALUES (?, (SELECT id_metodo FROM metodo_pago WHERE nombre = ?), ?, ?)",
                idRegistro, metodo, new BigDecimal(monto), referencia);
    }

    /** Inserta un pago con una fecha fija, en formato {@code 'AAAA-MM-DD HH:MM:SS'}. */
    protected long insertarPago(long idRegistro, String metodo, String monto, String referencia,
            String fechaPago) throws SQLException {
        return insertar("INSERT INTO pago (id_registro, id_metodo, monto, referencia, fecha_pago)"
                        + " VALUES (?, (SELECT id_metodo FROM metodo_pago WHERE nombre = ?), ?, ?, ?)",
                idRegistro, metodo, new BigDecimal(monto), referencia, fechaPago);
    }

    // ------------------------------------------------------------ SQL dentro de la transacción

    /** Ejecuta un INSERT, UPDATE o DELETE y devuelve cuántas filas cambió. */
    protected int ejecutar(String sql, Object... parametros) throws SQLException {
        try (PreparedStatement sentencia = transaccion.prepareStatement(sql)) {
            asignar(sentencia, parametros);
            return sentencia.executeUpdate();
        }
    }

    /** Ejecuta un INSERT y devuelve el id generado (AUTO_INCREMENT). */
    protected long insertar(String sql, Object... parametros) throws SQLException {
        try (PreparedStatement sentencia = transaccion.prepareStatement(sql,
                Statement.RETURN_GENERATED_KEYS)) {
            asignar(sentencia, parametros);
            sentencia.executeUpdate();
            try (ResultSet llaves = sentencia.getGeneratedKeys()) {
                if (!llaves.next()) {
                    throw new SQLException("La base no devolvió el id generado.");
                }
                return llaves.getLong(1);
            }
        }
    }

    /** Todas las filas de una consulta, cada una como mapa columna → valor (en orden). */
    protected List<Map<String, Object>> consultarFilas(String sql, Object... parametros)
            throws SQLException {
        try (PreparedStatement consulta = transaccion.prepareStatement(sql)) {
            asignar(consulta, parametros);
            try (ResultSet filas = consulta.executeQuery()) {
                ResultSetMetaData columnas = filas.getMetaData();
                List<Map<String, Object>> resultado = new ArrayList<>();
                while (filas.next()) {
                    Map<String, Object> fila = new LinkedHashMap<>();
                    for (int i = 1; i <= columnas.getColumnCount(); i++) {
                        fila.put(columnas.getColumnLabel(i), filas.getObject(i));
                    }
                    resultado.add(fila);
                }
                return resultado;
            }
        }
    }

    /** La única fila de una consulta; falla si devuelve cero filas o más de una. */
    protected Map<String, Object> consultarFila(String sql, Object... parametros) throws SQLException {
        List<Map<String, Object>> filas = consultarFilas(sql, parametros);
        assertEquals(1, filas.size(), () -> "Se esperaba una sola fila de: " + sql);
        return filas.getFirst();
    }

    /** Valor de la primera columna de la única fila, como texto ({@code null} si es NULL). */
    protected String consultarTexto(String sql, Object... parametros) throws SQLException {
        Object valor = consultarFila(sql, parametros).values().iterator().next();
        return valor == null ? null : valor.toString();
    }

    /** {@code true} si la consulta devuelve al menos una fila. */
    protected boolean hayFilas(String sql, Object... parametros) throws SQLException {
        return !consultarFilas(sql, parametros).isEmpty();
    }

    // ------------------------------------------------------------ afirmaciones

    /**
     * Comprueba que la acción falla con el código de error de MySQL esperado y
     * que el mensaje nombra la restricción (por ejemplo {@code chk_pago_monto_positivo}).
     *
     * @return el error, por si la prueba quiere revisar algo más
     */
    protected static SQLException assertErrorMySql(int codigoEsperado, String restriccion,
            AccionSql accion) {
        SQLException error = assertThrows(SQLException.class, accion::ejecutar,
                () -> "Se esperaba el error " + codigoEsperado + " (" + restriccion + ")");
        assertEquals(codigoEsperado, error.getErrorCode(),
                () -> "Código de error distinto. Mensaje de MySQL: " + error.getMessage());
        assertTrue(error.getMessage().contains(restriccion),
                () -> "El mensaje no nombra '" + restriccion + "': " + error.getMessage());
        return error;
    }

    /**
     * Comprueba que un trigger rechazó la acción con {@code SIGNAL SQLSTATE '45000'}
     * (error 1644) y exactamente el mensaje esperado. Como los mensajes llevan
     * tildes, de paso se comprueba que viajan bien en UTF-8.
     */
    protected static void assertRechazoTrigger(String mensajeEsperado, AccionSql accion) {
        SQLException error = assertThrows(SQLException.class, accion::ejecutar,
                () -> "El trigger debía rechazar la operación: " + mensajeEsperado);
        assertEquals("45000", error.getSQLState(), () -> "SQLState distinto: " + error.getMessage());
        assertEquals(1644, error.getErrorCode());
        assertEquals(mensajeEsperado, error.getMessage());
    }

    /** Compara montos sin importar los decimales ({@code 3500} es igual a {@code 3500.00}). */
    protected static void assertMonto(String esperado, Object real) {
        assertTrue(real instanceof BigDecimal, () -> "Se esperaba un DECIMAL y llegó: " + real);
        assertEquals(0, new BigDecimal(esperado).compareTo((BigDecimal) real),
                () -> "Monto distinto: se esperaba " + esperado + " y llegó " + real);
    }

    private static void asignar(PreparedStatement sentencia, Object... parametros) throws SQLException {
        for (int i = 0; i < parametros.length; i++) {
            sentencia.setObject(i + 1, parametros[i]);
        }
    }
}
