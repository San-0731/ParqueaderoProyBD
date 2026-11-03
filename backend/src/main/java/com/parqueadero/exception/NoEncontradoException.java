package com.parqueadero.exception;

/**
 * El recurso pedido no existe (HTTP 404 Not Found).
 * Ejemplo: buscar un vehículo con un id que no está registrado.
 */
public class NoEncontradoException extends AplicacionException {

    public NoEncontradoException(String mensaje) {
        super(404, "NO_ENCONTRADO", mensaje);
    }

    public NoEncontradoException(String mensaje, Throwable causa) {
        super(404, "NO_ENCONTRADO", mensaje, causa);
    }
}
