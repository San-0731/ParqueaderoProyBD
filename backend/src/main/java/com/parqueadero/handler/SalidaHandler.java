package com.parqueadero.handler;

import com.parqueadero.service.SalidaService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de la salida de un vehículo.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/registros/{id}/liquidacion</td><td>200 con minutos, horas y
 *       valor si saliera ahora (no guarda nada)</td></tr>
 *   <tr><td>POST /api/registros/{id}/salida</td><td>200 con el registro cerrado y su pago</td></tr>
 * </table>
 */
public final class SalidaHandler {

    private final SalidaService salidaService;

    public SalidaHandler(SalidaService salidaService) {
        this.salidaService = salidaService;
    }

    /** {@code GET /api/registros/{id}/liquidacion}. */
    public Respuesta liquidar(Peticion peticion) {
        return Respuesta.ok(salidaService.liquidar(peticion.parametroRutaComoLong("id")));
    }

    /** {@code POST /api/registros/{id}/salida} con cuerpo {@code {"idMetodoPago": 2, "referencia": "NQ-123456"}}. */
    public Respuesta registrarSalida(Peticion peticion) {
        long idRegistro = peticion.parametroRutaComoLong("id");
        SolicitudSalida solicitud = peticion.cuerpoComo(SolicitudSalida.class);
        return Respuesta.ok(salidaService.registrarSalida(
                idRegistro, solicitud.idMetodoPago(), solicitud.referencia()));
    }

    /** Forma del cuerpo de la salida. */
    record SolicitudSalida(Long idMetodoPago, String referencia) {
    }
}
