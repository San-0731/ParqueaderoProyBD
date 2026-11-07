import { get, patch } from './cliente.js';

// Espacio: { idEspacio, idTipo, piso, zona, numero, habilitado, ocupado, disponible }
// habilitado = en servicio; ocupado = tiene un parqueo ACTIVO;
// disponible = habilitado y libre (se puede parquear ahí ahora).

/**
 * Lista los espacios ordenados por piso, zona y número.
 * Filtros opcionales: { idTipo, disponible } (disponible: true o false).
 */
export function listarEspacios({ idTipo, disponible } = {}) {
  return get('/espacios', { idTipo, disponible });
}

/** Un espacio por su id (404 si no existe). */
export function obtenerEspacio(idEspacio) {
  return get(`/espacios/${encodeURIComponent(idEspacio)}`);
}

/**
 * Habilita o deshabilita un espacio. Deshabilitar uno ocupado está permitido: el vehículo
 * termina su parqueo normalmente. Devuelve el espacio actualizado.
 */
export function cambiarHabilitadoEspacio(idEspacio, habilitado) {
  return patch(`/espacios/${encodeURIComponent(idEspacio)}/habilitado`, { habilitado });
}
