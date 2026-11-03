package com.parqueadero.model;

/**
 * Fila de la tabla {@code tipo_vehiculo}: catálogo de tipos de vehículo
 * (moto, bicicleta, carro, camión).
 *
 * @param idTipo llave primaria; {@code null} antes de insertar
 * @param nombre nombre del tipo; único
 */
public record TipoVehiculo(Long idTipo, String nombre) {
}
