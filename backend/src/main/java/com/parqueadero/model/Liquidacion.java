package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Lo que costaría un parqueo si el vehículo saliera ahora. Es la respuesta de
 * {@code GET /api/registros/{id}/liquidacion}; no se guarda en la base.
 *
 * @param idRegistro     registro de parqueo (ACTIVO)
 * @param entrada        fecha y hora de entrada
 * @param salida         hora de corte usada en el cálculo (la hora actual)
 * @param minutosTotales minutos completos entre entrada y salida
 * @param horasCobradas  horas que se cobran (hora o fracción)
 * @param valorHora      tarifa aplicada: la vigente en la fecha de entrada
 * @param valorTotal     valor a pagar; 0 si no ha cumplido un minuto
 */
public record Liquidacion(Long idRegistro, LocalDateTime entrada, LocalDateTime salida,
        Long minutosTotales, Long horasCobradas, BigDecimal valorHora, BigDecimal valorTotal) {
}
