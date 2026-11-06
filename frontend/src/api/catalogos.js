import { get } from './cliente.js';

// Catálogos de solo lectura: llenan las listas desplegables.

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
