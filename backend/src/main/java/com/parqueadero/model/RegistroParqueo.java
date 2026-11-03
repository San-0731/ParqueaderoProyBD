package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fila de la tabla {@code registro_parqueo}: entidad central. Se crea cuando
 * el vehículo entra (estado {@code ACTIVO}) y se completa cuando sale y paga
 * (estado {@code PAGO}).
 *
 * @param idRegistro     llave primaria; {@code null} antes de insertar
 * @param idVehiculo     vehículo parqueado ({@code vehiculo})
 * @param idEspacio      espacio ocupado ({@code espacio})
 * @param entrada        fecha y hora de entrada; en la base vale la hora actual por defecto
 * @param salida         fecha y hora de salida; {@code null} mientras está {@code ACTIVO}
 * @param minutosTotales minutos entre entrada y salida; {@code null} mientras está {@code ACTIVO}
 * @param valorTotal     valor cobrado; {@code null} mientras está {@code ACTIVO}
 * @param estado         {@code ACTIVO} o {@code PAGO}
 */
public record RegistroParqueo(Long idRegistro, Long idVehiculo, Long idEspacio,
        LocalDateTime entrada, LocalDateTime salida, Long minutosTotales,
        BigDecimal valorTotal, EstadoRegistro estado) {
}
