package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.VehiculoDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.model.Vehiculo;
import com.parqueadero.util.Identificadores;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Lógica de negocio de los vehículos.
 *
 * <p>Cada método abre su propia conexión con try-with-resources, llama al
 * {@link VehiculoDAO} y traduce cualquier {@link SQLException} con
 * {@link TraductorErroresSQL}. Las reglas que ya aplica la base de datos
 * (formato del identificador, rango del año, llaves foráneas, valores únicos)
 * no se repiten aquí: se dejan a MySQL y se traduce su error.
 */
public final class VehiculoService {

    // Longitudes máximas de las columnas de vehiculo (V001__crear_tablas.sql).
    static final int MAX_IDENTIFICADOR = 40;
    static final int MAX_COLOR = 30;

    private final ConexionBD conexionBD;
    private final VehiculoDAO vehiculoDAO;

    /** Las dependencias se reciben por el constructor (inyección de dependencias manual). */
    public VehiculoService(ConexionBD conexionBD, VehiculoDAO vehiculoDAO) {
        this.conexionBD = conexionBD;
        this.vehiculoDAO = vehiculoDAO;
    }

    /** Devuelve todos los vehículos ordenados por id. */
    public List<Vehiculo> listar() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return vehiculoDAO.listar(conexion);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Lista los vehículos, con filtro opcional por placa o código. Siempre
     * devuelve una lista, para que el frontend reciba la misma forma con o
     * sin filtro.
     *
     * @param identificador texto a buscar (se normaliza: {@code "klm-234"}
     *        encuentra {@code "KLM234"}); {@code null} o en blanco = sin filtro
     * @return todos los vehículos, o una lista con el que coincide, o una lista
     *         vacía si ninguno coincide
     */
    public List<Vehiculo> listar(String identificador) {
        if (identificador == null || identificador.isBlank()) {
            return listar();
        }
        String normalizado = Identificadores.normalizar(identificador);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return vehiculoDAO.buscarPorIdentificador(conexion, normalizado)
                    .map(List::of)
                    .orElse(List.of());
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Busca un vehículo por su id.
     *
     * @throws NoEncontradoException si no existe
     */
    public Vehiculo buscarPorId(long idVehiculo) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return vehiculoDAO.buscarPorId(conexion, idVehiculo)
                    .orElseThrow(() -> noExisteId(idVehiculo));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Busca un vehículo por su placa o código. El texto se normaliza antes de
     * buscar: {@code "abc-123"} encuentra el vehículo guardado como {@code "ABC123"}.
     *
     * @throws DatosInvalidosException si el texto está vacío
     * @throws NoEncontradoException   si no existe
     */
    public Vehiculo buscarPorIdentificador(String texto) {
        String identificador = Identificadores.normalizar(texto);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return vehiculoDAO.buscarPorIdentificador(conexion, identificador)
                    .orElseThrow(() -> new NoEncontradoException(
                            "No existe un vehículo con el identificador '" + identificador + "'."));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Registra un vehículo nuevo. Se ignora {@code datos.idVehiculo()}.
     *
     * @return el vehículo tal como quedó guardado, con su id
     * @throws DatosInvalidosException si los datos no son válidos o una llave
     *         foránea no existe
     * @throws com.parqueadero.exception.ReglaNegocioException si el
     *         identificador ya está registrado
     */
    public Vehiculo crear(Vehiculo datos) {
        Vehiculo vehiculo = validar(datos);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            long idGenerado = vehiculoDAO.insertar(conexion, vehiculo);
            return vehiculoDAO.buscarPorId(conexion, idGenerado)
                    .orElseThrow(() -> new IllegalStateException(
                            "No se encontró el vehículo recién insertado con id " + idGenerado));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Actualiza todos los datos del vehículo {@code idVehiculo}. Se usa el id
     * recibido (el de la ruta) y se ignora {@code datos.idVehiculo()}.
     *
     * @return el vehículo tal como quedó guardado
     * @throws NoEncontradoException si no existe
     */
    public Vehiculo actualizar(long idVehiculo, Vehiculo datos) {
        Vehiculo validado = validar(datos);
        Vehiculo vehiculo = new Vehiculo(idVehiculo, validado.identificador(), validado.idTipo(),
                validado.idModelo(), validado.idCliente(), validado.color(), validado.anio());
        try (Connection conexion = conexionBD.obtenerConexion()) {
            if (!vehiculoDAO.actualizar(conexion, vehiculo)) {
                throw noExisteId(idVehiculo);
            }
            return vehiculoDAO.buscarPorId(conexion, idVehiculo)
                    .orElseThrow(() -> noExisteId(idVehiculo));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Valida los datos de un vehículo sin ir a la base y devuelve una copia
     * limpia: identificador normalizado y color sin espacios en los extremos
     * ({@code null} si quedó vacío).
     *
     * <p>Revisa campos obligatorios y longitudes máximas, y junta todos los
     * errores en un solo mensaje para que el formulario los muestre juntos.
     * Es package-private para poder probarlo con JUnit.
     *
     * @throws DatosInvalidosException si hay algún error
     */
    static Vehiculo validar(Vehiculo datos) {
        if (datos == null) {
            throw new DatosInvalidosException("Los datos del vehículo son obligatorios.");
        }

        List<String> errores = new ArrayList<>();

        String identificador = null;
        try {
            // Se normaliza antes de medir: MySQL revisa la longitud antes de que el
            // trigger quite los guiones, y su error ("Data too long") llegaría como 500.
            identificador = Identificadores.normalizar(datos.identificador());
            if (identificador.length() > MAX_IDENTIFICADOR) {
                errores.add("El identificador no puede tener más de " + MAX_IDENTIFICADOR
                        + " caracteres.");
            }
        } catch (DatosInvalidosException e) {
            errores.add(e.getMessage());
        }

        if (datos.idTipo() == null) {
            errores.add("El tipo de vehículo (idTipo) es obligatorio.");
        }
        if (datos.idCliente() == null) {
            errores.add("El propietario (idCliente) es obligatorio.");
        }

        String color = datos.color() == null ? null : datos.color().strip();
        if (color != null && color.isEmpty()) {
            color = null;
        }
        if (color != null && color.length() > MAX_COLOR) {
            errores.add("El color no puede tener más de " + MAX_COLOR + " caracteres.");
        }

        if (!errores.isEmpty()) {
            throw new DatosInvalidosException(String.join(" ", errores));
        }

        return new Vehiculo(datos.idVehiculo(), identificador, datos.idTipo(), datos.idModelo(),
                datos.idCliente(), color, datos.anio());
    }

    private static NoEncontradoException noExisteId(long idVehiculo) {
        return new NoEncontradoException("No existe un vehículo con id " + idVehiculo + ".");
    }
}
