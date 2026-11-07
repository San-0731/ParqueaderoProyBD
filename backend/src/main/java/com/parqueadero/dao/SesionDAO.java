package com.parqueadero.dao;

import com.parqueadero.model.Usuario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

/**
 * Acceso a datos de las sesiones (tabla {@code sesion}, V007). Recibe la
 * {@link Connection} y no la cierra.
 *
 * <p>Todo se busca por {@code token_hash}: el token mismo nunca llega a la
 * base. Las horas se calculan con {@code NOW()} de MySQL, tanto al crear la
 * sesión como al revisarla, para no depender del reloj del backend.
 */
public final class SesionDAO {

    private static final String SQL_INSERTAR =
            "INSERT INTO sesion (token_hash, id_usuario, expira)"
                    + " VALUES (?, ?, NOW() + INTERVAL ? HOUR)";

    // Solo sesiones que no han vencido y de usuarios activos: si el DBA
    // desactiva a alguien, su sesión deja de servir en la siguiente petición.
    private static final String SQL_BUSCAR_USUARIO =
            "SELECT u.id_usuario, u.nombre_usuario, u.nombre_completo, u.activo, r.nombre AS rol"
                    + " FROM sesion s"
                    + " JOIN usuario u ON u.id_usuario = s.id_usuario"
                    + " JOIN rol r     ON r.id_rol = u.id_rol"
                    + " WHERE s.token_hash = ? AND s.expira > NOW() AND u.activo = TRUE";

    private static final String SQL_BORRAR = "DELETE FROM sesion WHERE token_hash = ?";

    private static final String SQL_BORRAR_VENCIDAS = "DELETE FROM sesion WHERE expira <= NOW()";

    /** Guarda una sesión que vence dentro de {@code horas} horas. */
    public void insertar(Connection conexion, String tokenHash, long idUsuario, int horas)
            throws SQLException {
        try (PreparedStatement insercion = conexion.prepareStatement(SQL_INSERTAR)) {
            insercion.setString(1, tokenHash);
            insercion.setLong(2, idUsuario);
            insercion.setInt(3, horas);
            insercion.executeUpdate();
        }
    }

    /**
     * El usuario de una sesión vigente.
     *
     * @return el usuario, o {@code Optional.empty()} si la sesión no existe,
     *         venció o su usuario está desactivado
     */
    public Optional<Usuario> buscarUsuario(Connection conexion, String tokenHash)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_USUARIO)) {
            consulta.setString(1, tokenHash);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(UsuarioDAO.mapear(resultado)) : Optional.empty();
            }
        }
    }

    /** Borra una sesión (cerrar sesión). No pasa nada si ya no existía. */
    public void borrar(Connection conexion, String tokenHash) throws SQLException {
        try (PreparedStatement borrado = conexion.prepareStatement(SQL_BORRAR)) {
            borrado.setString(1, tokenHash);
            borrado.executeUpdate();
        }
    }

    /** Borra todas las sesiones vencidas, para que la tabla no crezca sin límite. */
    public int borrarVencidas(Connection conexion) throws SQLException {
        try (PreparedStatement borrado = conexion.prepareStatement(SQL_BORRAR_VENCIDAS)) {
            return borrado.executeUpdate();
        }
    }
}
