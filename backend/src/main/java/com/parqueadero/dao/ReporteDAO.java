package com.parqueadero.dao;

import com.parqueadero.model.IngresoDiaMetodo;
import com.parqueadero.model.OcupacionTipo;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Consultas de los reportes (solo lectura). Recibe la {@link Connection} y no
 * la cierra.
 */
public final class ReporteDAO {

    private static final String SELECT_INGRESOS =
            "SELECT fecha, metodo_pago, cantidad_pagos, total_recaudado FROM vw_ingresos_por_metodo";

    private static final String ORDEN_INGRESOS = " ORDER BY fecha, metodo_pago";

    /**
     * Ocupación por tipo de vehículo, en una sola consulta.
     *
     * <ul>
     *   <li>El LEFT JOIN desde {@code tipo_vehiculo} hace que un tipo sin
     *       espacios también aparezca, con ceros. El tipo está en la zona
     *       (V006): tipo → zonas de ese tipo → espacios de esas zonas. Una zona
     *       sin espacios deja {@code e.*} en NULL y no suma nada.</li>
     *   <li>El LEFT JOIN con los registros ACTIVO no cuenta nada dos veces: el
     *       índice UNIQUE {@code uq_registro_espacio_activo} garantiza que cada
     *       espacio tiene como mucho un registro ACTIVO.</li>
     *   <li>{@code COUNT(columna)} solo cuenta los valores que no son NULL:
     *       {@code COUNT(r.id_registro)} cuenta los espacios ocupados.</li>
     *   <li>En MySQL una comparación vale 1 o 0, así que {@code SUM(condición)}
     *       cuenta las filas que la cumplen. COALESCE pone 0 cuando el tipo no
     *       tiene espacios (SUM de nada da NULL).</li>
     * </ul>
     */
    private static final String SQL_OCUPACION =
            "SELECT t.id_tipo, t.nombre AS tipo_vehiculo,"
                    + " COUNT(e.id_espacio) AS total,"
                    + " COUNT(r.id_registro) AS ocupados,"
                    + " COALESCE(SUM(e.habilitado AND r.id_registro IS NULL), 0) AS libres,"
                    + " COALESCE(SUM(NOT e.habilitado AND r.id_registro IS NULL), 0) AS deshabilitados"
                    + " FROM tipo_vehiculo t"
                    + " LEFT JOIN zona z             ON z.id_tipo = t.id_tipo"
                    + " LEFT JOIN espacio e          ON e.id_zona = z.id_zona"
                    + " LEFT JOIN registro_parqueo r ON r.id_espacio = e.id_espacio"
                    + "                             AND r.estado = 'ACTIVO'"
                    + " GROUP BY t.id_tipo, t.nombre"
                    + " ORDER BY t.id_tipo";

    /**
     * Lo recaudado por día y método (vista {@code vw_ingresos_por_metodo}),
     * ordenado por fecha y método. Cada filtro en {@code null} no se aplica.
     * El WHERE se arma con fragmentos fijos y los valores van como parámetros
     * (igual que en {@link RegistroDAO#listarHistorial}).
     *
     * @param desde primer día de pago (incluido)
     * @param hasta último día de pago (incluido)
     */
    public List<IngresoDiaMetodo> listarIngresos(Connection conexion, LocalDate desde,
            LocalDate hasta) throws SQLException {
        List<String> condiciones = new ArrayList<>();
        List<Object> parametros = new ArrayList<>();
        // fecha es una columna DATE de la vista, así que "<=" incluye el último día completo.
        if (desde != null) {
            condiciones.add("fecha >= ?");
            parametros.add(desde);
        }
        if (hasta != null) {
            condiciones.add("fecha <= ?");
            parametros.add(hasta);
        }
        String sql = SELECT_INGRESOS
                + (condiciones.isEmpty() ? "" : " WHERE " + String.join(" AND ", condiciones))
                + ORDEN_INGRESOS;

        List<IngresoDiaMetodo> ingresos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            for (int i = 0; i < parametros.size(); i++) {
                consulta.setObject(i + 1, parametros.get(i));
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    ingresos.add(new IngresoDiaMetodo(
                            resultado.getObject("fecha", LocalDate.class),
                            resultado.getString("metodo_pago"),
                            resultado.getLong("cantidad_pagos"),
                            resultado.getBigDecimal("total_recaudado")));
                }
            }
        }
        return ingresos;
    }

    /** Ocupación actual de los espacios, una fila por tipo de vehículo. */
    public List<OcupacionTipo> listarOcupacion(Connection conexion) throws SQLException {
        List<OcupacionTipo> ocupacion = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_OCUPACION);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                ocupacion.add(new OcupacionTipo(
                        resultado.getLong("id_tipo"),
                        resultado.getString("tipo_vehiculo"),
                        resultado.getLong("total"),
                        resultado.getLong("ocupados"),
                        resultado.getLong("libres"),
                        resultado.getLong("deshabilitados")));
            }
        }
        return ocupacion;
    }
}
