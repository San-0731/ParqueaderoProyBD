package com.parqueadero.model;

import java.math.BigDecimal;

/**
 * Lo recaudado con un método de pago en todo el rango del reporte.
 *
 * @param metodoPago     nombre del método
 * @param cantidadPagos  número de pagos con ese método
 * @param totalRecaudado suma de esos pagos
 */
public record IngresoPorMetodo(String metodoPago, Long cantidadPagos, BigDecimal totalRecaudado) {
}
