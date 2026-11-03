package com.parqueadero.exception;

/**
 * Los datos enviados no son válidos (HTTP 400 Bad Request).
 * Ejemplo: un año fuera de rango, un campo obligatorio vacío o un id de
 * cliente que no existe.
 */
public class DatosInvalidosException extends AplicacionException {

    public DatosInvalidosException(String mensaje) {
        super(400, mensaje);
    }

    public DatosInvalidosException(String mensaje, Throwable causa) {
        super(400, mensaje, causa);
    }
}
