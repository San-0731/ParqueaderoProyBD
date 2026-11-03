package com.parqueadero.dao;

import com.parqueadero.model.Pago;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
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

    // fecha_pago se envía desde Java (la misma hora de la salida) en vez de usar
    // el DEFAULT CURRENT_TIMESTAMP, que dependería de la zona horaria de MySQL.
    private static final String SQL_INSERTAR =
            "INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia)"
                    + " VALUES (?, ?, ?, ?, ?)";

    /**
     * Inserta un pago. Se ignora {@code pago.idPago()}: el id lo genera MySQL.
     *
     * @return el id generado
     */
    public long insertar(Connection conexion, Pago pago) throws SQLException {
        try (PreparedStatement consulta =
                     conexion.prepareStatement(SQL_INSERTAR, Statement.RETURN_GENERATED_KEYS)) {
            consulta.setLong(1, pago.idRegistro());
            consulta.setLong(2, pago.idMetodo());
            consulta.setBigDecimal(3, pago.monto());
            consulta.setObject(4, pago.fechaPago());
            consulta.setString(5, pago.referencia());   // NULL en efectivo
            consulta.executeUpdate();
            try (ResultSet llaves = consulta.getGeneratedKeys()) {
                if (llaves.next()) {
                    return llaves.getLong(1);
                }
            }
        }
        throw new SQLException("MySQL no devolvió el id del pago insertado.");
    }

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
