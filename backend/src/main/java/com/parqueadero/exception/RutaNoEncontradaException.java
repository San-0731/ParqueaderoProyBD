package com.parqueadero.exception;

/**
 * No hay ninguna ruta registrada para la URL pedida (HTTP 404).
 * Ejemplo: {@code GET /api/xyz}. Es distinta de {@link NoEncontradoException},
 * que indica que la ruta existe pero el recurso (por ejemplo, un vehículo) no.
 */
public class RutaNoEncontradaException extends AplicacionException {

    public RutaNoEncontradaException(String mensaje) {
        super(404, mensaje);
    }
}
