// Reglas del historial: los filtros que viven en la URL, los atajos de fechas, la consulta al
// backend, el filtro por placa, el total y la paginación. Son funciones sin React.

import { fechaLocalIso, inicioDeMes, sumarDias } from '../../utils/fechas.js';
import { formatearFecha } from '../../utils/formato.js';
import { normalizarIdentificador } from '../../utils/identificador.js';

export const FILAS_POR_PAGINA = 20;

// Parámetros de la URL que cuentan como "hay un filtro elegido".
const CLAVES_FILTRO = ['desde', 'hasta', 'identificador', 'metodo', 'todo'];

/** Atajos de fechas, en el orden en que se muestran. */
export const ATAJOS = [
  { clave: 'hoy', texto: 'Hoy' },
  { clave: '7', texto: '7 días' },
  { clave: '30', texto: '30 días' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'todo', texto: 'Todo' },
];

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
 * Lee los filtros de la URL. La URL es la única fuente: así se pueden compartir y sobreviven a
 * recargar la página.
 * - Sin ningún filtro (URL vacía): los últimos 7 días.
 * - Con algún filtro (por ejemplo, solo ?identificador=KLM234, el enlace de la ficha del
 *   vehículo, o ?todo=1): las fechas que no estén quedan sin límite.
 *
 * @returns { desde, hasta, identificador, idMetodo, pagina } (textos; pagina es un número ≥ 1)
 */
export function filtrosDesdeUrl(parametros, hoy) {
  const sinFiltros = !CLAVES_FILTRO.some((clave) => parametros.has(clave));
  const porDefecto = sinFiltros ? rangoDeAtajo('7', hoy) : rangoDeAtajo('todo', hoy);
  const pagina = Number.parseInt(parametros.get('pagina') ?? '1', 10);
  return {
    desde: parametros.get('desde') ?? porDefecto.desde,
    hasta: parametros.get('hasta') ?? porDefecto.hasta,
    identificador: parametros.get('identificador') ?? '',
    idMetodo: parametros.get('metodo') ?? '',
    pagina: Number.isInteger(pagina) && pagina > 1 ? pagina : 1,
  };
}

/**
 * Los filtros como parámetros de la URL (solo los que tienen valor). Sin fechas se escribe
 * todo=1, para no confundirlo con la URL vacía (que significa "últimos 7 días").
 */
export function filtrosParaUrl({ desde, hasta, identificador, idMetodo, pagina = 1 }) {
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
  if (identificador) {
    url.identificador = identificador;
  }
  if (idMetodo) {
    url.metodo = idMetodo;
  }
  if (pagina > 1) {
    url.pagina = String(pagina);
  }
  return url;
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

/**
 * Parámetros para listarHistorial: las fechas y el método. La placa NO se envía: el backend
 * solo busca la placa exacta y aquí se filtra por parte de ella (filtrarPorPlaca).
 */
export function consultaParaApi({ desde, hasta, idMetodo }) {
  const consulta = {};
  if (desde) {
    consulta.desde = desde;
  }
  if (hasta) {
    consulta.hasta = hasta;
  }
  if (idMetodo) {
    consulta.idMetodoPago = Number(idMetodo);
  }
  return consulta;
}

/** Filtra por parte de la placa: "klm-2" encuentra KLM234. */
export function filtrarPorPlaca(filas, texto) {
  const buscado = normalizarIdentificador(texto);
  if (buscado === '') {
    return filas;
  }
  return filas.filter((fila) => fila.identificador.includes(buscado));
}

/** Suma del valor de los parqueos (todos los resultados, no solo la página visible). */
export function totalValor(filas) {
  return filas.reduce((suma, fila) => suma + Number(fila.valorTotal ?? 0), 0);
}

/**
 * Las filas de una página. Si la página pedida no existe (por ejemplo, ?pagina=9 con 2
 * páginas), se ajusta a la más cercana.
 *
 * @returns { filas, pagina, totalPaginas }
 */
export function paginar(filas, pagina, porPagina = FILAS_POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(filas.length / porPagina));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * porPagina;
  return { filas: filas.slice(inicio, inicio + porPagina), pagina: actual, totalPaginas };
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

/** 1 → "1 parqueo terminado"; 27 → "27 parqueos terminados". */
export function contarParqueos(cantidad) {
  return cantidad === 1 ? '1 parqueo terminado' : `${cantidad} parqueos terminados`;
}
