/**
 * Capa HTTP de la API.
 *
 * <ul>
 *   <li>{@link com.parqueadero.handler.ApiHandler}: el único {@code HttpHandler} del
 *       servidor; aplica CORS, despacha con el {@code Router}, traduce errores y
 *       escribe el JSON.</li>
 *   <li>Handlers de cada recurso (por ejemplo {@link com.parqueadero.handler.SaludHandler}):
 *       reciben una {@code Peticion}, llaman a los servicios y devuelven una
 *       {@code Respuesta}. No tienen SQL ni reglas de negocio.</li>
 * </ul>
 */
package com.parqueadero.handler;
