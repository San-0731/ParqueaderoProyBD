package com.parqueadero.dao;

import com.parqueadero.model.Pago;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Acceso a datos de la tabla {@code pago}. Recibe la {@link Connection} y no
 * la cierra.
 */
public final class PagoDAO {

    private static final String SQL_LISTAR_POR_REGISTRO =
            "SELECT id_pago, id_registro, id_metodo, monto, fecha_pago, referencia"
                    + " FROM pago WHERE id_registro = ? ORDER BY id_pago";

    /**
     * Pagos de un registro de parqueo, en el orden en que se hicieron.
     *
     * @return la lista de pagos; vacía si el registro no tiene pagos (sigue ACTIVO)
     */
    public List<Pago> listarPorRegistro(Connection conexion, long idRegistro)
            throws SQLException {
        List<Pago> pagos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR_POR_REGISTRO)) {
            consulta.setLong(1, idRegistro);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    pagos.add(new Pago(
                            resultado.getLong("id_pago"),
                            resultado.getLong("id_registro"),
                            resultado.getLong("id_metodo"),
                            resultado.getBigDecimal("monto"),
                            resultado.getObject("fecha_pago", LocalDateTime.class),
                            resultado.getString("referencia")));   // NULL en efectivo
                }
            }
        }
        return pagos;
    }
}
