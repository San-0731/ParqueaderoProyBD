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
 * <p>Cada conexión nueva lleva la variable de sesión {@code @id_usuario_app}
 * con el id del usuario de la petición ({@link UsuarioActual}), o NULL si no
 * hay. Los triggers de auditoría (V008) la leen para saber quién hizo el
 * cambio. Se fija siempre, también en NULL: si algún día se usa un pool de
 * conexiones, una conexión reutilizada no conserva el usuario de otra petición.
 *
 * <p>No hace falta {@code Class.forName(...)}: desde JDBC 4, {@link DriverManager}
 * encuentra el driver de MySQL solo, gracias al archivo
 * {@code META-INF/services/java.sql.Driver} que trae Connector/J.
 */
public final class ConexionBD {

    private final String url;
    private final String usuario;
    private final String contrasena;

    public ConexionBD(Configuracion configuracion) {
        this.url = "jdbc:mysql://" + configuracion.getDbHost() + ":" + configuracion.getDbPuerto()
                + "/" + configuracion.getDbNombre()
                // Zona horaria con la que el driver convierte fechas y horas entre Java y MySQL
                + "?serverTimezone=America/Bogota"
                // Tildes y ñ viajan correctamente entre Java y MySQL
                + "&characterEncoding=UTF-8"
                // SOLO LOCAL: conexión sin cifrar. En producción: sslMode=REQUIRED o VERIFY_CA.
                + "&sslMode=DISABLED"
                // SOLO LOCAL: sin SSL, MySQL 8.4 (caching_sha2_password) necesita que el
                // driver pida la llave pública del servidor para enviar la contraseña
                // cifrada. En producción, con SSL, este parámetro se quita.
                + "&allowPublicKeyRetrieval=true";
        this.usuario = configuracion.getDbUsuario();
        this.contrasena = configuracion.getDbContrasena();
    }

    /**
     * Abre una conexión nueva a la base de datos y le fija
     * {@code @id_usuario_app} (el usuario de la petición, o NULL).
     *
     * @return la conexión abierta; quien la recibe debe cerrarla
     * @throws SQLException si MySQL no responde o rechaza las credenciales
     */
    public Connection obtenerConexion() throws SQLException {
        Connection conexion = DriverManager.getConnection(url, usuario, contrasena);
        try (PreparedStatement sentencia = conexion.prepareStatement("SET @id_usuario_app = ?")) {
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
