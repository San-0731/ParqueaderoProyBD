package com.parqueadero.dao;

import com.parqueadero.model.Modelo;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Acceso a datos de la tabla {@code modelo} (catálogo de solo lectura).
 * Recibe la {@link Connection} y no la cierra.
 */
public final class ModeloDAO {

    private static final String COLUMNAS = "id_modelo, id_marca, nombre";

    private static final String SQL_LISTAR =
            "SELECT " + COLUMNAS + " FROM modelo ORDER BY nombre";

    // Usa el índice uq_modelo_marca_nombre, que empieza por id_marca.
    private static final String SQL_LISTAR_POR_MARCA =
            "SELECT " + COLUMNAS + " FROM modelo WHERE id_marca = ? ORDER BY nombre";

    /**
     * Devuelve los modelos ordenados por nombre.
     *
     * @param idMarca si no es {@code null}, solo los modelos de esa marca
     *        (lista vacía si la marca no existe)
     */
    public List<Modelo> listar(Connection conexion, Long idMarca) throws SQLException {
        String sql = idMarca == null ? SQL_LISTAR : SQL_LISTAR_POR_MARCA;
        List<Modelo> modelos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            if (idMarca != null) {
                consulta.setLong(1, idMarca);
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    modelos.add(mapear(resultado));
                }
            }
        }
        return modelos;
    }

    private Modelo mapear(ResultSet resultado) throws SQLException {
        return new Modelo(
                resultado.getLong("id_modelo"),
                resultado.getLong("id_marca"),
                resultado.getString("nombre"));
    }
}
