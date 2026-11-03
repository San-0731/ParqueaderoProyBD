package com.parqueadero.handler;

import com.parqueadero.service.ReporteService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de reportes.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/reportes/ingresos</td><td>200 con el detalle por día y método y
 *       sus totales (filtros opcionales {@code ?desde=&hasta=})</td></tr>
 *   <tr><td>GET /api/reportes/ocupacion</td><td>200 con la ocupación por tipo de vehículo</td></tr>
 * </table>
 */
public final class ReporteHandler {

    private final ReporteService reporteService;

    public ReporteHandler(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    /** {@code GET /api/reportes/ingresos[?desde=2026-10-01][&hasta=2026-10-31]}. */
    public Respuesta ingresos(Peticion peticion) {
        return Respuesta.ok(reporteService.ingresos(
                peticion.parametroQueryComoFecha("desde"),
                peticion.parametroQueryComoFecha("hasta")));
    }

    /** {@code GET /api/reportes/ocupacion}. */
    public Respuesta ocupacion(Peticion peticion) {
        return Respuesta.ok(reporteService.ocupacion());
    }
}
