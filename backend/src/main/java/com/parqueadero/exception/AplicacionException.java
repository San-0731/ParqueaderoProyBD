package com.parqueadero.exception;

/**
 * Base de las excepciones de la aplicación. Guarda el código HTTP y el código
 * de error con los que se debe responder, así el servidor las atrapa todas con
 * un solo {@code catch (AplicacionException e)} y arma la respuesta
 * {@code { "error": getCodigo(), "mensaje": getMessage() }} con el estado
 * {@link #getEstadoHttp()}.
 *
 * <p>Extiende {@link RuntimeException} (excepción no verificada): los métodos
 * no necesitan declararla con {@code throws}.
 */
public abstract class AplicacionException extends RuntimeException {

    private final int estadoHttp;
    private final String codigo;

    protected AplicacionException(int estadoHttp, String codigo, String mensaje) {
        super(mensaje);
        this.estadoHttp = estadoHttp;
        this.codigo = codigo;
    }

    protected AplicacionException(int estadoHttp, String codigo, String mensaje, Throwable causa) {
        super(mensaje, causa);
        this.estadoHttp = estadoHttp;
        this.codigo = codigo;
    }

    /** Código HTTP de la respuesta (por ejemplo 404, 400 o 409). */
    public int getEstadoHttp() {
        return estadoHttp;
    }

    /**
     * Código del error para el campo {@code "error"} de la respuesta, por
     * ejemplo {@code "DATOS_INVALIDOS"}. El frontend lo usa para distinguir
     * casos sin depender del texto del mensaje.
     */
    public String getCodigo() {
        return codigo;
    }
}
