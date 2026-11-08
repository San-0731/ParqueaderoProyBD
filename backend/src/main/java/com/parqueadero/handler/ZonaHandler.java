package com.parqueadero.handler;

import com.parqueadero.service.ZonaService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de las zonas y la creación de espacios.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/zonas</td><td>200 con las zonas y cuántos espacios tiene cada una</td></tr>
 *   <tr><td>POST /api/zonas (DBA)</td><td>201 con la zona creada; 409 si ese piso ya tiene esa letra</td></tr>
 *   <tr><td>POST /api/zonas/{id}/espacios (DBA)</td><td>201 con los espacios creados; 409 si se
 *       pasaría del espacio 99</td></tr>
 * </table>
 */
public final class ZonaHandler {

    private final ZonaService zonaService;

    public ZonaHandler(ZonaService zonaService) {
        this.zonaService = zonaService;
    }

    /** {@code GET /api/zonas}. */
    public Respuesta listar(Peticion peticion) {
        return Respuesta.ok(zonaService.listar());
    }

    /** {@code POST /api/zonas} con {@code {"piso":"3","letra":"D","idTipo":1}}. */
    public Respuesta crear(Peticion peticion) {
        ZonaNueva datos = peticion.cuerpoComo(ZonaNueva.class);
        return Respuesta.creado(zonaService.crear(datos.piso(), datos.letra(), datos.idTipo()));
    }

    /** {@code POST /api/zonas/{id}/espacios} con {@code {"cantidad":4}}. */
    public Respuesta agregarEspacios(Peticion peticion) {
        long idZona = peticion.parametroRutaComoLong("id");
        EspaciosNuevos datos = peticion.cuerpoComo(EspaciosNuevos.class);
        return Respuesta.creado(zonaService.agregarEspacios(idZona, datos.cantidad()));
    }

    /** Cuerpo de POST /api/zonas. El piso llega como texto ("3"). */
    record ZonaNueva(String piso, String letra, Long idTipo) {
    }

    /** Cuerpo de POST /api/zonas/{id}/espacios. */
    record EspaciosNuevos(Integer cantidad) {
    }
}
