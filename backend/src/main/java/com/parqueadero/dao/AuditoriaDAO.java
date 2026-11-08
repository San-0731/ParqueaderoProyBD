package com.parqueadero.dao;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import com.parqueadero.model.RegistroAuditoria;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Consultas de la auditoría (solo lectura: las filas las escriben los
 * triggers de V008). Recibe la {@link Connection} y no la cierra.
 */
public final class AuditoriaDAO {

    private static final String COLUMNAS =
            "id_auditoria, fecha, tabla, operacion, id_fila, id_usuario, nombre_usuario,"
                    + " nombre_completo, rol, datos_antes, datos_despues";

    // El nombre de la vista es uno de estos dos textos fijos (nunca viene de afuera).
    private static final String VISTA_COMPLETA = "vw_auditoria";
    private static final String VISTA_OPERADORES = "vw_auditoria_operadores";

    /**
     * Los cambios auditados, del más reciente al más antiguo. Cada filtro en
     * {@code null} no se aplica.
     *
     * @param soloOperadores {@code true}: solo los cambios hechos con rol OPERADOR
     *        (vista {@code vw_auditoria_operadores}); {@code false}: todos
     * @param desde primer día (incluido)
     * @param hasta último día (incluido)
     * @param tabla solo los de esa tabla
     */
    public List<RegistroAuditoria> listar(Connection conexion, boolean soloOperadores,
            LocalDate desde, LocalDate hasta, String tabla) throws SQLException {
        List<String> condiciones = new ArrayList<>();
        List<Object> parametros = new ArrayList<>();
        if (desde != null) {
            condiciones.add("fecha >= ?");
            parametros.add(desde);
        }
        if (hasta != null) {
            // fecha es DATETIME: "antes del día siguiente" incluye todo el último día.
            condiciones.add("fecha < ?");
            parametros.add(hasta.plusDays(1));
        }
        if (tabla != null) {
            condiciones.add("tabla = ?");
            parametros.add(tabla);
        }
        String sql = "SELECT " + COLUMNAS + " FROM "
                + (soloOperadores ? VISTA_OPERADORES : VISTA_COMPLETA)
                + (condiciones.isEmpty() ? "" : " WHERE " + String.join(" AND ", condiciones))
                + " ORDER BY fecha DESC, id_auditoria DESC";

        List<RegistroAuditoria> registros = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            for (int i = 0; i < parametros.size(); i++) {
                consulta.setObject(i + 1, parametros.get(i));
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    registros.add(mapear(resultado));
                }
            }
        }
        return registros;
    }

    private RegistroAuditoria mapear(ResultSet resultado) throws SQLException {
        return new RegistroAuditoria(
                resultado.getLong("id_auditoria"),
                resultado.getObject("fecha", LocalDateTime.class),
                resultado.getString("tabla"),
                resultado.getString("operacion"),
                resultado.getLong("id_fila"),
                resultado.getLong("id_usuario"),
                resultado.getString("nombre_usuario"),
                resultado.getString("nombre_completo"),
                resultado.getString("rol"),
                json(resultado.getString("datos_antes")),
                json(resultado.getString("datos_despues")));
    }

    /** Convierte el texto JSON de la columna en un objeto JSON (null si es NULL). */
    private static JsonElement json(String texto) {
        return texto == null ? null : JsonParser.parseString(texto);
    }
}
