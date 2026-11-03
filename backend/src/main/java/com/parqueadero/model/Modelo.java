package com.parqueadero.model;

/**
 * Fila de la tabla {@code modelo}: línea comercial de una marca (Spark, NMAX, NHR).
 *
 * @param idModelo llave primaria; {@code null} antes de insertar
 * @param idMarca  marca a la que pertenece ({@code marca})
 * @param nombre   nombre del modelo; único dentro de la misma marca
 */
public record Modelo(Long idModelo, Long idMarca, String nombre) {
}
