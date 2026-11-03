package com.parqueadero.util;

/**
 * Código que atiende una ruta de la API. Recibe la {@link Peticion} ya
 * procesada por el {@link Router} y devuelve la {@link Respuesta}.
 *
 * <p>No escribe directamente en {@code HttpExchange}: así los handlers se
 * pueden probar sin servidor, y la escritura del JSON, las cabeceras CORS y
 * los errores queda en un solo lugar.
 *
 * <p>Ejemplo: {@code router.get("/api/vehiculos/{id}", p -> Respuesta.ok(servicio.buscarPorId(p.parametroRutaComoLong("id"))));}
 */
@FunctionalInterface
public interface Manejador {

    Respuesta manejar(Peticion peticion);
}
