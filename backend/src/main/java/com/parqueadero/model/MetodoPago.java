package com.parqueadero.model;

/**
 * Fila de la tabla {@code metodo_pago}: catálogo de formas de pago (PSE,
 * Nequi, Daviplata, Efectivo).
 *
 * @param idMetodo           llave primaria; {@code null} antes de insertar
 * @param nombre             nombre del método; único
 * @param requiereReferencia si el pago exige un código de transacción
 *                           ({@code Pago.referencia})
 */
public record MetodoPago(Long idMetodo, String nombre, Boolean requiereReferencia) {
}
