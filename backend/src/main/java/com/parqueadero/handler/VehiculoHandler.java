package com.parqueadero.handler;

import com.parqueadero.model.Vehiculo;
import com.parqueadero.service.VehiculoService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de vehículos.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/vehiculos</td><td>200 con la lista (filtro opcional {@code ?identificador=})</td></tr>
 *   <tr><td>GET /api/vehiculos/{id}</td><td>200 con el vehículo, o 404</td></tr>
 *   <tr><td>POST /api/vehiculos</td><td>201 con el vehículo creado</td></tr>
 *   <tr><td>PUT /api/vehiculos/{id}</td><td>200 con el vehículo actualizado</td></tr>
 * </table>
 *
 * <p>Esta clase es la <b>plantilla</b> de los demás handlers: solo lee la
 * petición, llama al servicio y devuelve la respuesta. No tiene SQL, ni
 * validaciones, ni try/catch: los errores suben hasta {@link ApiHandler}, que
 * los convierte en el JSON de error.
 */
public final class VehiculoHandler {

    private final VehiculoService vehiculoService;

    public VehiculoHandler(VehiculoService vehiculoService) {
        this.vehiculoService = vehiculoService;
    }

    /**
     * {@code GET /api/vehiculos[?identificador=klm-234]}. Con el filtro devuelve
     * una lista con el vehículo encontrado o una lista vacía (no un 404).
     */
    public Respuesta listar(Peticion peticion) {
        return Respuesta.ok(vehiculoService.listar(peticion.parametroQuery("identificador")));
    }

    /** {@code GET /api/vehiculos/{id}}. */
    public Respuesta buscarPorId(Peticion peticion) {
        return Respuesta.ok(vehiculoService.buscarPorId(peticion.parametroRutaComoLong("id")));
    }

    /**
     * {@code POST /api/vehiculos}. Cuerpo, por ejemplo:
     * {@code {"identificador":"xyz-987","idTipo":3,"idModelo":1,"idCliente":1,"color":"Rojo","anio":2020}}.
     * Si el cuerpo trae {@code idVehiculo}, se ignora.
     */
    public Respuesta crear(Peticion peticion) {
        Vehiculo datos = peticion.cuerpoComo(Vehiculo.class);
        return Respuesta.creado(vehiculoService.crear(datos));
    }

    /**
     * {@code PUT /api/vehiculos/{id}}. Reemplaza <b>todos</b> los datos del
     * vehículo: un campo opcional que no se envíe ({@code idModelo},
     * {@code color}, {@code anio}) queda en {@code null}. El frontend debe
     * enviar el formulario completo. Se usa el id de la ruta, no el del cuerpo.
     */
    public Respuesta actualizar(Peticion peticion) {
        long idVehiculo = peticion.parametroRutaComoLong("id");
        Vehiculo datos = peticion.cuerpoComo(Vehiculo.class);
        return Respuesta.ok(vehiculoService.actualizar(idVehiculo, datos));
    }
}
