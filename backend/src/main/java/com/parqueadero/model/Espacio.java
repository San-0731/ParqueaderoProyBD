package com.parqueadero.model;

/**
 * Un lugar de parqueo con los datos de su zona. Desde V006 la tabla
 * {@code espacio} solo guarda la zona, el número y si está habilitado; el piso
 * y el tipo de vehículo son de la zona ({@code zona}). La ocupación no se
 * guarda: se calcula desde {@code registro_parqueo}.
 *
 * @param idEspacio  llave primaria; {@code null} antes de insertar
 * @param idTipo     tipo de vehículo de su zona ({@code zona.id_tipo})
 * @param piso       piso de su zona ({@code zona.piso})
 * @param zona       letra de su zona ({@code zona.letra}); piso + letra identifican la zona
 * @param numero     número del espacio dentro de la zona; zona + número es único
 * @param habilitado si el espacio está en servicio; en la base vale TRUE por defecto
 */
public record Espacio(Long idEspacio, Long idTipo, String piso, String zona, String numero,
        Boolean habilitado) {
}
