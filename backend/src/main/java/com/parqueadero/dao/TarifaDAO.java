package com.parqueadero.dao;

import com.parqueadero.model.Tarifa;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
     * Tarifa que aplica a un registro de parqueo: la del tipo de su vehículo,
     * vigente en la fecha de entrada. Es la consulta de referencia de la
     * especificación: se ordenan de la más reciente a la más antigua y se toma
     * la primera ({@code LIMIT 1}).
     */
    private static final String SQL_BUSCAR_APLICABLE =
            "SELECT t.id_tarifa, t.id_tipo, t.valor_hora, t.vigente_desde"
                    + " FROM registro_parqueo r"
                    + " JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo"
                    + " JOIN tarifa t   ON t.id_tipo = v.id_tipo"
                    + " WHERE r.id_registro = ? AND t.vigente_desde <= DATE(r.entrada)"
                    + " ORDER BY t.vigente_desde DESC"
                    + " LIMIT 1";

    /**
     * Devuelve la tarifa que se le cobra a un registro de parqueo (la vigente
     * en su fecha de entrada).
     *
     * @return la tarifa, o {@code Optional.empty()} si el registro no existe o
     *         si su tipo de vehículo no tenía tarifa en esa fecha
     */
    public Optional<Tarifa> buscarAplicable(Connection conexion, long idRegistro)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_APLICABLE)) {
            consulta.setLong(1, idRegistro);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

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
