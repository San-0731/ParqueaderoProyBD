/**
 * Modelo del dominio: un {@code record} por cada tabla de la base de datos
 * (TipoVehiculo, Tarifa, Marca, Modelo, Cliente, Vehiculo, Espacio,
 * RegistroParqueo, MetodoPago, Pago) y el enum {@link com.parqueadero.model.EstadoRegistro}.
 *
 * <p>Los campos tienen los mismos nombres que las columnas, en camelCase, y
 * todos admiten {@code null} (tipos envoltorio). Las llaves foráneas se guardan
 * como ids. Los records no validan: las reglas de negocio van en {@code service}.
 */
package com.parqueadero.model;
