import { get, post } from './cliente.js';

// Registros de parqueo: entrada, vehículos dentro, historial, liquidación y salida.
// Las fechas llegan como "2026-11-03T14:30:00" (hora de Bogotá, sin zona horaria).

/**
 * Registra la entrada de un vehículo: { identificador, idEspacio }.
 * 201 con el detalle del registro (estado ACTIVO). 409 si el tipo no coincide, el espacio
 * está ocupado o deshabilitado, o el vehículo ya está adentro; 404 si el vehículo no existe.
 */
export function registrarEntrada({ identificador, idEspacio }) {
  return post('/registros/entrada', { identificador, idEspacio });
}

/**
 * Vehículos que están adentro ahora. Filtro opcional: { identificador }.
 * Cada uno: { idRegistro, identificador, tipoVehiculo, documentoCliente, nombreCliente,
 * idEspacio, piso, zona, numero, entrada, minutosTranscurridos }.
 */
export function listarActivos({ identificador } = {}) {
  return get('/registros/activos', { identificador });
}

/**
 * Historial de parqueos terminados (el más reciente primero).
 * Filtros opcionales: { desde, hasta } ("2026-10-01", ambas incluidas), { identificador },
 * { idMetodoPago }. Cada uno: { idRegistro, identificador, tipoVehiculo, piso, zona, numero,
 * entrada, salida, minutosTotales, valorTotal, metodosPago, referencias }.
 */
export function listarHistorial({ desde, hasta, identificador, idMetodoPago } = {}) {
  return get('/registros', { desde, hasta, identificador, idMetodoPago });
}

/**
 * Detalle de un registro: { idRegistro, idVehiculo, identificador, idEspacio, piso, zona,
 * numero, entrada, salida, minutosTotales, valorTotal, estado: 'ACTIVO' | 'PAGO', pagos }.
 */
export function obtenerRegistro(idRegistro) {
  return get(`/registros/${encodeURIComponent(idRegistro)}`);
}

/**
 * Lo que pagaría el vehículo si saliera ahora. NO guarda nada.
 * { idRegistro, entrada, salida, minutosTotales, horasCobradas, valorHora, valorTotal }.
 * 409 si el registro ya está cerrado.
 */
export function consultarLiquidacion(idRegistro) {
  return get(`/registros/${encodeURIComponent(idRegistro)}/liquidacion`);
}

/**
 * Registra la salida y el pago en una sola transacción: { idMetodoPago, referencia? }.
 * La referencia es obligatoria para los métodos que la requieren (PSE, Nequi, Daviplata).
 * Devuelve el detalle del registro (estado PAGO) con su pago.
 */
export function registrarSalida(idRegistro, { idMetodoPago, referencia }) {
  return post(`/registros/${encodeURIComponent(idRegistro)}/salida`, {
    idMetodoPago,
    referencia,
  });
}
