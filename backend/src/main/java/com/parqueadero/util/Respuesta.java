package com.parqueadero.util;

import com.parqueadero.exception.AplicacionException;

/**
 * Lo que devuelve un {@link Manejador}: el código HTTP y el objeto que se
 * enviará como JSON ({@code null} si no hay cuerpo).
 */
public record Respuesta(int estado, Object cuerpo) {

    /**
     * Mensaje de los errores 500. Es genérico a propósito: el detalle real
     * (SQL, nombres de tablas, stack trace) solo se imprime en la consola del
     * servidor, nunca se envía al cliente.
     */
    static final String MENSAJE_ERROR_INTERNO =
            "Ocurrió un error interno en el servidor. Intenta de nuevo más tarde.";

    /** 200 OK con el objeto como cuerpo. */
    public static Respuesta ok(Object cuerpo) {
        return new Respuesta(200, cuerpo);
    }

    /** 201 Created: se creó un recurso (por ejemplo, con POST). */
    public static Respuesta creado(Object cuerpo) {
        return new Respuesta(201, cuerpo);
    }

    /** 204 No Content: la operación salió bien y no hay nada que devolver. */
    public static Respuesta sinContenido() {
        return new Respuesta(204, null);
    }

    /**
     * Convierte una excepción en la respuesta de error uniforme
     * {@code { "error": "CODIGO", "mensaje": "..." }}.
     *
     * <ul>
     *   <li>{@link AplicacionException} (400, 404, 405, 409): su estado, su
     *       código y su mensaje, que ya está pensado para el usuario.</li>
     *   <li>Cualquier otra: 500 {@code ERROR_INTERNO} con un mensaje genérico.</li>
     * </ul>
     */
    public static Respuesta deError(Throwable error) {
        if (error instanceof AplicacionException excepcion) {
            return new Respuesta(excepcion.getEstadoHttp(),
                    new ErrorApi(excepcion.getCodigo(), excepcion.getMessage()));
        }
        return new Respuesta(500, new ErrorApi("ERROR_INTERNO", MENSAJE_ERROR_INTERNO));
    }
}
