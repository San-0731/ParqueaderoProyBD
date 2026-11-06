/**
 * Ids de la ayuda y del error de un campo, y el valor de aria-describedby que los une.
 * Así un lector de pantalla lee la ayuda y el error al entrar al campo.
 */
export function idsDescripcion(idCampo, ayuda, error) {
  const idAyuda = `${idCampo}-ayuda`;
  const idError = `${idCampo}-error`;
  const describe = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ');
  return { idAyuda, idError, describe: describe || undefined };
}
