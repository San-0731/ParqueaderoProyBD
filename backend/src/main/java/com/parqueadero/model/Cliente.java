package com.parqueadero.model;

/**
 * Fila de la tabla {@code cliente}: propietarios de los vehículos.
 *
 * @param idCliente llave primaria; {@code null} antes de insertar
 * @param documento documento de identidad; único
 * @param nombres   nombres del cliente
 * @param apellidos apellidos del cliente
 * @param telefono  teléfono de contacto; puede ser {@code null}
 */
public record Cliente(Long idCliente, String documento, String nombres, String apellidos,
        String telefono) {
}
