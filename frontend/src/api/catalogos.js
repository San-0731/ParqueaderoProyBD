import { get, post } from './cliente.js';

// Catálogos: llenan las listas desplegables. Agregar marcas y modelos es solo del DBA
// (pestaña Sistema); los demás roles los leen.

/** Tipos de vehículo: [{ idTipo, nombre }] (Moto, Bicicleta, Carro, Camión). */
export function listarTiposVehiculo() {
  return get('/tipos-vehiculo');
}

/**
 * Métodos de pago: [{ idMetodo, nombre, requiereReferencia }]. requiereReferencia indica si
 * el pago exige el código de la transacción (PSE, Nequi y Daviplata sí; Efectivo no).
 */
export function listarMetodosPago() {
  return get('/metodos-pago');
}

/** Tarifa vigente hoy de cada tipo: [{ idTarifa, idTipo, valorHora, vigenteDesde }]. */
export function listarTarifasVigentes() {
  return get('/tarifas/vigente');
}

/** Marcas ordenadas por nombre: [{ idMarca, nombre }]. */
export function listarMarcas() {
  return get('/marcas');
}

/** Modelos: [{ idModelo, idMarca, nombre }]. Filtro opcional: { idMarca }. */
export function listarModelos({ idMarca } = {}) {
  return get('/modelos', { idMarca });
}

/** Agrega una marca (solo el DBA): { nombre } → 201 { idMarca, nombre }; 409 si ya existe. */
export function crearMarca(nombre) {
  return post('/marcas', { nombre });
}

/**
 * Agrega un modelo a una marca (solo el DBA): 201 { idModelo, idMarca, nombre }; 409 si esa
 * marca ya tiene un modelo con ese nombre.
 */
export function crearModelo(idMarca, nombre) {
  return post('/modelos', { idMarca, nombre });
}
