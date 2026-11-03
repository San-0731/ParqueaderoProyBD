package com.parqueadero.model;

/**
 * Fila de la tabla {@code vehiculo}: cada vehículo registrado.
 *
 * @param idVehiculo    llave primaria; {@code null} antes de insertar
 * @param identificador placa, o número de marco o código en bicicletas; único,
 *                      solo letras mayúsculas y dígitos
 * @param idTipo        tipo de vehículo ({@code tipo_vehiculo})
 * @param idModelo      modelo ({@code modelo}); puede ser {@code null}, por
 *                      ejemplo en bicicletas sin modelo identificable
 * @param idCliente     propietario ({@code cliente})
 * @param color         color; puede ser {@code null}
 * @param anio          año del vehículo, entre 1900 y 2100; puede ser {@code null}
 */
public record Vehiculo(Long idVehiculo, String identificador, Long idTipo, Long idModelo,
        Long idCliente, String color, Integer anio) {
}
