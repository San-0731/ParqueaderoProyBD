package com.parqueadero.dao;

import com.parqueadero.model.Marca;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Acceso a datos de la tabla {@code marca} (catálogo de solo lectura).
 * Recibe la {@link Connection} y no la cierra.
 */
public final class MarcaDAO {

    // Por nombre: es como se muestran en una lista desplegable.
    private static final String SQL_LISTAR =
            "SELECT id_marca, nombre FROM marca ORDER BY nombre";

    /** Devuelve todas las marcas ordenadas por nombre. */
    public List<Marca> listar(Connection conexion) throws SQLException {
        List<Marca> marcas = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                marcas.add(mapear(resultado));
            }
        }
        return marcas;
    }

    private Marca mapear(ResultSet resultado) throws SQLException {
        return new Marca(resultado.getLong("id_marca"), resultado.getString("nombre"));
    }
}
