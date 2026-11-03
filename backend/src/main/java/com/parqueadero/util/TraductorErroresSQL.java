package com.parqueadero.util;

import static java.util.Map.entry;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.ReglaNegocioException;

import java.sql.SQLException;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Convierte una {@link SQLException} de MySQL en la excepción de la aplicación
 * que corresponde, con un mensaje en español que se le puede mostrar al usuario.
 *
 * <p>Uso en la capa de servicio:
 *
 * <pre>{@code
 * try (Connection conexion = conexionBD.obtenerConexion()) {
 *     return vehiculoDAO.insertar(conexion, vehiculo);
 * } catch (SQLException e) {
 *     throw TraductorErroresSQL.traducir(e);
 * }
 * }</pre>
 *
 * <table>
 *   <caption>Reglas de traducción</caption>
 *   <tr><th>Error de MySQL</th><th>Excepción</th></tr>
 *   <tr><td>SQLState 45000 (SIGNAL de un trigger)</td><td>ReglaNegocioException (409)</td></tr>
 *   <tr><td>1062: valor duplicado en un UNIQUE</td><td>ReglaNegocioException (409)</td></tr>
 *   <tr><td>1451: borrar algo que otros registros usan</td><td>ReglaNegocioException (409)</td></tr>
 *   <tr><td>1452: la llave foránea apunta a algo que no existe</td><td>DatosInvalidosException (400)</td></tr>
 *   <tr><td>3819: no se cumple un CHECK</td><td>DatosInvalidosException (400)</td></tr>
 *   <tr><td>1048: columna obligatoria en NULL</td><td>DatosInvalidosException (400)</td></tr>
 *   <tr><td>1264: número fuera del rango de la columna (por ejemplo, un id negativo)</td><td>DatosInvalidosException (400)</td></tr>
 *   <tr><td>1406: texto más largo que la columna</td><td>DatosInvalidosException (400)</td></tr>
 *   <tr><td>Cualquier otro</td><td>RuntimeException (error interno, 500)</td></tr>
 * </table>
 */
public final class TraductorErroresSQL {

    /** SQLState que usan nuestros triggers en SIGNAL para rechazar una operación. */
    private static final String SQLSTATE_SIGNAL = "45000";

    // Códigos de error de MySQL
    private static final int ER_DUPLICADO = 1062;
    private static final int ER_FILA_EN_USO = 1451;
    private static final int ER_LLAVE_FORANEA_NO_EXISTE = 1452;
    private static final int ER_CHECK = 3819;
    private static final int ER_COLUMNA_NULA = 1048;
    private static final int ER_FUERA_DE_RANGO = 1264;
    private static final int ER_DEMASIADO_LARGO = 1406;

    // Patrones para sacar el nombre de la restricción del mensaje de MySQL.
    // Ejemplo: Duplicate entry 'KLM234' for key 'vehiculo.uq_vehiculo_identificador'
    private static final Pattern PATRON_DUPLICADO =
            Pattern.compile("Duplicate entry '(.*)' for key '(?:[^']*\\.)?([^'.]+)'");
    // Ejemplo: ... a foreign key constraint fails (... CONSTRAINT `fk_vehiculo_cliente` ...)
    private static final Pattern PATRON_LLAVE_FORANEA = Pattern.compile("CONSTRAINT `([^`]+)`");
    // Ejemplo: Check constraint 'chk_vehiculo_anio_rango' is violated.
    private static final Pattern PATRON_CHECK =
            Pattern.compile("Check constraint '([^']+)' is violated");
    // Ejemplo: Column 'id_tipo' cannot be null
    private static final Pattern PATRON_COLUMNA_NULA =
            Pattern.compile("Column '([^']+)' cannot be null");
    // Ejemplo: Out of range value for column 'id_tipo' at row 1
    // (con STRICT_TRANS_TABLES, MySQL rechaza -1 o 99999999999 en un INT UNSIGNED)
    private static final Pattern PATRON_FUERA_DE_RANGO =
            Pattern.compile("Out of range value for column '([^']+)'");
    // Ejemplo: Data too long for column 'color' at row 1
    private static final Pattern PATRON_DEMASIADO_LARGO =
            Pattern.compile("Data too long for column '([^']+)'");

    // -------------------------------------------------------------------------
    // Mensajes por restricción (nombres de V001__crear_tablas.sql).
    // Si una migración nueva agrega una restricción, agregar aquí su mensaje;
    // mientras no esté, se usa el mensaje genérico de su tipo.
    // -------------------------------------------------------------------------

