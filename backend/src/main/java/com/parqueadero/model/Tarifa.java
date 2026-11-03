package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Fila de la tabla {@code tarifa}: precio por hora de un tipo de vehículo a
 * partir de una fecha. La tarifa de un parqueo es la de {@code vigenteDesde}
 * más reciente que no sea posterior a la entrada.
 *
 * @param idTarifa     llave primaria; {@code null} antes de insertar
 * @param idTipo       tipo de vehículo al que aplica ({@code tipo_vehiculo})
 * @param valorHora    precio por hora; mayor que 0
 * @param vigenteDesde día desde el que aplica la tarifa
 */
public record Tarifa(Long idTarifa, Long idTipo, BigDecimal valorHora, LocalDate vigenteDesde) {
}
