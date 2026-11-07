// Cómo se nombra un espacio en pantalla. Lo usan el tablero, la entrada y las pantallas que
// muestran dónde está un vehículo (cualquier objeto con zona, numero y piso sirve: un
// espacio, un registro activo o un detalle de registro).

/** Código corto que se pinta en el espacio: { zona: 'A', numero: '01' } → "A-01". */
export function codigoEspacio({ zona, numero }) {
  return `${zona}-${numero}`;
}

/** Nombre completo para textos y avisos: "A-01, piso 1". */
export function nombreEspacio(espacio) {
  return `${codigoEspacio(espacio)}, piso ${espacio.piso}`;
}

/**
 * Estado de un espacio (tablero y administración de espacios), con la misma regla del reporte
 * de ocupación:
 * - "ocupado" si tiene un vehículo adentro, aunque esté deshabilitado (el vehículo termina su
 *   parqueo normalmente y hay que poder registrarle la salida);
 * - "deshabilitado" si está fuera de servicio y vacío;
 * - "libre" en cualquier otro caso.
 *
 * @param registro el parqueo activo de ese espacio, si llegó en /registros/activos
 */
export function estadoEspacio(espacio, registro) {
  if (espacio.ocupado || registro) {
    return 'ocupado';
  }
  return espacio.habilitado ? 'libre' : 'deshabilitado';
}
