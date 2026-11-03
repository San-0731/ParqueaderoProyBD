package com.parqueadero.dao;

import com.parqueadero.model.Cliente;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Acceso a datos de la tabla {@code cliente} (propietarios de los vehículos).
 *
 * <p>Cada método recibe la {@link Connection} como primer parámetro y
 * <b>no la cierra</b>: la cierra quien la abrió (la capa de servicio).
 */
public final class ClienteDAO {

    /** Columnas en el mismo orden que los campos del record {@link Cliente}. */
    private static final String COLUMNAS = "id_cliente, documento, nombres, apellidos, telefono";

    private static final String SQL_LISTAR =
            "SELECT " + COLUMNAS + " FROM cliente ORDER BY id_cliente";

    private static final String SQL_BUSCAR_POR_ID =
            "SELECT " + COLUMNAS + " FROM cliente WHERE id_cliente = ?";

    // A diferencia del identificador del vehículo, aquí no hay trigger: el
    // documento llega ya normalizado desde ClienteService. Usa el índice único.
    private static final String SQL_BUSCAR_POR_DOCUMENTO =
            "SELECT " + COLUMNAS + " FROM cliente WHERE documento = ?";

    private static final String SQL_INSERTAR =
            "INSERT INTO cliente (documento, nombres, apellidos, telefono) VALUES (?, ?, ?, ?)";

    private static final String SQL_ACTUALIZAR =
            "UPDATE cliente SET documento = ?, nombres = ?, apellidos = ?, telefono = ?"
                    + " WHERE id_cliente = ?";

    /** Devuelve todos los clientes ordenados por id. */
    public List<Cliente> listar(Connection conexion) throws SQLException {
        List<Cliente> clientes = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_LISTAR);
             ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                clientes.add(mapear(resultado));
            }
        }
        return clientes;
    }

    /**
     * Busca un cliente por su llave primaria.
     *
     * @return el cliente, o {@code Optional.empty()} si no existe
     */
    public Optional<Cliente> buscarPorId(Connection conexion, long idCliente) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_ID)) {
            consulta.setLong(1, idCliente);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    /**
     * Busca un cliente por su documento exacto (ya normalizado).
     *
     * @return el cliente, o {@code Optional.empty()} si no existe
     */
    public Optional<Cliente> buscarPorDocumento(Connection conexion, String documento)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_POR_DOCUMENTO)) {
            consulta.setString(1, documento);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    /**
     * Inserta un cliente. Se ignora {@code cliente.idCliente()}: el id lo
     * genera MySQL (AUTO_INCREMENT).
     *
     * @return el id generado
     */
    public long insertar(Connection conexion, Cliente cliente) throws SQLException {
        try (PreparedStatement consulta =
                     conexion.prepareStatement(SQL_INSERTAR, Statement.RETURN_GENERATED_KEYS)) {
            asignarParametros(consulta, cliente);
            consulta.executeUpdate();
            try (ResultSet llaves = consulta.getGeneratedKeys()) {
                if (llaves.next()) {
                    return llaves.getLong(1);
                }
            }
        }
        throw new SQLException("MySQL no devolvió el id del cliente insertado.");
    }

    /**
     * Actualiza todos los campos del cliente con id {@code cliente.idCliente()}.
     *
     * @return {@code true} si el cliente existe; {@code false} si no
     * @throws NullPointerException si {@code cliente.idCliente()} es {@code null}
     */
    public boolean actualizar(Connection conexion, Cliente cliente) throws SQLException {
        Long idCliente = Objects.requireNonNull(cliente.idCliente(),
                "Para actualizar un cliente se necesita su idCliente.");
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_ACTUALIZAR)) {
            asignarParametros(consulta, cliente);
            consulta.setLong(5, idCliente);
            // Connector/J devuelve las filas encontradas por el WHERE, no solo las modificadas.
            return consulta.executeUpdate() > 0;
        }
    }

    /** Llena los parámetros 1 a 4, que son iguales en el INSERT y en el UPDATE. */
    private void asignarParametros(PreparedStatement consulta, Cliente cliente)
            throws SQLException {
        consulta.setString(1, cliente.documento());
        consulta.setString(2, cliente.nombres());
        consulta.setString(3, cliente.apellidos());
        consulta.setString(4, cliente.telefono());   // puede ser NULL
    }

    private Cliente mapear(ResultSet resultado) throws SQLException {
        return new Cliente(
                resultado.getLong("id_cliente"),
                resultado.getString("documento"),
                resultado.getString("nombres"),
                resultado.getString("apellidos"),
                resultado.getString("telefono"));
    }
}
