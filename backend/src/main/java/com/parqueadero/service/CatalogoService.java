package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.MarcaDAO;
import com.parqueadero.dao.MetodoPagoDAO;
import com.parqueadero.dao.ModeloDAO;
import com.parqueadero.dao.TarifaDAO;
import com.parqueadero.dao.TipoVehiculoDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.Marca;
import com.parqueadero.model.MetodoPago;
import com.parqueadero.model.Modelo;
import com.parqueadero.model.Tarifa;
import com.parqueadero.model.TipoVehiculo;
import com.parqueadero.util.Fechas;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

/**
 * Consultas de los catálogos de solo lectura: tipos de vehículo, métodos de
 * pago, tarifas vigentes, marcas y modelos. Los usa el frontend para llenar
 * las listas desplegables de los formularios.
 *
 * <p>Se agrupan en un solo servicio porque son listas sin reglas de negocio;
 * cada tabla conserva su propio DAO.
 */
public final class CatalogoService {

    private final ConexionBD conexionBD;
    private final TipoVehiculoDAO tipoVehiculoDAO;
    private final MetodoPagoDAO metodoPagoDAO;
    private final TarifaDAO tarifaDAO;
    private final MarcaDAO marcaDAO;
    private final ModeloDAO modeloDAO;

    public CatalogoService(ConexionBD conexionBD, TipoVehiculoDAO tipoVehiculoDAO,
            MetodoPagoDAO metodoPagoDAO, TarifaDAO tarifaDAO, MarcaDAO marcaDAO,
            ModeloDAO modeloDAO) {
        this.conexionBD = conexionBD;
        this.tipoVehiculoDAO = tipoVehiculoDAO;
        this.metodoPagoDAO = metodoPagoDAO;
        this.tarifaDAO = tarifaDAO;
        this.marcaDAO = marcaDAO;
        this.modeloDAO = modeloDAO;
    }

    /** Todos los tipos de vehículo. */
    public List<TipoVehiculo> listarTiposVehiculo() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return tipoVehiculoDAO.listar(conexion);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /** Todos los métodos de pago, con si requieren referencia. */
    public List<MetodoPago> listarMetodosPago() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return metodoPagoDAO.listar(conexion);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /** La tarifa vigente hoy (hora de Bogotá) de cada tipo de vehículo. */
    public List<Tarifa> listarTarifasVigentes() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return tarifaDAO.listarVigentes(conexion, Fechas.hoy());
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /** Todas las marcas, por nombre. */
    public List<Marca> listarMarcas() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return marcaDAO.listar(conexion);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Los modelos, por nombre.
     *
     * @param idMarca si no es {@code null}, solo los de esa marca (lista vacía
     *        si la marca no existe)
     */
    public List<Modelo> listarModelos(Long idMarca) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return modeloDAO.listar(conexion, idMarca);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    // ------------------------------------------------------------ crear (DBA)

    /** Largo de {@code marca.nombre} (V001). */
    static final int MAX_NOMBRE_MARCA = 50;

    /** Largo de {@code modelo.nombre} (V001). */
    static final int MAX_NOMBRE_MODELO = 60;

    /**
     * Agrega una marca. El nombre no se repite (sin importar mayúsculas: la
     * collation de la base no las distingue).
     *
     * @return la marca creada
     * @throws DatosInvalidosException si el nombre está vacío o es muy largo
     * @throws com.parqueadero.exception.ReglaNegocioException si ya existe (409)
     */
    public Marca crearMarca(String nombre) {
        String limpio = validarNombre(nombre, "de la marca", MAX_NOMBRE_MARCA);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return new Marca(marcaDAO.insertar(conexion, limpio), limpio);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Agrega un modelo a una marca. Una marca no repite el nombre de un modelo;
     * marcas distintas sí pueden.
     *
     * @return el modelo creado
     * @throws DatosInvalidosException si falta la marca o el nombre no sirve, o
     *         si la marca no existe (400)
     * @throws com.parqueadero.exception.ReglaNegocioException si la marca ya tiene ese modelo (409)
     */
    public Modelo crearModelo(Long idMarca, String nombre) {
        if (idMarca == null) {
            throw new DatosInvalidosException("Elige la marca del modelo.");
        }
        String limpio = validarNombre(nombre, "del modelo", MAX_NOMBRE_MODELO);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return new Modelo(modeloDAO.insertar(conexion, idMarca, limpio), idMarca, limpio);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /** Quita los espacios de los extremos y revisa que no quede vacío ni pase del largo. */
    static String validarNombre(String nombre, String deQue, int maximo) {
        String limpio = nombre == null ? "" : nombre.strip();
        if (limpio.isEmpty()) {
            throw new DatosInvalidosException("El nombre " + deQue + " es obligatorio.");
        }
        if (limpio.length() > maximo) {
            throw new DatosInvalidosException("El nombre " + deQue + " no puede tener más de "
                    + maximo + " caracteres.");
        }
        return limpio;
    }
}
