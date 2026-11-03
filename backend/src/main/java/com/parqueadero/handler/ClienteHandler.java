package com.parqueadero.handler;

import com.parqueadero.model.Cliente;
import com.parqueadero.service.ClienteService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de clientes (propietarios de los vehículos). Sigue la plantilla de
 * {@link VehiculoHandler}.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/clientes</td><td>200 con la lista (filtro opcional {@code ?documento=})</td></tr>
 *   <tr><td>GET /api/clientes/{id}</td><td>200 con el cliente, o 404</td></tr>
 *   <tr><td>POST /api/clientes</td><td>201 con el cliente creado</td></tr>
 *   <tr><td>PUT /api/clientes/{id}</td><td>200 con el cliente actualizado</td></tr>
 * </table>
 */
public final class ClienteHandler {

    private final ClienteService clienteService;

    public ClienteHandler(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    /**
     * {@code GET /api/clientes[?documento=1.012.345.678]}. Con el filtro devuelve
     * una lista con el cliente encontrado o una lista vacía (no un 404).
     */
    public Respuesta listar(Peticion peticion) {
        return Respuesta.ok(clienteService.listar(peticion.parametroQuery("documento")));
    }

    /** {@code GET /api/clientes/{id}}. */
    public Respuesta buscarPorId(Peticion peticion) {
        return Respuesta.ok(clienteService.buscarPorId(peticion.parametroRutaComoLong("id")));
    }

    /**
     * {@code POST /api/clientes}. Cuerpo, por ejemplo:
     * {@code {"documento":"1.000.000.001","nombres":"Ana","apellidos":"Pérez","telefono":"310 000-0001"}}.
     */
    public Respuesta crear(Peticion peticion) {
        Cliente datos = peticion.cuerpoComo(Cliente.class);
        return Respuesta.creado(clienteService.crear(datos));
    }

    /**
     * {@code PUT /api/clientes/{id}}. Reemplaza <b>todos</b> los datos: si no
     * se envía {@code telefono}, queda en {@code null}.
     */
    public Respuesta actualizar(Peticion peticion) {
        long idCliente = peticion.parametroRutaComoLong("id");
        Cliente datos = peticion.cuerpoComo(Cliente.class);
        return Respuesta.ok(clienteService.actualizar(idCliente, datos));
    }
}
