package com.parqueadero.util;

/**
 * Lo que devuelve un {@link Manejador}: el código HTTP y el objeto que se
 * enviará como JSON ({@code null} si no hay cuerpo).
 */
public record Respuesta(int estado, Object cuerpo) {

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
}
