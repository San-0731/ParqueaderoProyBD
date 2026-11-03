package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Un parqueo terminado (estado {@code PAGO}): una fila de la vista
 * {@code vw_historial_parqueos} (V004). Si se pagó con varios métodos, la vista
 * los une en un texto, por ejemplo {@code "Efectivo + Nequi"}.
 *
 * @param idRegistro     registro de parqueo
 * @param identificador  placa o código del vehículo ({@code placa} en la vista)
 * @param tipoVehiculo   nombre del tipo (Carro, Moto, ...)
 * @param piso           piso del espacio
 * @param zona           zona del espacio
 * @param numero         número del espacio
 * @param entrada        fecha y hora de entrada
 * @param salida         fecha y hora de salida
 * @param minutosTotales minutos cobrados
 * @param valorTotal     valor cobrado
 * @param metodosPago    métodos usados, unidos con " + "
 * @param referencias    referencias de los pagos, unidas con " + "; {@code null}
 *                       si todo se pagó en efectivo
 */
public record ParqueoHistorial(Long idRegistro, String identificador, String tipoVehiculo,
        String piso, String zona, String numero, LocalDateTime entrada,
        LocalDateTime salida, Long minutosTotales, BigDecimal valorTotal,
        String metodosPago, String referencias) {
}
