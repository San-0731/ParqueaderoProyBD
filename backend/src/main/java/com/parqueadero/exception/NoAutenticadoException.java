package com.parqueadero.exception;

/**
 * La petición necesita una sesión y no la tiene, o la que trae no es válida o
 * ya terminó (HTTP 401 Unauthorized). También se usa cuando el usuario o la
 * contraseña del inicio de sesión no son correctos.
 */
public class NoAutenticadoException extends AplicacionException {

    public NoAutenticadoException(String mensaje) {
        super(401, "NO_AUTENTICADO", mensaje);
    }
}
