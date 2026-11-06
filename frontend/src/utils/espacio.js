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
