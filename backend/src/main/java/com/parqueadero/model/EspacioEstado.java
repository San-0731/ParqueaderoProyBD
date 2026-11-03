package com.parqueadero.model;

/**
 * Un espacio con su estado actual, calculado al consultar. No es una tabla:
 * es el resultado de una consulta sobre {@code espacio} y
 * {@code registro_parqueo} (o de la vista {@code vw_espacios_disponibles}).
 *
 * <ul>
 *   <li>{@code habilitado}: el espacio está en servicio (no en mantenimiento).
 *       Se guarda en la tabla.</li>
 *   <li>{@code ocupado}: tiene un registro de parqueo en estado ACTIVO.
 *       Se calcula.</li>
 *   <li>{@code disponible}: se puede parquear ahí ahora
 *       ({@code habilitado && !ocupado}). Se calcula.</li>
 * </ul>
 *
 * @param idEspacio  llave primaria
 * @param idTipo     tipo de vehículo que admite el espacio
 * @param piso       piso
 * @param zona       zona dentro del piso
 * @param numero     número dentro de la zona
 * @param habilitado si está en servicio
 * @param ocupado    si hay un vehículo parqueado ahora
 * @param disponible si está habilitado y libre
 */
public record EspacioEstado(Long idEspacio, Long idTipo, String piso, String zona, String numero,
        Boolean habilitado, Boolean ocupado, Boolean disponible) {
}
