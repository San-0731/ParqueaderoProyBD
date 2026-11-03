package com.parqueadero.exception;

/**
 * Los datos son válidos, pero la operación choca con una regla del negocio o
 * con el estado actual (HTTP 409 Conflict).
 * Ejemplo: registrar una placa que ya existe, parquear en un espacio ocupado o
 * borrar un cliente que tiene vehículos.
 */
public class ReglaNegocioException extends AplicacionException {

    public ReglaNegocioException(String mensaje) {
        super(409, mensaje);
    }

    public ReglaNegocioException(String mensaje, Throwable causa) {
        super(409, mensaje, causa);
    }
}
