package com.parqueadero.handler;

import com.parqueadero.service.CatalogoService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de los catálogos (solo lectura).
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/tipos-vehiculo</td><td>200 con los tipos de vehículo</td></tr>
 *   <tr><td>GET /api/metodos-pago</td><td>200 con los métodos de pago (y si requieren referencia)</td></tr>
 *   <tr><td>GET /api/tarifas/vigente</td><td>200 con la tarifa vigente hoy de cada tipo</td></tr>
 *   <tr><td>GET /api/marcas</td><td>200 con las marcas</td></tr>
 *   <tr><td>GET /api/modelos</td><td>200 con los modelos (filtro opcional {@code ?idMarca=})</td></tr>
 * </table>
 */
public final class CatalogoHandler {

    private final CatalogoService catalogoService;

    public CatalogoHandler(CatalogoService catalogoService) {
        this.catalogoService = catalogoService;
    }

    /** {@code GET /api/tipos-vehiculo}. */
    public Respuesta tiposVehiculo(Peticion peticion) {
        return Respuesta.ok(catalogoService.listarTiposVehiculo());
    }

    /** {@code GET /api/metodos-pago}. */
    public Respuesta metodosPago(Peticion peticion) {
        return Respuesta.ok(catalogoService.listarMetodosPago());
    }

    /** {@code GET /api/tarifas/vigente}: una tarifa por tipo de vehículo. */
    public Respuesta tarifasVigentes(Peticion peticion) {
        return Respuesta.ok(catalogoService.listarTarifasVigentes());
    }

    /** {@code GET /api/marcas}. */
    public Respuesta marcas(Peticion peticion) {
        return Respuesta.ok(catalogoService.listarMarcas());
    }

    /** {@code GET /api/modelos[?idMarca=1]}: 400 si {@code idMarca} no es un número. */
    public Respuesta modelos(Peticion peticion) {
        return Respuesta.ok(catalogoService.listarModelos(peticion.parametroQueryComoLong("idMarca")));
    }
}
