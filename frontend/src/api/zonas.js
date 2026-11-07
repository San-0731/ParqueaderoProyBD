import { get, post } from './cliente.js';

// Zona: { idZona, piso, letra, idTipo, tipoVehiculo, espacios, ultimoNumero }
// En pantalla se nombra con la letra y el piso: { letra: 'A', piso: '1' } es la zona A1.
// ultimoNumero es el número más alto de sus espacios ('08'), o null si no tiene.

/** Todas las zonas, por piso y letra, con cuántos espacios tiene cada una. */
export function listarZonas() {
  return get('/zonas');
}

/**
 * Crea una zona sin espacios (solo el DBA): { piso, letra, idTipo }. Si el piso no tenía
 * zonas, así aparece el piso nuevo. 409 si ese piso ya tiene esa letra.
 */
export function crearZona(datos) {
  return post('/zonas', datos);
}

/**
 * Agrega `cantidad` espacios a la zona (solo el DBA), con los números siguientes al último.
 * 201 → los espacios creados; 409 si se pasaría del espacio 99.
 */
export function agregarEspaciosAZona(idZona, cantidad) {
  return post(`/zonas/${encodeURIComponent(idZona)}/espacios`, { cantidad });
}
