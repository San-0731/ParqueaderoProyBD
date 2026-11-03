package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Lo recaudado en un día, sumando todos los métodos de pago.
 *
 * @param fecha          día del pago
 * @param cantidadPagos  número de pagos de ese día
 * @param totalRecaudado suma de esos pagos
 */
public record IngresoPorDia(LocalDate fecha, Long cantidadPagos, BigDecimal totalRecaudado) {
}
