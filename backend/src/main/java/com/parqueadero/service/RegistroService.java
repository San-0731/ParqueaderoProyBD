package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.PagoDAO;
import com.parqueadero.dao.RegistroDAO;
import com.parqueadero.dao.VehiculoDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.model.ParqueoActivo;
import com.parqueadero.model.ParqueoHistorial;
import com.parqueadero.model.RegistroDetalle;
import com.parqueadero.model.Vehiculo;
import com.parqueadero.util.Fechas;
import com.parqueadero.util.Identificadores;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Lógica de los registros de parqueo: entrada de un vehículo y consultas
 * (activos, historial y detalle).
 *
 * <p>Las reglas de la entrada no se revisan en Java: el tipo del vehículo debe
 * coincidir con el del espacio y el espacio debe estar habilitado (trigger de
 * V005); el espacio no puede estar ocupado y el vehículo no puede estar ya
 * adentro (índices UNIQUE de V001). La base las garantiza aunque dos operarios
 * registren al mismo tiempo, y {@link TraductorErroresSQL} convierte su error
 * en un 409 con un mensaje claro.
 */
public final class RegistroService {

    private final ConexionBD conexionBD;
    private final VehiculoDAO vehiculoDAO;
    private final RegistroDAO registroDAO;
    private final PagoDAO pagoDAO;

    public RegistroService(ConexionBD conexionBD, VehiculoDAO vehiculoDAO,
            RegistroDAO registroDAO, PagoDAO pagoDAO) {
        this.conexionBD = conexionBD;
        this.vehiculoDAO = vehiculoDAO;
        this.registroDAO = registroDAO;
        this.pagoDAO = pagoDAO;
    }

    /**
     * Registra la entrada de un vehículo en un espacio. La hora de entrada es
     * la actual en Bogotá, calculada en Java.
     *
     * @param identificador placa o código (se normaliza: {@code "abc-123"} → {@code "ABC123"})
     * @param idEspacio     espacio donde se parquea
     * @return el registro creado (estado ACTIVO, sin pagos)
     * @throws DatosInvalidosException si falta un dato o el espacio no existe
     * @throws NoEncontradoException   si el vehículo no está registrado
     * @throws com.parqueadero.exception.ReglaNegocioException si la base rechaza
     *         la entrada (tipo distinto, espacio deshabilitado u ocupado,
     *         vehículo ya adentro)
     */
    public RegistroDetalle registrarEntrada(String identificador, Long idEspacio) {
        String normalizado = validarEntrada(identificador, idEspacio);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            Vehiculo vehiculo = vehiculoDAO.buscarPorIdentificador(conexion, normalizado)
                    .orElseThrow(() -> new NoEncontradoException("No existe un vehículo con la"
                            + " placa o código '" + normalizado + "'. Regístralo primero."));
            long idRegistro = registroDAO.insertarEntrada(conexion, vehiculo.idVehiculo(),
                    idEspacio, Fechas.ahora());
            return buscarDetalle(conexion, idRegistro)
                    .orElseThrow(() -> new IllegalStateException(
                            "No se encontró el registro recién insertado con id " + idRegistro));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Detalle de un registro de parqueo, con sus pagos.
     *
     * @throws NoEncontradoException si no existe
     */
    public RegistroDetalle buscarPorId(long idRegistro) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return buscarDetalle(conexion, idRegistro)
                    .orElseThrow(() -> new NoEncontradoException(
                            "No existe un registro de parqueo con id " + idRegistro + "."));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Vehículos que están adentro ahora. Siempre devuelve una lista.
     *
     * @param identificador si viene, solo el de esa placa o código (lista con
     *        un elemento, o vacía si ese vehículo no está adentro)
     */
    public List<ParqueoActivo> listarActivos(String identificador) {
        String normalizado = normalizarFiltro(identificador);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return registroDAO.listarActivos(conexion, normalizado);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Historial de parqueos terminados, con filtros opcionales ({@code null} =
     * sin ese filtro).
     *
     * @param desde         primer día de entrada (incluido)
     * @param hasta         último día de entrada (incluido)
     * @param identificador placa o código
     * @param idMetodoPago  método con el que se pagó (al menos uno de los pagos)
     * @throws DatosInvalidosException si {@code desde} es posterior a {@code hasta}
     */
    public List<ParqueoHistorial> listarHistorial(LocalDate desde, LocalDate hasta,
            String identificador, Long idMetodoPago) {
        validarRango(desde, hasta);
        String normalizado = normalizarFiltro(identificador);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return registroDAO.listarHistorial(conexion, desde, hasta, normalizado, idMetodoPago);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /** Detalle del registro con sus pagos, usando una conexión ya abierta. */
    private Optional<RegistroDetalle> buscarDetalle(Connection conexion, long idRegistro)
            throws SQLException {
        Optional<RegistroDetalle> detalle = registroDAO.buscarDetalle(conexion, idRegistro);
        if (detalle.isEmpty()) {
            return detalle;
        }
        // No se usa detalle.map(...): listarPorRegistro lanza SQLException y
        // una lambda no puede lanzar excepciones verificadas.
        return Optional.of(
                detalle.get().conPagos(pagoDAO.listarPorRegistro(conexion, idRegistro)));
    }

    /**
     * Valida los datos de la entrada sin ir a la base y devuelve el
     * identificador normalizado. Junta todos los errores en un solo mensaje.
     * Es package-private para poder probarlo con JUnit.
     *
     * @throws DatosInvalidosException si falta el identificador o el espacio
     */
    static String validarEntrada(String identificador, Long idEspacio) {
        List<String> errores = new ArrayList<>();
        String normalizado = null;
        try {
            normalizado = Identificadores.normalizar(identificador);
        } catch (DatosInvalidosException e) {
            errores.add(e.getMessage());
        }
        if (idEspacio == null) {
            errores.add("El espacio (idEspacio) es obligatorio.");
        }
        if (!errores.isEmpty()) {
            throw new DatosInvalidosException(String.join(" ", errores));
        }
        return normalizado;
    }

    /**
     * Revisa que el rango de fechas tenga sentido. Si falta una de las dos
     * fechas no hay nada que comparar. Es package-private para probarlo con JUnit.
     *
     * @throws DatosInvalidosException si {@code desde} es posterior a {@code hasta}
     */
    static void validarRango(LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new DatosInvalidosException("La fecha 'desde' (" + desde
                    + ") no puede ser posterior a la fecha 'hasta' (" + hasta + ").");
        }
    }

    /** Filtro por identificador: {@code null} si no viene o está en blanco; si no, normalizado. */
    private static String normalizarFiltro(String identificador) {
        if (identificador == null || identificador.isBlank()) {
            return null;
        }
        return Identificadores.normalizar(identificador);
    }
}
