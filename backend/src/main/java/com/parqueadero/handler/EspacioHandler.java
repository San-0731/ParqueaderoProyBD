package com.parqueadero.handler;

import com.parqueadero.service.EspacioService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de espacios de parqueo.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/espacios</td><td>200 con la lista (filtros opcionales
 *       {@code ?idTipo=} y {@code ?disponible=true|false})</td></tr>
 *   <tr><td>GET /api/espacios/{id}</td><td>200 con el espacio y su estado, o 404</td></tr>
 *   <tr><td>PATCH /api/espacios/{id}/habilitado</td><td>200 con el espacio actualizado</td></tr>
 * </table>
 */
public final class EspacioHandler {

    private final EspacioService espacioService;

    public EspacioHandler(EspacioService espacioService) {
        this.espacioService = espacioService;
    }

    /** {@code GET /api/espacios[?idTipo=3][&disponible=true]}. */
    public Respuesta listar(Peticion peticion) {
        return Respuesta.ok(espacioService.listar(
                peticion.parametroQueryComoLong("idTipo"),
                peticion.parametroQueryComoBoolean("disponible")));
    }

    /** {@code GET /api/espacios/{id}}. */
    public Respuesta buscarPorId(Peticion peticion) {
        return Respuesta.ok(espacioService.buscarPorId(peticion.parametroRutaComoLong("id")));
    }

    /** {@code PATCH /api/espacios/{id}/habilitado} con cuerpo {@code {"habilitado": false}}. */
    public Respuesta cambiarHabilitado(Peticion peticion) {
        long idEspacio = peticion.parametroRutaComoLong("id");
        CambioHabilitado cambio = peticion.cuerpoComo(CambioHabilitado.class);
        return Respuesta.ok(espacioService.cambiarHabilitado(idEspacio, cambio.habilitado()));
    }

    /** Forma del cuerpo del PATCH. */
    record CambioHabilitado(Boolean habilitado) {
    }
}
