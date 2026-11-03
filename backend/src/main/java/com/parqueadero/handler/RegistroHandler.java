package com.parqueadero.handler;

import com.parqueadero.service.RegistroService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de registros de parqueo (entrada y consultas).
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>POST /api/registros/entrada</td><td>201 con el registro creado</td></tr>
 *   <tr><td>GET /api/registros/activos</td><td>200 con los vehículos que están adentro
 *       (filtro opcional {@code ?identificador=})</td></tr>
 *   <tr><td>GET /api/registros</td><td>200 con el historial (filtros opcionales
 *       {@code ?desde=&hasta=&identificador=&idMetodoPago=})</td></tr>
 *   <tr><td>GET /api/registros/{id}</td><td>200 con el detalle y sus pagos, o 404</td></tr>
 * </table>
 */
public final class RegistroHandler {

    private final RegistroService registroService;

    public RegistroHandler(RegistroService registroService) {
        this.registroService = registroService;
    }

    /** {@code POST /api/registros/entrada} con cuerpo {@code {"identificador": "abc-123", "idEspacio": 5}}. */
    public Respuesta registrarEntrada(Peticion peticion) {
        SolicitudEntrada solicitud = peticion.cuerpoComo(SolicitudEntrada.class);
        return Respuesta.creado(
                registroService.registrarEntrada(solicitud.identificador(), solicitud.idEspacio()));
    }

    /** {@code GET /api/registros/activos[?identificador=abc-123]}. */
    public Respuesta activos(Peticion peticion) {
        return Respuesta.ok(registroService.listarActivos(peticion.parametroQuery("identificador")));
    }

    /** {@code GET /api/registros[?desde=2026-10-01][&hasta=2026-10-31][&identificador=][&idMetodoPago=]}. */
    public Respuesta historial(Peticion peticion) {
        return Respuesta.ok(registroService.listarHistorial(
                peticion.parametroQueryComoFecha("desde"),
                peticion.parametroQueryComoFecha("hasta"),
                peticion.parametroQuery("identificador"),
                peticion.parametroQueryComoLong("idMetodoPago")));
    }

    /** {@code GET /api/registros/{id}}. */
    public Respuesta buscarPorId(Peticion peticion) {
        return Respuesta.ok(registroService.buscarPorId(peticion.parametroRutaComoLong("id")));
    }

    /** Forma del cuerpo de la entrada. */
    record SolicitudEntrada(String identificador, Long idEspacio) {
    }
}
