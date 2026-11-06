// Identificador del vehículo: placa (carros, motos, camiones) o código (bicicletas).
// Misma regla que el backend (Identificadores.normalizar) y el trigger
// trg_vehiculo_normalizar_*: sin espacios ni guiones y en mayúsculas.
// El frontend lo usa para mostrar y avisar mientras se escribe; la base sigue decidiendo.

/** Igual que la columna vehiculo.identificador VARCHAR(40) y el servicio del backend. */
export const MAX_IDENTIFICADOR = 40;

/** Igual que el CHECK chk_vehiculo_identificador_formato de la base. */
const PATRON_IDENTIFICADOR = /^[A-Z0-9]+$/;

/** " abc-123 " → "ABC123". Con null o undefined devuelve "". */
export function normalizarIdentificador(texto) {
  return (texto ?? '').replaceAll(' ', '').replaceAll('-', '').toUpperCase();
}

/**
 * Valida el identificador ya normalizado con las mismas reglas del backend.
 *
 * @returns null si es válido; si no, el mismo mensaje que daría el backend
 */
export function validarIdentificador(texto) {
  const identificador = normalizarIdentificador(texto);
  if (identificador === '') {
    return 'El identificador (placa o código) del vehículo es obligatorio.';
  }
  if (identificador.length > MAX_IDENTIFICADOR) {
    return `El identificador no puede tener más de ${MAX_IDENTIFICADOR} caracteres.`;
  }
  if (!PATRON_IDENTIFICADOR.test(identificador)) {
    return 'La placa o código solo puede tener letras de la A a la Z y números.';
  }
  return null;
}
