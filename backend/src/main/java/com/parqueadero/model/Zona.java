package com.parqueadero.model;

/**
 * Una zona (tabla {@code zona}, V006): un área de un piso demarcada para un
 * tipo de vehículo, con un resumen de sus espacios. En pantalla se nombra con
 * la letra y el piso: la zona A del piso 1 es la A1.
 *
 * @param idZona       llave primaria
 * @param piso         piso, del '1' al '99'
 * @param letra        letra de la zona, de la A a la Z
 * @param idTipo       tipo de vehículo que admite
 * @param tipoVehiculo nombre del tipo ("Carro")
 * @param espacios     cuántos espacios tiene
 * @param ultimoNumero número más alto de sus espacios ("08"), o {@code null} si no tiene
 */
public record Zona(long idZona, String piso, String letra, long idTipo, String tipoVehiculo,
        long espacios, String ultimoNumero) {
}
