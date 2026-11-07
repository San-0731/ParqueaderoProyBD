package com.parqueadero.dao;

import com.parqueadero.model.TipoVehiculo;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de la tabla {@code tipo_vehiculo} (catálogo de solo lectura).
 * Recibe la {@link Connection} y no la cierra.
 */
public final class TipoVehiculoDAO {

    private static final String SQL_LISTAR =
            "SELECT id_tipo, nombre FROM tipo_vehiculo ORDER BY id_tipo";

    private static final String SQL_BUSCAR_POR_NOMBRE =
            "SELECT id_tipo, nombre FROM tipo_vehiculo WHERE nombre = ?";

    /** Devuelve todos los tipos de vehículo ordenados por id. */
    public List<TipoVehiculo> listar(Connection conexion) throws SQLException {
        List<TipoVehiculo> tipos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                tipos.add(mapear(resultado));
            }
        }
        return tipos;
    }

    /**
     * Busca un tipo por su nombre exacto ("Carro", "Moto", "Camión", "Bicicleta").
     * Lo usa VehiculoService para asignar el tipo según la placa.
     */
    public Optional<TipoVehiculo> buscarPorNombre(Connection conexion, String nombre)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_NOMBRE)) {
            consulta.setString(1, nombre);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    private TipoVehiculo mapear(ResultSet resultado) throws SQLException {
        return new TipoVehiculo(resultado.getLong("id_tipo"), resultado.getString("nombre"));
    }
}
