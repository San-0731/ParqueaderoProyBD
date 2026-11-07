package com.parqueadero.dao;

import com.parqueadero.model.Marca;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Acceso a datos de la tabla {@code marca}. Desde la Fase 5 el DBA también
 * puede agregar registros (pestaña Sistema).
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

    /** Inserta una marca y devuelve su id. */
    public long insertar(Connection conexion, String nombre) throws SQLException {
        try (PreparedStatement insercion = conexion.prepareStatement(
                "INSERT INTO marca (nombre) VALUES (?)", Statement.RETURN_GENERATED_KEYS)) {
            insercion.setString(1, nombre);
            insercion.executeUpdate();
            try (ResultSet llaves = insercion.getGeneratedKeys()) {
                llaves.next();
                return llaves.getLong(1);
            }
        }
    }

    private Marca mapear(ResultSet resultado) throws SQLException {
        return new Marca(resultado.getLong("id_marca"), resultado.getString("nombre"));
    }
}
