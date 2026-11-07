// Datos de Sistema → Zonas y espacios: la carga y las reglas de los formularios (las mismas
// del backend, ZonaService). Son funciones sin React.

import { listarTiposVehiculo } from '../../../api/catalogos.js';
import { listarZonas } from '../../../api/zonas.js';
import { codigoEspacio, nombreZona } from '../../../utils/espacio.js';

/** Números de espacio posibles en una zona: del 01 al 99. */
export const MAX_ESPACIOS_POR_ZONA = 99;

/** Zonas y tipos de vehículo, en paralelo. */
export async function cargarZonas() {
  const [zonas, tipos] = await Promise.all([listarZonas(), listarTiposVehiculo()]);
  return { zonas, tipos };
}

/** Nombre de una zona de la API ({ letra, piso }): "A1". */
export function nombreDeZona(zona) {
  return nombreZona({ zona: zona.letra, piso: zona.piso });
}

/** Último número de la zona como número (0 si no tiene espacios). */
export function ultimoNumero(zona) {
  return zona.ultimoNumero ? Number(zona.ultimoNumero) : 0;
}

/** Cuántos espacios más le caben a la zona. */
export function espaciosDisponibles(zona) {
  return MAX_ESPACIOS_POR_ZONA - ultimoNumero(zona);
}

/**
 * Rango de códigos de los espacios que se crearían: "A1-09 a A1-11" (o "A1-09" si es uno).
 */
export function rangoNuevos(zona, cantidad) {
  const codigo = (numero) =>
    codigoEspacio({ zona: zona.letra, piso: zona.piso, numero: String(numero).padStart(2, '0') });
  const primero = ultimoNumero(zona) + 1;
  const ultimo = ultimoNumero(zona) + cantidad;
  return cantidad === 1 ? codigo(primero) : `${codigo(primero)} a ${codigo(ultimo)}`;
}

/** Rango de los espacios que ya tiene: "01 a 08", o null si no tiene. */
export function rangoActual(zona) {
  return zona.espacios > 0 ? `01 a ${zona.ultimoNumero}` : null;
}

/** El piso como lo guarda el backend ("03" → "3"), o null si no es un número del 1 al 99. */
export function normalizarPiso(texto) {
  const limpio = String(texto ?? '').trim();
  if (!/^\d{1,2}$/.test(limpio)) {
    return null;
  }
  const numero = Number(limpio);
  return numero >= 1 && numero <= 99 ? String(numero) : null;
}

/** Errores de una zona nueva, por campo: { piso?, letra?, idTipo? }. */
export function validarZonaNueva({ piso, letra, idTipo }) {
  const errores = {};
  if (!normalizarPiso(piso)) {
    errores.piso = 'Escribe un número del 1 al 99.';
  }
  if (!/^[A-Za-z]$/.test(letra.trim())) {
    errores.letra = 'Una sola letra de la A a la Z (sin Ñ).';
  }
  if (!idTipo) {
    errores.idTipo = 'Elige el tipo de vehículo.';
  }
  return errores;
}

/** Error de la cantidad de espacios a agregar, o undefined si está bien. */
export function errorCantidad(texto, zona) {
  const disponibles = espaciosDisponibles(zona);
  const cantidad = Number(texto);
  if (!/^\d+$/.test(String(texto).trim()) || cantidad < 1) {
    return 'Escribe cuántos espacios agregar (1 o más).';
  }
  if (cantidad > disponibles) {
    return `A esta zona solo le caben ${disponibles} espacios más (el último número es el ${MAX_ESPACIOS_POR_ZONA}).`;
  }
  return undefined;
}
