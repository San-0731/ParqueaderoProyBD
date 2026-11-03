package com.parqueadero.dao;

import com.parqueadero.model.Tarifa;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Acceso a datos de la tabla {@code tarifa}. Recibe la {@link Connection} y no
 * la cierra.
 *
 * <p>Regla de negocio (especificación de la base de datos): la tarifa que
 * aplica a un tipo de vehículo en una fecha es la de {@code vigente_desde} más
 * reciente que no sea posterior a esa fecha. Las tarifas futuras ya pueden
 * estar registradas, pero todavía no aplican.
 */
public final class TarifaDAO {

    /**
     * Subconsulta correlacionada: para cada fila {@code t}, la subconsulta busca
     * la fecha de vigencia más reciente <b>de su mismo tipo</b>
     * ({@code t2.id_tipo = t.id_tipo}) que no sea posterior a la fecha pedida, y
     * la fila solo se queda si es justamente esa. Resultado: una tarifa por
     * tipo. Un tipo sin ninguna tarifa vigente en esa fecha no aparece.
     */
    private static final String SQL_LISTAR_VIGENTES =
            "SELECT t.id_tarifa, t.id_tipo, t.valor_hora, t.vigente_desde"
                    + " FROM tarifa t"
                    + " WHERE t.vigente_desde = ("
                    + "     SELECT MAX(t2.vigente_desde) FROM tarifa t2"
                    + "     WHERE t2.id_tipo = t.id_tipo AND t2.vigente_desde <= ?)"
                    + " ORDER BY t.id_tipo";

    /**
     * Devuelve la tarifa vigente de cada tipo de vehículo en la fecha indicada.
     *
     * @param fecha día de referencia (normalmente hoy)
     */
    public List<Tarifa> listarVigentes(Connection conexion, LocalDate fecha) throws SQLException {
        List<Tarifa> tarifas = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR_VIGENTES)) {
            consulta.setObject(1, fecha);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    tarifas.add(mapear(resultado));
                }
            }
        }
        return tarifas;
    }

    private Tarifa mapear(ResultSet resultado) throws SQLException {
        return new Tarifa(
                resultado.getLong("id_tarifa"),
                resultado.getLong("id_tipo"),
                resultado.getBigDecimal("valor_hora"),
                resultado.getObject("vigente_desde", LocalDate.class));
    }
}
