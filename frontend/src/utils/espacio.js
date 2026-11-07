// Cómo se nombra un espacio en pantalla. Lo usan el tablero, la entrada y las pantallas que
// muestran dónde está un vehículo (cualquier objeto con zona, numero y piso sirve: un
// espacio, un registro activo o un detalle de registro).
//
// Nomenclatura (V006): una zona es una letra dentro de un piso, y la misma letra puede
// repetirse en otro piso. Por eso la zona se nombra con la letra seguida del piso (A1 es la
// zona A del piso 1; A2, la del piso 2) y el espacio con zona y número: A1-01.

/** Nombre de la zona: { zona: 'A', piso: '1' } → "A1". */
export function nombreZona({ zona, piso }) {
  return `${zona}${piso}`;
}

/** Código corto que se pinta en el espacio: { zona: 'A', piso: '1', numero: '01' } → "A1-01". */
export function codigoEspacio(espacio) {
  return `${nombreZona(espacio)}-${espacio.numero}`;
}

/** Nombre completo para textos y avisos: "A1-01, piso 1". */
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
