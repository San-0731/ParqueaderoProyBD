package com.parqueadero.dao;

import com.parqueadero.model.Zona;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de las zonas (tabla {@code zona}, V006), con el resumen de
 * sus espacios. Recibe la {@link Connection} y no la cierra.
 */
public final class ZonaDAO {

    // LEFT JOIN: una zona sin espacios también aparece (con 0 y sin último número).
    // MAX(numero) sirve como "último número" porque los números son de dos dígitos
    // ('01'...'99'), así que el orden de texto coincide con el numérico.
    private static final String SELECT_CON_RESUMEN =
            "SELECT z.id_zona, z.piso, z.letra, z.id_tipo, t.nombre AS tipo_vehiculo,"
                    + " COUNT(e.id_espacio) AS espacios, MAX(e.numero) AS ultimo_numero"
                    + " FROM zona z"
                    + " JOIN tipo_vehiculo t ON t.id_tipo = z.id_tipo"
                    + " LEFT JOIN espacio e  ON e.id_zona = z.id_zona";

    private static final String AGRUPAR =
            " GROUP BY z.id_zona, z.piso, z.letra, z.id_tipo, t.nombre";

    private static final String SQL_LISTAR =
            SELECT_CON_RESUMEN + AGRUPAR + " ORDER BY CAST(z.piso AS UNSIGNED), z.letra";

    private static final String SQL_BUSCAR_POR_ID =
            SELECT_CON_RESUMEN + " WHERE z.id_zona = ?" + AGRUPAR;

    // FOR UPDATE: mientras la transacción no termine, nadie más puede agregar
    // espacios a esta zona (esperan aquí). Así dos DBA no calculan el mismo
    // "siguiente número" al mismo tiempo.
    private static final String SQL_BLOQUEAR = "SELECT id_zona FROM zona WHERE id_zona = ? FOR UPDATE";

    private static final String SQL_INSERTAR =
            "INSERT INTO zona (piso, letra, id_tipo) VALUES (?, ?, ?)";

    /** Todas las zonas, por piso (como número) y letra. */
    public List<Zona> listar(Connection conexion) throws SQLException {
        List<Zona> zonas = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                zonas.add(mapear(resultado));
            }
        }
        return zonas;
    }

    /** Una zona con su resumen, o {@code Optional.empty()} si no existe. */
    public Optional<Zona> buscarPorId(Connection conexion, long idZona) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_ID)) {
            consulta.setLong(1, idZona);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    /**
     * Bloquea la fila de la zona hasta el final de la transacción.
     *
     * @return {@code true} si la zona existe
     */
    public boolean bloquear(Connection conexion, long idZona) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BLOQUEAR)) {
            consulta.setLong(1, idZona);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next();
            }
        }
    }

    /** Inserta una zona y devuelve su id. */
    public long insertar(Connection conexion, String piso, String letra, long idTipo)
            throws SQLException {
        try (PreparedStatement insercion = conexion.prepareStatement(SQL_INSERTAR,
                Statement.RETURN_GENERATED_KEYS)) {
            insercion.setString(1, piso);
            insercion.setString(2, letra);
            insercion.setLong(3, idTipo);
            insercion.executeUpdate();
            try (ResultSet llaves = insercion.getGeneratedKeys()) {
                llaves.next();
                return llaves.getLong(1);
            }
        }
    }

    private Zona mapear(ResultSet resultado) throws SQLException {
        return new Zona(
                resultado.getLong("id_zona"),
                resultado.getString("piso"),
                resultado.getString("letra"),
                resultado.getLong("id_tipo"),
                resultado.getString("tipo_vehiculo"),
                resultado.getLong("espacios"),
                resultado.getString("ultimo_numero"));
    }
}
