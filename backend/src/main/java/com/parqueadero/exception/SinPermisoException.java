package com.parqueadero.exception;

/**
 * Hay una sesión válida, pero el rol del usuario no alcanza para la operación
 * (HTTP 403 Forbidden). Ejemplo: un operador que intenta editar un vehículo.
 */
public class SinPermisoException extends AplicacionException {

    public SinPermisoException(String mensaje) {
        super(403, "SIN_PERMISO", mensaje);
    }
}
