package com.parqueadero.model;

/**
 * Ocupación de los espacios de un tipo de vehículo, en este momento. Es una
 * fila de {@code GET /api/reportes/ocupacion}.
 *
 * <p>Las tres categorías no se repiten, así que
 * {@code ocupados + libres + deshabilitados = total}. Un espacio deshabilitado
 * que todavía tiene un vehículo adentro se cuenta como ocupado.
 *
 * @param idTipo         tipo de vehículo
 * @param tipoVehiculo   nombre del tipo
 * @param total          espacios de ese tipo
 * @param ocupados       con un vehículo adentro (registro ACTIVO)
 * @param libres         habilitados y sin vehículo: se puede parquear ahí
 * @param deshabilitados fuera de servicio y sin vehículo
 */
public record OcupacionTipo(Long idTipo, String tipoVehiculo, Long total, Long ocupados,
        Long libres, Long deshabilitados) {
}