    /** UNIQUE (1062). {@code %s} se reemplaza por el valor repetido. */
    private static final Map<String, String> MENSAJES_DUPLICADO = Map.ofEntries(
            entry("uq_tipo_vehiculo_nombre", "Ya existe un tipo de vehículo llamado '%s'."),
            entry("uq_tarifa_tipo_vigencia",
                    "Ya existe una tarifa para ese tipo de vehículo que empieza el mismo día."),
            entry("uq_marca_nombre", "Ya existe una marca llamada '%s'."),
            entry("uq_modelo_marca_nombre", "Esa marca ya tiene un modelo con ese nombre."),
            entry("uq_cliente_documento", "Ya existe un cliente con el documento '%s'."),
            entry("uq_vehiculo_identificador", "Ya existe un vehículo con la placa o código '%s'."),
            entry("uq_espacio_ubicacion", "Ya existe un espacio en ese piso, zona y número."),
            entry("uq_registro_vehiculo_activo", "El vehículo ya tiene un parqueo activo."),
            entry("uq_registro_espacio_activo", "El espacio ya está ocupado por otro vehículo."),
            entry("uq_metodo_pago_nombre", "Ya existe un método de pago llamado '%s'."),
            entry("uq_pago_referencia", "Ya existe un pago con la referencia '%s'."));

    /** Llave foránea al insertar o modificar (1452): lo referenciado no existe. */
    private static final Map<String, String> MENSAJES_LLAVE_FORANEA_NO_EXISTE = Map.ofEntries(
            entry("fk_tarifa_tipo_vehiculo", "El tipo de vehículo indicado no existe."),
            entry("fk_modelo_marca", "La marca indicada no existe."),
            entry("fk_vehiculo_tipo_vehiculo", "El tipo de vehículo indicado no existe."),
            entry("fk_vehiculo_modelo", "El modelo indicado no existe."),
            entry("fk_vehiculo_cliente", "El cliente indicado no existe."),
            entry("fk_espacio_tipo_vehiculo", "El tipo de vehículo indicado no existe."),
            entry("fk_registro_vehiculo", "El vehículo indicado no existe."),
            entry("fk_registro_espacio", "El espacio indicado no existe."),
            entry("fk_pago_registro", "El registro de parqueo indicado no existe."),
            entry("fk_pago_metodo", "El método de pago indicado no existe."));

    /** Llave foránea al borrar (1451): otros registros dependen de la fila. */
    private static final Map<String, String> MENSAJES_FILA_EN_USO = Map.ofEntries(
            entry("fk_tarifa_tipo_vehiculo",
                    "No se puede borrar el tipo de vehículo porque tiene tarifas registradas."),
            entry("fk_modelo_marca", "No se puede borrar la marca porque tiene modelos registrados."),
            entry("fk_vehiculo_tipo_vehiculo",
                    "No se puede borrar el tipo de vehículo porque hay vehículos de ese tipo."),
            entry("fk_vehiculo_modelo",
                    "No se puede borrar el modelo porque hay vehículos de ese modelo."),
            entry("fk_vehiculo_cliente",
                    "No se puede borrar el cliente porque tiene vehículos registrados."),
            entry("fk_espacio_tipo_vehiculo",
                    "No se puede borrar el tipo de vehículo porque hay espacios para ese tipo."),
            entry("fk_registro_vehiculo",
                    "No se puede borrar el vehículo porque tiene parqueos registrados."),
            entry("fk_registro_espacio",
                    "No se puede borrar el espacio porque tiene parqueos registrados."),
            entry("fk_pago_registro",
                    "No se puede borrar el registro de parqueo porque tiene pagos."),
            entry("fk_pago_metodo",
                    "No se puede borrar el método de pago porque tiene pagos registrados."));

    /** CHECK (3819). */
    private static final Map<String, String> MENSAJES_CHECK = Map.ofEntries(
            entry("chk_tarifa_valor_hora_positivo", "El valor por hora debe ser mayor que 0."),
            entry("chk_vehiculo_identificador_formato",
                    "La placa o código solo puede tener letras de la A a la Z y números."),
            entry("chk_vehiculo_anio_rango", "El año del vehículo debe estar entre 1900 y 2100."),
            entry("chk_registro_estado_valido", "El estado del parqueo debe ser ACTIVO o PAGO."),
            entry("chk_registro_estado_coherente",
                    "Un parqueo ACTIVO no puede tener salida ni cobro, y uno PAGO debe tenerlos."),
            entry("chk_registro_salida_posterior", "La salida debe ser posterior a la entrada."),
            entry("chk_registro_minutos_coherentes",
                    "Los minutos totales no coinciden con el tiempo entre la entrada y la salida."),
            entry("chk_registro_valor_total_no_negativo", "El valor total no puede ser negativo."),
            entry("chk_pago_monto_positivo", "El monto del pago debe ser mayor que 0."));

