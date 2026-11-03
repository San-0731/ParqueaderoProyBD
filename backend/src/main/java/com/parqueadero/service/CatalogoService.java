package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.MarcaDAO;
import com.parqueadero.dao.MetodoPagoDAO;
import com.parqueadero.dao.ModeloDAO;
import com.parqueadero.dao.TarifaDAO;
import com.parqueadero.dao.TipoVehiculoDAO;
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
}
