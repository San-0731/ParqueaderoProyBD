package com.parqueadero.config;

import com.parqueadero.util.UsuarioActual;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;

/**
 * Abre conexiones JDBC a MySQL con los datos de {@link Configuracion}.
 *
 * <p>Cada llamada a {@link #obtenerConexion()} abre una conexión nueva, y quien
 * la pide debe cerrarla. Por eso siempre se usa con try-with-resources:
 *
 * <pre>{@code
 * try (Connection conexion = conexionBD.obtenerConexion();
 *      PreparedStatement consulta = conexion.prepareStatement(sql)) {
 *     ...
 * }
 * }</pre>
 *
 * <p>Al abrir cada conexión se fijan dos variables de sesión (solo existen en
 * esa conexión):
 * <ul>
 *   <li>{@code time_zone = '-05:00'}: la hora de Colombia, para que
 *       {@code NOW()}, {@code CURRENT_TIMESTAMP} y las vistas (por ejemplo los
 *       minutos que lleva un carro adentro) den la misma hora que Java
 *       ({@link com.parqueadero.util.Fechas}). En local MySQL ya está en
 *       -05:00 (docker-compose.yml), pero un servidor en la nube (Aiven)
 *       trabaja en UTC y sin esto todo saldría corrido 5 horas.</li>
 *   <li>{@code @id_usuario_app}: el id del usuario de la petición
 *       ({@link UsuarioActual}), o NULL si no hay. Los triggers de auditoría
 *       (V008) la leen para saber quién hizo el cambio. Se fija siempre,
 *       también en NULL: si algún día se usa un pool de conexiones, una
 *       conexión reutilizada no conserva el usuario de otra petición.</li>
 * </ul>
 *
 * <p>Con {@code DB_SSL=true} (producción) la conexión va cifrada; con
 * {@code false} (local) no. Ver {@link #construirUrl}.
 *
 * <p>No hace falta {@code Class.forName(...)}: desde JDBC 4, {@link DriverManager}
 * encuentra el driver de MySQL solo, gracias al archivo
 * {@code META-INF/services/java.sql.Driver} que trae Connector/J.
 */
public final class ConexionBD {

    /**
     * Zona horaria de cada sesión de MySQL: Colombia, UTC−5. Se usa la
     * diferencia fija y no el nombre {@code 'America/Bogota'} porque un nombre
     * exige que el servidor tenga cargadas sus tablas de zonas horarias (en la
     * nube no está garantizado). Colombia no tiene horario de verano, así que
     * -05:00 es correcto todo el año.
     */
    static final String ZONA_HORARIA_SESION = "-05:00";

    /**
     * Una sola sentencia (un solo viaje a la base) para las dos variables de
     * sesión. La zona va escrita en el SQL porque es una constante del código,
     * nunca un dato del usuario.
     */
    private static final String SQL_PREPARAR_SESION =
            "SET time_zone = '" + ZONA_HORARIA_SESION + "', @id_usuario_app = ?";

    private final String url;
    private final String usuario;
    private final String contrasena;

    public ConexionBD(Configuracion configuracion) {
        this.url = construirUrl(configuracion.getDbHost(), configuracion.getDbPuerto(),
                configuracion.getDbNombre(), configuracion.isDbSsl());
        this.usuario = configuracion.getDbUsuario();
        this.contrasena = configuracion.getDbContrasena();
    }

    /**
     * Arma la URL JDBC. Es package-private para poder probarla sin base de datos.
     *
     * @param ssl {@code true} en producción (conexión cifrada), {@code false} en local
     */
    static String construirUrl(String host, int puerto, String base, boolean ssl) {
        String url = "jdbc:mysql://" + host + ":" + puerto + "/" + base
                // Zona con la que el driver convierte fechas y horas entre Java y MySQL.
                // Debe coincidir con ZONA_HORARIA_SESION y con Fechas.ZONA (los tres
                // son la hora de Colombia).
                + "?serverTimezone=America/Bogota"
                // Tildes y ñ viajan correctamente entre Java y MySQL
                + "&characterEncoding=UTF-8";
        if (ssl) {
            // PRODUCCIÓN: la conexión va cifrada; si el servidor no ofrece SSL, falla.
            // La contraseña viaja dentro del canal cifrado, así que no hace falta
            // pedir la llave pública del servidor.
            return url + "&sslMode=REQUIRED";
        }
        // LOCAL: conexión sin cifrar (MySQL de Docker en el mismo computador).
        // Sin SSL, MySQL 8.4 (caching_sha2_password) necesita que el driver pida la
        // llave pública del servidor para enviar la contraseña cifrada.
        return url + "&sslMode=DISABLED&allowPublicKeyRetrieval=true";
    }

    /**
     * Abre una conexión nueva a la base de datos y le fija la zona horaria de
     * Colombia y {@code @id_usuario_app} (el usuario de la petición, o NULL).
     *
     * @return la conexión abierta; quien la recibe debe cerrarla
     * @throws SQLException si MySQL no responde o rechaza las credenciales
     */
    public Connection obtenerConexion() throws SQLException {
        Connection conexion = DriverManager.getConnection(url, usuario, contrasena);
        try (PreparedStatement sentencia = conexion.prepareStatement(SQL_PREPARAR_SESION)) {
            Long idUsuario = UsuarioActual.id();
            if (idUsuario == null) {
                sentencia.setNull(1, Types.BIGINT);
            } else {
                sentencia.setLong(1, idUsuario);
            }
            sentencia.execute();
        } catch (SQLException e) {
            conexion.close();
            throw e;
        }
        return conexion;
    }
}
