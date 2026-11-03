package com.parqueadero.dao;

import com.parqueadero.model.MetodoPago;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Acceso a datos de la tabla {@code metodo_pago} (catálogo de solo lectura).
 * Recibe la {@link Connection} y no la cierra.
 */
public final class MetodoPagoDAO {

    private static final String SQL_LISTAR =
            "SELECT id_metodo, nombre, requiere_referencia FROM metodo_pago ORDER BY id_metodo";

    /** Devuelve todos los métodos de pago ordenados por id. */
    public List<MetodoPago> listar(Connection conexion) throws SQLException {
        List<MetodoPago> metodos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                metodos.add(mapear(resultado));
            }
        }
        return metodos;
    }

    private MetodoPago mapear(ResultSet resultado) throws SQLException {
        return new MetodoPago(
                resultado.getLong("id_metodo"),
                resultado.getString("nombre"),
                // BOOLEAN en MySQL es TINYINT(1); getBoolean lo convierte (0 = false).
                resultado.getBoolean("requiere_referencia"));
    }
}
