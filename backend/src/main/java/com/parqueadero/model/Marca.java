package com.parqueadero.model;

/**
 * Fila de la tabla {@code marca}: fabricantes de vehículos (Chevrolet, Yamaha, ...).
 *
 * @param idMarca llave primaria; {@code null} antes de insertar
 * @param nombre  nombre de la marca; único
 */
public record Marca(Long idMarca, String nombre) {
}
