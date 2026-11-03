package com.parqueadero.model;

/**
 * Fila de la tabla {@code espacio}: cada lugar de parqueo, demarcado para un
 * tipo de vehículo. La ocupación no se guarda aquí: se calcula desde
 * {@code registro_parqueo}.
 *
 * @param idEspacio  llave primaria; {@code null} antes de insertar
 * @param idTipo     tipo de vehículo para el que está demarcado ({@code tipo_vehiculo})
 * @param piso       piso; piso + zona + número es único
 * @param zona       zona dentro del piso
 * @param numero     número del espacio dentro de la zona
 * @param habilitado si el espacio está en servicio; en la base vale TRUE por defecto
 */
public record Espacio(Long idEspacio, Long idTipo, String piso, String zona, String numero,
        Boolean habilitado) {
}
