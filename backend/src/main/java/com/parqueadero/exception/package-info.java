/**
 * Excepciones propias de la aplicación. Todas heredan de
 * {@link com.parqueadero.exception.AplicacionException} y llevan el código HTTP
 * y el código de error ({@code "error"} del JSON) con los que se responde:
 *
 * <ul>
 *   <li>{@link com.parqueadero.exception.DatosInvalidosException}: 400 {@code DATOS_INVALIDOS},
 *       los datos enviados no son válidos.</li>
 *   <li>{@link com.parqueadero.exception.NoEncontradoException}: 404 {@code NO_ENCONTRADO},
 *       el recurso no existe.</li>
 *   <li>{@link com.parqueadero.exception.RutaNoEncontradaException}: 404 {@code RUTA_NO_ENCONTRADA},
 *       no existe la ruta pedida.</li>
 *   <li>{@link com.parqueadero.exception.MetodoNoPermitidoException}: 405 {@code METODO_NO_PERMITIDO},
 *       la ruta existe pero no acepta ese método HTTP.</li>
 *   <li>{@link com.parqueadero.exception.ReglaNegocioException}: 409 {@code REGLA_NEGOCIO},
 *       los datos son válidos pero la operación choca con una regla del negocio o
 *       con el estado actual.</li>
 * </ul>
 *
 * <p>Cualquier otra excepción se responde como 500 {@code ERROR_INTERNO}.
 */
package com.parqueadero.exception;
