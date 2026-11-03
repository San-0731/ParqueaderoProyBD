package com.parqueadero.model;

/**
 * Estado de un registro de parqueo (columna {@code registro_parqueo.estado}).
 *
 * <p>Los nombres coinciden con los valores que permite el CHECK de la base, así
 * que se convierte con {@code EstadoRegistro.valueOf(texto)} al leer y con
 * {@code estado.name()} al guardar.
 */
public enum EstadoRegistro {

    /** El vehículo sigue adentro: no tiene salida ni cobro. */
    ACTIVO,

    /** El vehículo salió y el cobro quedó registrado. */
    PAGO
}
