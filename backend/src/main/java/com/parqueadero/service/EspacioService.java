package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.EspacioDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.model.EspacioEstado;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

/**
 * Lógica de los espacios de parqueo: consultas con su estado y cambio de
 * {@code habilitado} (poner o quitar un espacio de servicio).
 *
 * <p>Deshabilitar un espacio ocupado está permitido: el vehículo termina su
 * parqueo normalmente, pero nadie más puede entrar a ese espacio (lo impide el
 * trigger de V005 al registrar una entrada).
 */
public final class EspacioService {

    private final ConexionBD conexionBD;
    private final EspacioDAO espacioDAO;

    public EspacioService(ConexionBD conexionBD, EspacioDAO espacioDAO) {
        this.conexionBD = conexionBD;
        this.espacioDAO = espacioDAO;
    }

    /**
     * Lista los espacios con su estado.
     *
     * @param idTipo     si no es {@code null}, solo los de ese tipo de vehículo
     * @param disponible {@code true}: solo los disponibles (vista
     *        {@code vw_espacios_disponibles}); {@code false}: solo los no
     *        disponibles (ocupados o deshabilitados); {@code null}: todos
     */
    public List<EspacioEstado> listar(Long idTipo, Boolean disponible) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            if (Boolean.TRUE.equals(disponible)) {
                return espacioDAO.listarDisponibles(conexion, idTipo);
            }
            List<EspacioEstado> espacios = espacioDAO.listar(conexion, idTipo);
            if (Boolean.FALSE.equals(disponible)) {
                return espacios.stream().filter(espacio -> !espacio.disponible()).toList();
            }
            return espacios;
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Busca un espacio por su id, con su estado.
     *
     * @throws NoEncontradoException si no existe
     */
    public EspacioEstado buscarPorId(long idEspacio) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return espacioDAO.buscarPorId(conexion, idEspacio)
                    .orElseThrow(() -> noExisteId(idEspacio));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Pone el espacio en servicio ({@code true}) o lo saca de servicio
     * ({@code false}).
     *
     * @return el espacio con su estado después del cambio
     * @throws DatosInvalidosException si {@code habilitado} es {@code null}
     * @throws NoEncontradoException   si el espacio no existe
     */
    public EspacioEstado cambiarHabilitado(long idEspacio, Boolean habilitado) {
        // Se valida antes de abrir la conexión.
        if (habilitado == null) {
            throw new DatosInvalidosException(
                    "El campo habilitado es obligatorio (true o false).");
        }
        try (Connection conexion = conexionBD.obtenerConexion()) {
            if (!espacioDAO.actualizarHabilitado(conexion, idEspacio, habilitado)) {
                throw noExisteId(idEspacio);
            }
            return espacioDAO.buscarPorId(conexion, idEspacio)
                    .orElseThrow(() -> noExisteId(idEspacio));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    private static NoEncontradoException noExisteId(long idEspacio) {
        return new NoEncontradoException("No existe un espacio con id " + idEspacio + ".");
    }
}
