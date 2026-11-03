package com.parqueadero.exception;

/**
 * Base de las excepciones de la aplicación. Guarda el código HTTP con el que
 * se debe responder, así el handler las atrapa todas con un solo
 * {@code catch (AplicacionException e)} y usa {@link #getEstadoHttp()}.
 *
 * <p>Extiende {@link RuntimeException} (excepción no verificada): los métodos
 * no necesitan declararla con {@code throws}.
 */
public abstract class AplicacionException extends RuntimeException {

    private final int estadoHttp;

    protected AplicacionException(int estadoHttp, String mensaje) {
        super(mensaje);
        this.estadoHttp = estadoHttp;
    }

    protected AplicacionException(int estadoHttp, String mensaje, Throwable causa) {
        super(mensaje, causa);
        this.estadoHttp = estadoHttp;
    }

    /** Código HTTP de la respuesta (por ejemplo 404, 400 o 409). */
    public int getEstadoHttp() {
        return estadoHttp;
    }
}
