package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fila de la tabla {@code pago}: un pago de un registro de parqueo. Un
 * registro puede tener varios pagos con métodos distintos.
 *
 * @param idPago     llave primaria; {@code null} antes de insertar
 * @param idRegistro registro de parqueo que se paga ({@code registro_parqueo})
 * @param idMetodo   forma de pago ({@code metodo_pago})
 * @param monto      valor pagado; mayor que 0
 * @param fechaPago  fecha y hora del pago; en la base vale la hora actual por defecto
 * @param referencia código de transacción de PSE, Nequi o Daviplata; único;
 *                   {@code null} en efectivo
 */
public record Pago(Long idPago, Long idRegistro, Long idMetodo, BigDecimal monto,
        LocalDateTime fechaPago, String referencia) {
}
