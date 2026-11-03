/**
 * Excepciones propias de la aplicación. Todas heredan de
 * {@link com.parqueadero.exception.AplicacionException} y llevan el código HTTP
 * con el que el handler debe responder:
 *
 * <ul>
 *   <li>{@link com.parqueadero.exception.NoEncontradoException}: 404, el recurso no existe.</li>
 *   <li>{@link com.parqueadero.exception.DatosInvalidosException}: 400, los datos enviados no son válidos.</li>
 *   <li>{@link com.parqueadero.exception.ReglaNegocioException}: 409, los datos son válidos pero
 *       la operación choca con una regla del negocio o con el estado actual.</li>
 *   <li>{@link com.parqueadero.exception.RutaNoEncontradaException}: 404, no existe la ruta pedida.</li>
 *   <li>{@link com.parqueadero.exception.MetodoNoPermitidoException}: 405, la ruta existe pero no
 *       acepta ese método HTTP.</li>
 * </ul>
 */
package com.parqueadero.exception;
