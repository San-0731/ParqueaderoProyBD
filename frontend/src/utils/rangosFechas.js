// Rango de fechas de los filtros (historial y reportes): los atajos ("Este mes", "7 días"...),
// la validación y cómo se guarda en la URL. Las fechas son textos "2026-11-06" en hora local.

import { fechaLocalIso, inicioDeMes, sumarDias } from './fechas.js';
import { formatearFecha } from './formato.js';

/** Texto de cada atajo. Cada pantalla elige cuáles muestra y en qué orden. */
export const ATAJOS = {
  hoy: 'Hoy',
  7: '7 días',
  30: '30 días',
  mes: 'Este mes',
  mesAnterior: 'Mes anterior',
  todo: 'Todo',
};

/** "Hoy" como texto "2026-11-06", con la fecha local del equipo. */
export function hoyIso() {
  return fechaLocalIso(new Date());
}

/**
 * Fechas de un atajo, contando el día de hoy: "7" va de hace 6 días a hoy (7 días en total).
 * "todo" es sin fechas.
 */
export function rangoDeAtajo(clave, hoy) {
  switch (clave) {
    case 'hoy':
      return { desde: hoy, hasta: hoy };
    case '7':
      return { desde: sumarDias(hoy, -6), hasta: hoy };
    case '30':
      return { desde: sumarDias(hoy, -29), hasta: hoy };
    case 'mes':
      return { desde: inicioDeMes(hoy), hasta: hoy };
    case 'mesAnterior': {
      // El último día del mes anterior es el día antes del 1 de este mes.
      const finAnterior = sumarDias(inicioDeMes(hoy), -1);
      return { desde: inicioDeMes(finAnterior), hasta: finAnterior };
    }
    default:
      return { desde: '', hasta: '' };
  }
}

/** true si las fechas elegidas son las del atajo (puede haber dos a la vez, como hoy y mes el día 1). */
export function esAtajoActivo(clave, { desde, hasta }, hoy) {
  const rango = rangoDeAtajo(clave, hoy);
  return rango.desde === desde && rango.hasta === hasta;
}

/**
 * Revisa el rango antes de consultar, con el mismo mensaje del backend.
 *
 * @returns null si es válido; si no, el mensaje
 */
export function validarRango(desde, hasta) {
  if (desde && hasta && desde > hasta) {
    return (
      `La fecha 'desde' (${formatearFecha(desde)}) no puede ser posterior a la fecha ` +
      `'hasta' (${formatearFecha(hasta)}).`
    );
  }
  return null;
}

/** "entre el 31/10/2026 y el 06/11/2026", "desde el …", "hasta el …" o "" (sin fechas). */
export function describirRango({ desde, hasta }) {
  if (desde && hasta) {
    return `entre el ${formatearFecha(desde)} y el ${formatearFecha(hasta)}`;
  }
  if (desde) {
    return `desde el ${formatearFecha(desde)}`;
  }
  if (hasta) {
    return `hasta el ${formatearFecha(hasta)}`;
  }
  return '';
}

/**
 * Lee el rango de la URL.
 * - Sin ningún filtro en la URL: el rango por defecto de la pantalla.
 * - Con algún filtro (?todo=1, o uno propio de la pantalla como ?identificador=): las fechas
 *   que no estén quedan sin límite.
 *
 * @param porDefecto { desde, hasta } para la URL vacía
 * @param otrasClaves otros parámetros de la pantalla que también cuentan como "hay filtros"
 */
export function rangoDesdeUrl(parametros, porDefecto, otrasClaves = []) {
  const claves = ['desde', 'hasta', 'todo', ...otrasClaves];
  const sinFiltros = !claves.some((clave) => parametros.has(clave));
  const base = sinFiltros ? porDefecto : { desde: '', hasta: '' };
  return {
    desde: parametros.get('desde') ?? base.desde,
    hasta: parametros.get('hasta') ?? base.hasta,
  };
}

/**
 * El rango como parámetros de la URL. Sin fechas se escribe todo=1, para no confundirlo con la
 * URL vacía (que significa "el rango por defecto").
 */
export function rangoParaUrl({ desde, hasta }) {
  const url = {};
  if (desde) {
    url.desde = desde;
  }
  if (hasta) {
    url.hasta = hasta;
  }
  if (!desde && !hasta) {
    url.todo = '1';
  }
  return url;
}
