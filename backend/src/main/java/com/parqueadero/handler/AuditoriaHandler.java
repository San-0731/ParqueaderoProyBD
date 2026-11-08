package com.parqueadero.handler;

import com.parqueadero.service.AuditoriaService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoint de la auditoría.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/auditoria (administrador o DBA)</td><td>200 con los cambios, del más
 *       reciente al más antiguo (filtros opcionales {@code ?desde=&hasta=&tabla=}). El
 *       administrador solo recibe los de los operadores; el DBA, todos.</td></tr>
 * </table>
 */
public final class AuditoriaHandler {

    private final AuditoriaService auditoriaService;

    public AuditoriaHandler(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    /** {@code GET /api/auditoria[?desde=2026-11-01][&hasta=2026-11-07][&tabla=vehiculo]}. */
    public Respuesta listar(Peticion peticion) {
        return Respuesta.ok(auditoriaService.listar(peticion.usuarioAutenticado(),
                peticion.parametroQueryComoFecha("desde"),
                peticion.parametroQueryComoFecha("hasta"),
                peticion.parametroQuery("tabla")));
    }
}
