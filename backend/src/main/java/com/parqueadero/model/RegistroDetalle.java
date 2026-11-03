package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Detalle de un registro de parqueo: los datos del registro más la placa del
 * vehículo, la ubicación del espacio y los pagos. No es una tabla: se arma con
 * una consulta sobre {@code registro_parqueo}, {@code vehiculo} y
 * {@code espacio}, y los pagos se leen aparte de {@code pago}.
 *
 * <p>Es la respuesta de {@code GET /api/registros/{id}} y de la entrada
 * ({@code POST /api/registros/entrada}).
 *
 * @param idRegistro     llave primaria
 * @param idVehiculo     vehículo parqueado
 * @param identificador  placa o código del vehículo
 * @param idEspacio      espacio ocupado
 * @param piso           piso del espacio
 * @param zona           zona del espacio
 * @param numero         número del espacio
 * @param entrada        fecha y hora de entrada
 * @param salida         fecha y hora de salida; {@code null} mientras está {@code ACTIVO}
 * @param minutosTotales minutos cobrados; {@code null} mientras está {@code ACTIVO}
 * @param valorTotal     valor cobrado; {@code null} mientras está {@code ACTIVO}
 * @param estado         {@code ACTIVO} o {@code PAGO}
 * @param pagos          pagos del registro; lista vacía mientras está {@code ACTIVO}
 */
public record RegistroDetalle(Long idRegistro, Long idVehiculo, String identificador,
        Long idEspacio, String piso, String zona, String numero,
        LocalDateTime entrada, LocalDateTime salida, Long minutosTotales,
        BigDecimal valorTotal, EstadoRegistro estado, List<Pago> pagos) {

    public RegistroDetalle {
        // Nunca null: el frontend siempre recibe una lista ([] si no hay pagos).
        pagos = pagos == null ? List.of() : List.copyOf(pagos);
    }

    /** Copia de este detalle con la lista de pagos indicada. */
    public RegistroDetalle conPagos(List<Pago> pagosDelRegistro) {
        return new RegistroDetalle(idRegistro, idVehiculo, identificador, idEspacio, piso, zona,
                numero, entrada, salida, minutosTotales, valorTotal, estado, pagosDelRegistro);
    }
}
