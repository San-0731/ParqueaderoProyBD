package com.parqueadero.dao;

import com.parqueadero.model.Rol;
import com.parqueadero.model.Usuario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
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

    private static final String SQL_BUSCAR_POR_ID = SELECT_USUARIO + " WHERE u.id_usuario = ?";

    // Primero los activos; dentro de cada grupo, por rol (DBA, administrador,
    // operador) y por nombre de usuario.
    private static final String SQL_LISTAR =
            SELECT_USUARIO + " ORDER BY u.activo DESC, r.id_rol, u.nombre_usuario";

    // FOR UPDATE bloquea las filas de los DBA activos hasta el commit: si dos
    // DBA intentan desactivarse el uno al otro al mismo tiempo, el segundo
    // espera aquí y, al continuar, ya ve que solo queda uno (y se rechaza).
    private static final String SQL_IDS_DBA_ACTIVOS_PARA_ACTUALIZAR =
            "SELECT u.id_usuario FROM usuario u JOIN rol r ON r.id_rol = u.id_rol"
                    + " WHERE r.nombre = 'DBA' AND u.activo = TRUE FOR UPDATE";

    private static final String SQL_ACTUALIZAR =
            "UPDATE usuario SET nombre_completo = ?,"
                    + " id_rol = (SELECT id_rol FROM rol WHERE nombre = ?), activo = ?"
                    + " WHERE id_usuario = ?";

    private static final String SQL_ACTUALIZAR_CLAVE =
            "UPDATE usuario SET clave_hash = ? WHERE id_usuario = ?";

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

    /** Todos los usuarios (sin los hashes): activos primero, por rol y por nombre. */
    public List<Usuario> listar(Connection conexion) throws SQLException {
        List<Usuario> usuarios = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                usuarios.add(mapear(resultado));
            }
        }
        return usuarios;
    }

    /**
     * Busca un usuario por su llave primaria.
     *
     * @return el usuario, o {@code Optional.empty()} si no existe
     */
    public Optional<Usuario> buscarPorId(Connection conexion, long idUsuario) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_ID)) {
            consulta.setLong(1, idUsuario);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    /**
     * Los id de los DBA activos, <b>bloqueando</b> sus filas hasta que termine la
     * transacción ({@code SELECT ... FOR UPDATE}). Solo tiene sentido dentro de
     * una transacción ({@code setAutoCommit(false)}).
     */
    public List<Long> idsDbaActivosParaActualizar(Connection conexion) throws SQLException {
        List<Long> ids = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_IDS_DBA_ACTIVOS_PARA_ACTUALIZAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                ids.add(resultado.getLong(1));
            }
        }
        return ids;
    }

    /**
     * Cambia el nombre completo, el rol y si está activo. El nombre de usuario
     * y la contraseña no se cambian aquí.
     *
     * @return {@code true} si el usuario existe; {@code false} si no
     */
    public boolean actualizar(Connection conexion, long idUsuario, String nombreCompleto, Rol rol,
            boolean activo) throws SQLException {
        try (PreparedStatement sentencia = conexion.prepareStatement(SQL_ACTUALIZAR)) {
            sentencia.setString(1, nombreCompleto);
            sentencia.setString(2, rol.name());
            sentencia.setBoolean(3, activo);
            sentencia.setLong(4, idUsuario);
            return sentencia.executeUpdate() > 0;
        }
    }

    /**
     * Guarda el hash de una contraseña nueva.
     *
     * @return {@code true} si el usuario existe; {@code false} si no
     */
    public boolean actualizarClave(Connection conexion, long idUsuario, String claveHash)
            throws SQLException {
        try (PreparedStatement sentencia = conexion.prepareStatement(SQL_ACTUALIZAR_CLAVE)) {
            sentencia.setString(1, claveHash);
            sentencia.setLong(2, idUsuario);
            return sentencia.executeUpdate() > 0;
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
