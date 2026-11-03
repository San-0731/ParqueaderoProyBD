package com.parqueadero.dao;

import com.parqueadero.model.Vehiculo;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Acceso a datos de la tabla {@code vehiculo}.
 *
 * <p>Cada método recibe la {@link Connection} como primer parámetro y
 * <b>no la cierra</b>: la cierra quien la abrió (la capa de servicio). Así
 * varias operaciones pueden ir en la misma transacción.
 */
public final class VehiculoDAO {

    /** Columnas en el mismo orden que los campos del record {@link Vehiculo}. */
    private static final String COLUMNAS =
            "id_vehiculo, identificador, id_tipo, id_modelo, id_cliente, color, anio";

    private static final String SQL_LISTAR =
            "SELECT " + COLUMNAS + " FROM vehiculo ORDER BY id_vehiculo";

    private static final String SQL_BUSCAR_POR_ID =
            "SELECT " + COLUMNAS + " FROM vehiculo WHERE id_vehiculo = ?";

    // Aplica al valor buscado la misma regla que el trigger usa al guardar
    // (mayúsculas, sin espacios ni guiones): buscar 'klm-234' encuentra 'KLM234'.
    // La función se aplica al parámetro, no a la columna, así que MySQL sigue
    // usando el índice único de identificador.
    private static final String SQL_BUSCAR_POR_IDENTIFICADOR =
            "SELECT " + COLUMNAS + " FROM vehiculo"
                    + " WHERE identificador = UPPER(REPLACE(REPLACE(?, ' ', ''), '-', ''))";

    private static final String SQL_INSERTAR =
            "INSERT INTO vehiculo (identificador, id_tipo, id_modelo, id_cliente, color, anio)"
                    + " VALUES (?, ?, ?, ?, ?, ?)";

    private static final String SQL_ACTUALIZAR =
            "UPDATE vehiculo SET identificador = ?, id_tipo = ?, id_modelo = ?, id_cliente = ?,"
                    + " color = ?, anio = ? WHERE id_vehiculo = ?";

    /**
     * Devuelve todos los vehículos ordenados por id.
     *
     * @return la lista de vehículos; vacía si no hay ninguno
     */
    public List<Vehiculo> listar(Connection conexion) throws SQLException {
        List<Vehiculo> vehiculos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                vehiculos.add(mapear(resultado));
            }
        }
        return vehiculos;
    }

    /**
     * Busca un vehículo por su llave primaria.
     *
     * @return el vehículo, o {@code Optional.empty()} si no existe
     */
    public Optional<Vehiculo> buscarPorId(Connection conexion, long idVehiculo)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_ID)) {
            consulta.setLong(1, idVehiculo);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    /**
     * Busca un vehículo por su placa o código. No importa si se escribe en
     * minúsculas o con espacios o guiones ('klm-234' encuentra 'KLM234').
     *
     * @return el vehículo, o {@code Optional.empty()} si no existe
     */
    public Optional<Vehiculo> buscarPorIdentificador(Connection conexion, String identificador)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_IDENTIFICADOR)) {
            consulta.setString(1, identificador);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    /**
     * Inserta un vehículo. Se ignora {@code vehiculo.idVehiculo()}: el id lo
     * genera MySQL (AUTO_INCREMENT). El trigger de la base normaliza el
     * identificador ('abc-123' se guarda como 'ABC123').
     *
     * @return el id generado
     */
    public long insertar(Connection conexion, Vehiculo vehiculo) throws SQLException {
        // RETURN_GENERATED_KEYS le pide al driver que devuelva el id que generó MySQL.
        try (PreparedStatement consulta =
                     conexion.prepareStatement(SQL_INSERTAR, Statement.RETURN_GENERATED_KEYS)) {
            asignarParametros(consulta, vehiculo);
            consulta.executeUpdate();
            try (ResultSet llaves = consulta.getGeneratedKeys()) {
                if (llaves.next()) {
                    return llaves.getLong(1);
                }
            }
        }
        throw new SQLException("MySQL no devolvió el id del vehículo insertado.");
    }

    /**
     * Actualiza todos los campos del vehículo con id {@code vehiculo.idVehiculo()}.
     *
     * @return {@code true} si el vehículo existe (aunque los valores no hayan
     *         cambiado); {@code false} si no hay ningún vehículo con ese id
     * @throws NullPointerException si {@code vehiculo.idVehiculo()} es {@code null}
     */
    public boolean actualizar(Connection conexion, Vehiculo vehiculo) throws SQLException {
        Long idVehiculo = Objects.requireNonNull(vehiculo.idVehiculo(),
                "Para actualizar un vehículo se necesita su idVehiculo.");
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_ACTUALIZAR)) {
            asignarParametros(consulta, vehiculo);
            consulta.setLong(7, idVehiculo);
            // Connector/J devuelve las filas encontradas por el WHERE, no solo las modificadas.
            return consulta.executeUpdate() > 0;
        }
    }

    /**
     * Llena los parámetros 1 a 6, que son iguales en el INSERT y en el UPDATE.
     *
     * <p>Para los números se usa {@code setObject} con el tipo SQL: si el valor
     * es {@code null} guarda NULL. Con {@code setLong} un {@code Long} nulo
     * daría {@code NullPointerException}. Si una columna NOT NULL llega en
     * {@code null}, MySQL responde con un error claro ("Column ... cannot be null").
     */
    private void asignarParametros(PreparedStatement consulta, Vehiculo vehiculo)
            throws SQLException {
        consulta.setString(1, vehiculo.identificador());
        consulta.setObject(2, vehiculo.idTipo(), Types.BIGINT);
        consulta.setObject(3, vehiculo.idModelo(), Types.BIGINT);   // puede ser NULL
        consulta.setObject(4, vehiculo.idCliente(), Types.BIGINT);
        consulta.setString(5, vehiculo.color());                     // puede ser NULL
        consulta.setObject(6, vehiculo.anio(), Types.SMALLINT);      // puede ser NULL
    }

    /**
     * Convierte la fila actual del {@link ResultSet} en un {@link Vehiculo}.
     *
     * <p>Las columnas que aceptan NULL se leen con {@code getObject(columna, Tipo.class)}:
     * {@code getLong} o {@code getInt} devolverían 0 en vez de {@code null}.
     */
    private Vehiculo mapear(ResultSet resultado) throws SQLException {
        return new Vehiculo(
                resultado.getLong("id_vehiculo"),
                resultado.getString("identificador"),
                resultado.getLong("id_tipo"),
                resultado.getObject("id_modelo", Long.class),
                resultado.getLong("id_cliente"),
                resultado.getString("color"),
                resultado.getObject("anio", Integer.class));
    }
}
