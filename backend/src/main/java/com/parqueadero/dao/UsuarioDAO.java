package com.parqueadero.dao;

import com.parqueadero.model.Rol;
import com.parqueadero.model.Usuario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Optional;

/**
 * Acceso a datos de los usuarios de la aplicación (tablas {@code usuario} y
 * {@code rol}, V007). Recibe la {@link Connection} y no la cierra.
 *
 * <p>El rol se guarda por id ({@code usuario.id_rol}), pero la aplicación lo
 * maneja por nombre (el {@link Rol}): las consultas hacen JOIN con
 * {@code rol} y el INSERT busca el id con una subconsulta.
 */
public final class UsuarioDAO {

    /** Usuario con su hash de contraseña: solo para verificar el inicio de sesión. */
    public record UsuarioConClave(Usuario usuario, String claveHash) {
    }

    private static final String SELECT_USUARIO =
            "SELECT u.id_usuario, u.nombre_usuario, u.nombre_completo, u.activo, u.clave_hash,"
                    + " r.nombre AS rol"
                    + " FROM usuario u"
                    + " JOIN rol r ON r.id_rol = u.id_rol";

    private static final String SQL_BUSCAR_POR_NOMBRE = SELECT_USUARIO + " WHERE u.nombre_usuario = ?";

    private static final String SQL_EXISTE_DBA_ACTIVO =
            "SELECT EXISTS (SELECT 1 FROM usuario u JOIN rol r ON r.id_rol = u.id_rol"
                    + " WHERE r.nombre = 'DBA' AND u.activo = TRUE)";

    // Si el nombre del rol no existiera, la subconsulta da NULL y MySQL
    // responde 1048 (id_rol no puede ser NULL).
    private static final String SQL_INSERTAR =
            "INSERT INTO usuario (nombre_usuario, nombre_completo, clave_hash, id_rol)"
                    + " VALUES (?, ?, ?, (SELECT id_rol FROM rol WHERE nombre = ?))";

    /**
     * Busca un usuario por su nombre de usuario, con su hash, esté activo o no.
     *
     * @return el usuario, o {@code Optional.empty()} si no existe
     */
    public Optional<UsuarioConClave> buscarConClave(Connection conexion, String nombreUsuario)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_NOMBRE)) {
            consulta.setString(1, nombreUsuario);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    return Optional.empty();
                }
                return Optional.of(new UsuarioConClave(mapear(resultado),
                        resultado.getString("clave_hash")));
            }
        }
    }

    /** Si hay al menos un usuario activo con rol DBA. */
    public boolean existeDbaActivo(Connection conexion) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_EXISTE_DBA_ACTIVO);
             ResultSet resultado = consulta.executeQuery()) {
            resultado.next();
            return resultado.getBoolean(1);
        }
    }

    /**
     * Inserta un usuario activo.
     *
     * @param claveHash hash de {@code Contrasenas.hash}, nunca la contraseña
     * @return el id generado
     */
    public long insertar(Connection conexion, String nombreUsuario, String nombreCompleto,
            String claveHash, Rol rol) throws SQLException {
        try (PreparedStatement insercion = conexion.prepareStatement(SQL_INSERTAR,
                Statement.RETURN_GENERATED_KEYS)) {
            insercion.setString(1, nombreUsuario);
            insercion.setString(2, nombreCompleto);
            insercion.setString(3, claveHash);
            insercion.setString(4, rol.name());
            insercion.executeUpdate();
            try (ResultSet llaves = insercion.getGeneratedKeys()) {
                llaves.next();
                return llaves.getLong(1);
            }
        }
    }

    /** Convierte la fila actual en un {@link Usuario} (sin el hash). */
    static Usuario mapear(ResultSet resultado) throws SQLException {
        return new Usuario(
                resultado.getLong("id_usuario"),
                resultado.getString("nombre_usuario"),
                resultado.getString("nombre_completo"),
                Rol.valueOf(resultado.getString("rol")),
                resultado.getBoolean("activo"));
    }
}