    private TraductorErroresSQL() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /**
     * Devuelve la excepción que corresponde a {@code e}. No la lanza: quien la
     * llama escribe {@code throw TraductorErroresSQL.traducir(e);}, y así el
     * compilador sabe que el método termina ahí.
     *
     * <p>La excepción devuelta siempre guarda {@code e} como causa, para poder
     * ver el error original en los logs.
     *
     * @return una {@code ReglaNegocioException} o una {@code DatosInvalidosException}
     *         si el error se debe a los datos; si no, una {@link RuntimeException}
     *         que representa un error interno
     */
    public static RuntimeException traducir(SQLException e) {
        String mensaje = e.getMessage() != null ? e.getMessage() : "";

        // El texto de un SIGNAL ya está escrito para el usuario (ver V005__triggers.sql).
        if (SQLSTATE_SIGNAL.equals(e.getSQLState())) {
            return new ReglaNegocioException(mensaje, e);
        }

        return switch (e.getErrorCode()) {
            case ER_DUPLICADO -> new ReglaNegocioException(mensajeDuplicado(mensaje), e);
            case ER_FILA_EN_USO -> new ReglaNegocioException(
                    buscarMensaje(PATRON_LLAVE_FORANEA, mensaje, MENSAJES_FILA_EN_USO,
                            "No se puede borrar porque otros registros dependen de él."), e);
            case ER_LLAVE_FORANEA_NO_EXISTE -> new DatosInvalidosException(
                    buscarMensaje(PATRON_LLAVE_FORANEA, mensaje, MENSAJES_LLAVE_FORANEA_NO_EXISTE,
                            "Uno de los datos relacionados no existe."), e);
            case ER_CHECK -> new DatosInvalidosException(
                    buscarMensaje(PATRON_CHECK, mensaje, MENSAJES_CHECK,
                            "Los datos no cumplen las reglas de la base de datos."), e);
            case ER_COLUMNA_NULA -> new DatosInvalidosException(
                    mensajeConColumna(PATRON_COLUMNA_NULA, mensaje,
                            "Falta un dato obligatorio: %s.", "Falta un dato obligatorio."), e);
            case ER_FUERA_DE_RANGO -> new DatosInvalidosException(
                    mensajeConColumna(PATRON_FUERA_DE_RANGO, mensaje,
                            "El valor de '%s' está fuera del rango permitido.",
                            "Un valor numérico está fuera del rango permitido."), e);
            case ER_DEMASIADO_LARGO -> new DatosInvalidosException(
                    mensajeConColumna(PATRON_DEMASIADO_LARGO, mensaje,
                            "El valor de '%s' es demasiado largo.",
                            "Uno de los textos es demasiado largo."), e);
            // Error interno: este mensaje es para los logs, no para el usuario.
            default -> new RuntimeException("Error inesperado de base de datos (SQLState "
                    + e.getSQLState() + ", código " + e.getErrorCode() + "): " + mensaje, e);
        };
    }

    private static String mensajeDuplicado(String mensajeMySQL) {
        Matcher coincidencia = PATRON_DUPLICADO.matcher(mensajeMySQL);
        if (!coincidencia.find()) {
            return "Ya existe un registro con esos datos.";
        }
        String valorRepetido = coincidencia.group(1);
        String plantilla = MENSAJES_DUPLICADO.getOrDefault(
                coincidencia.group(2), "Ya existe un registro con el valor '%s'.");
        return String.format(plantilla, valorRepetido);
    }

    /**
     * Busca el nombre de la restricción con {@code patron} y devuelve su mensaje;
     * si no lo encuentra o no está en el mapa, devuelve {@code mensajePorDefecto}.
     */
    private static String buscarMensaje(Pattern patron, String mensajeMySQL,
            Map<String, String> mensajes, String mensajePorDefecto) {
        Matcher coincidencia = patron.matcher(mensajeMySQL);
        return coincidencia.find()
                ? mensajes.getOrDefault(coincidencia.group(1), mensajePorDefecto)
                : mensajePorDefecto;
    }

    /**
     * Para los errores que nombran una columna (1048, 1264, 1406): saca el
     * nombre con {@code patron} y lo pone en {@code plantilla} ({@code %s});
     * si no lo encuentra, devuelve {@code mensajePorDefecto}.
     */
    private static String mensajeConColumna(Pattern patron, String mensajeMySQL,
            String plantilla, String mensajePorDefecto) {
        Matcher coincidencia = patron.matcher(mensajeMySQL);
        return coincidencia.find()
                ? String.format(plantilla, coincidencia.group(1))
                : mensajePorDefecto;
    }
}
