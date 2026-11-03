package com.parqueadero.dao;

import com.parqueadero.model.EspacioEstado;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de los espacios con su estado (ocupado / disponible).
 * Recibe la {@link Connection} y no la cierra.
 *
 * <p>La ocupación no se guarda en {@code espacio}: un espacio está ocupado si
 * tiene un registro de parqueo en estado 'ACTIVO'.
 */
public final class EspacioDAO {

    /**
     * Espacios con la columna calculada {@code ocupado}. EXISTS devuelve 1 si
     * la subconsulta encuentra al menos un registro ACTIVO en ese espacio (y se
     * detiene en el primero), o 0 si no.
     */
    private static final String SELECT_CON_ESTADO =
            "SELECT e.id_espacio, e.id_tipo, e.piso, e.zona, e.numero, e.habilitado,"
                    + " EXISTS (SELECT 1 FROM registro_parqueo r"
                    + "         WHERE r.id_espacio = e.id_espacio AND r.estado = 'ACTIVO') AS ocupado"
                    + " FROM espacio e";

    private static final String ORDEN = " ORDER BY piso, zona, numero";

    private static final String SQL_LISTAR = SELECT_CON_ESTADO + ORDEN;

    private static final String SQL_LISTAR_POR_TIPO =
            SELECT_CON_ESTADO + " WHERE e.id_tipo = ?" + ORDEN;

    private static final String SQL_BUSCAR_POR_ID = SELECT_CON_ESTADO + " WHERE e.id_espacio = ?";

    // La vista vw_espacios_disponibles (V004) ya filtra habilitados y libres.
    private static final String SQL_LISTAR_DISPONIBLES =
            "SELECT id_espacio, id_tipo, piso, zona, numero FROM vw_espacios_disponibles" + ORDEN;

    private static final String SQL_LISTAR_DISPONIBLES_POR_TIPO =
            "SELECT id_espacio, id_tipo, piso, zona, numero FROM vw_espacios_disponibles"
                    + " WHERE id_tipo = ?" + ORDEN;

    private static final String SQL_ACTUALIZAR_HABILITADO =
            "UPDATE espacio SET habilitado = ? WHERE id_espacio = ?";

    /**
     * Todos los espacios con su estado, ordenados por piso, zona y número.
     *
     * @param idTipo si no es {@code null}, solo los de ese tipo de vehículo
     */
    public List<EspacioEstado> listar(Connection conexion, Long idTipo) throws SQLException {
        String sql = idTipo == null ? SQL_LISTAR : SQL_LISTAR_POR_TIPO;
        List<EspacioEstado> espacios = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            if (idTipo != null) {
                consulta.setLong(1, idTipo);
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    espacios.add(mapearConEstado(resultado));
                }
            }
        }
        return espacios;
    }

    /**
     * Espacios disponibles (habilitados y libres), leídos de la vista
     * {@code vw_espacios_disponibles}.
     *
     * @param idTipo si no es {@code null}, solo los de ese tipo de vehículo
     */
    public List<EspacioEstado> listarDisponibles(Connection conexion, Long idTipo)
            throws SQLException {
        String sql = idTipo == null ? SQL_LISTAR_DISPONIBLES : SQL_LISTAR_DISPONIBLES_POR_TIPO;
        List<EspacioEstado> espacios = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            if (idTipo != null) {
                consulta.setLong(1, idTipo);
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    // Todo lo que devuelve la vista está habilitado, libre y disponible.
                    espacios.add(new EspacioEstado(
                            resultado.getLong("id_espacio"),
                            resultado.getLong("id_tipo"),
                            resultado.getString("piso"),
                            resultado.getString("zona"),
                            resultado.getString("numero"),
                            true, false, true));
                }
            }
        }
        return espacios;
    }

    /**
     * Busca un espacio por su llave primaria, con su estado.
     *
     * @return el espacio, o {@code Optional.empty()} si no existe
     */
    public Optional<EspacioEstado> buscarPorId(Connection conexion, long idEspacio)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_ID)) {
            consulta.setLong(1, idEspacio);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapearConEstado(resultado)) : Optional.empty();
            }
        }
    }

    /**
     * Cambia si el espacio está en servicio.
     *
     * @return {@code true} si el espacio existe; {@code false} si no
     */
    public boolean actualizarHabilitado(Connection conexion, long idEspacio, boolean habilitado)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_ACTUALIZAR_HABILITADO)) {
            consulta.setBoolean(1, habilitado);
            consulta.setLong(2, idEspacio);
            // Connector/J devuelve las filas encontradas por el WHERE, no solo las modificadas.
            return consulta.executeUpdate() > 0;
        }
    }

    private EspacioEstado mapearConEstado(ResultSet resultado) throws SQLException {
        boolean habilitado = resultado.getBoolean("habilitado");
        boolean ocupado = resultado.getBoolean("ocupado");
        return new EspacioEstado(
                resultado.getLong("id_espacio"),
                resultado.getLong("id_tipo"),
                resultado.getString("piso"),
                resultado.getString("zona"),
                resultado.getString("numero"),
                habilitado,
                ocupado,
                habilitado && !ocupado);
    }
}
