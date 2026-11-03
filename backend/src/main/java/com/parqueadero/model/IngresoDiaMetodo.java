package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Lo recaudado en un día con un método de pago: una fila de la vista
 * {@code vw_ingresos_por_metodo} (V004). El día es el del <b>pago</b>, no el
 * de la entrada: un parqueo que pasa la noche se cuenta el día en que se pagó.
 *
 * @param fecha          día del pago
 * @param metodoPago     nombre del método (PSE, Nequi, Daviplata, Efectivo)
 * @param cantidadPagos  número de pagos de ese día con ese método
 * @param totalRecaudado suma de esos pagos
 */
public record IngresoDiaMetodo(LocalDate fecha, String metodoPago, Long cantidadPagos,
        BigDecimal totalRecaudado) {
}
