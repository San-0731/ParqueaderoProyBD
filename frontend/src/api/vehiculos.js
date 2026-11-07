import { get, post, put } from './cliente.js';

// Vehículo: { idVehiculo, identificador, idTipo, idModelo, idCliente, color, anio }
// (idModelo, color y anio pueden ser null).

/**
 * Lista los vehículos. Con { identificador } busca esa placa o código (el backend lo
 * normaliza: "klm-234" encuentra "KLM234"); si no existe, devuelve una lista vacía.
 */
export function listarVehiculos({ identificador } = {}) {
  return get('/vehiculos', { identificador });
}

/** Un vehículo por su id (404 si no existe). */
export function obtenerVehiculo(idVehiculo) {
  return get(`/vehiculos/${encodeURIComponent(idVehiculo)}`);
}

/**
 * Registra un vehículo: { identificador, idTipo, idCliente, idModelo?, color?, anio? }.
 * 201 con el vehículo creado; 409 si la placa ya existe.
 */
export function crearVehiculo(datos) {
  return post('/vehiculos', datos);
}

/** Reemplaza todos los datos del vehículo (los campos que no se envían quedan en null). */
export function actualizarVehiculo(idVehiculo, datos) {
  return put(`/vehiculos/${encodeURIComponent(idVehiculo)}`, datos);
}
