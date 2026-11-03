package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.ReporteDAO;
import com.parqueadero.model.IngresoDiaMetodo;
import com.parqueadero.model.IngresoPorDia;
import com.parqueadero.model.IngresoPorMetodo;
import com.parqueadero.model.OcupacionTipo;
import com.parqueadero.model.ReporteIngresos;
import com.parqueadero.util.TraductorErroresSQL;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Reportes de ingresos y de ocupación. */
public final class ReporteService {

    private final ConexionBD conexionBD;
    private final ReporteDAO reporteDAO;

    public ReporteService(ConexionBD conexionBD, ReporteDAO reporteDAO) {
        this.conexionBD = conexionBD;
        this.reporteDAO = reporteDAO;
    }

    /**
     * Reporte de ingresos de un rango de fechas de pago (ambas incluidas).
     * {@code null} en una fecha = sin ese límite.
     *
     * @throws com.parqueadero.exception.DatosInvalidosException si {@code desde}
     *         es posterior a {@code hasta}
     */
    public ReporteIngresos ingresos(LocalDate desde, LocalDate hasta) {
        RegistroService.validarRango(desde, hasta);   // misma regla que el historial
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return resumir(desde, hasta, reporteDAO.listarIngresos(conexion, desde, hasta));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /** Ocupación actual, una fila por tipo de vehículo. */
    public List<OcupacionTipo> ocupacion() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return reporteDAO.listarOcupacion(conexion);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Arma el reporte a partir de las filas de la vista (ya agrupadas por día y
     * método en SQL): suma los totales por método, por día y el total general.
     * Como todo sale de las mismas filas, el resumen siempre cuadra con el
     * detalle. Es package-private para probarlo con JUnit sin base de datos.
     */
    static ReporteIngresos resumir(LocalDate desde, LocalDate hasta,
            List<IngresoDiaMetodo> detalle) {
        // TreeMap mantiene las claves ordenadas: métodos por nombre, días por fecha.
        Map<String, IngresoPorMetodo> porMetodo = new TreeMap<>();
        Map<LocalDate, IngresoPorDia> porDia = new TreeMap<>();
        long cantidadPagos = 0;
        BigDecimal totalGeneral = BigDecimal.ZERO;

        for (IngresoDiaMetodo fila : detalle) {
            cantidadPagos += fila.cantidadPagos();
            totalGeneral = totalGeneral.add(fila.totalRecaudado());

            // merge: si la clave todavía no está, guarda el valor nuevo; si ya
            // está, guarda la suma del anterior con el nuevo.
            porMetodo.merge(fila.metodoPago(),
                    new IngresoPorMetodo(fila.metodoPago(), fila.cantidadPagos(), fila.totalRecaudado()),
                    (anterior, nuevo) -> new IngresoPorMetodo(anterior.metodoPago(),
                            anterior.cantidadPagos() + nuevo.cantidadPagos(),
                            anterior.totalRecaudado().add(nuevo.totalRecaudado())));
            porDia.merge(fila.fecha(),
                    new IngresoPorDia(fila.fecha(), fila.cantidadPagos(), fila.totalRecaudado()),
                    (anterior, nuevo) -> new IngresoPorDia(anterior.fecha(),
                            anterior.cantidadPagos() + nuevo.cantidadPagos(),
                            anterior.totalRecaudado().add(nuevo.totalRecaudado())));
        }

        return new ReporteIngresos(desde, hasta, cantidadPagos, totalGeneral,
                new ArrayList<>(porMetodo.values()), new ArrayList<>(porDia.values()), detalle);
    }
}
