import { get, post, put } from './cliente.js';

// Clientes = propietarios de los vehículos. El recurso del backend se llama /clientes.
// Cliente: { idCliente, documento, nombres, apellidos, telefono } (telefono puede ser null).

/**
 * Lista los clientes. Con { documento } busca ese documento (el backend quita puntos,
 * espacios y guiones: "1.012.345.678" encuentra "1012345678").
 */
export function listarClientes({ documento } = {}) {
  return get('/clientes', { documento });
}

/** Un cliente por su id (404 si no existe). */
export function obtenerCliente(idCliente) {
  return get(`/clientes/${encodeURIComponent(idCliente)}`);
}

/**
 * Registra un cliente: { documento, nombres, apellidos, telefono? }.
 * 201 con el cliente creado; 409 si el documento ya existe.
 */
export function crearCliente(datos) {
  return post('/clientes', datos);
}

/** Reemplaza todos los datos del cliente (los campos que no se envían quedan en null). */
export function actualizarCliente(idCliente, datos) {
  return put(`/clientes/${encodeURIComponent(idCliente)}`, datos);
}
