// Reglas del historial: los filtros que viven en la URL, la consulta al backend, el filtro por
// placa, el total y la paginación. Son funciones sin React. Lo del rango de fechas (atajos,
// validación, URL) es compartido con los reportes y está en utils/rangosFechas.js.

import { normalizarIdentificador } from '../../utils/identificador.js';
import { rangoDeAtajo, rangoDesdeUrl, rangoParaUrl } from '../../utils/rangosFechas.js';

export const FILAS_POR_PAGINA = 20;

/** Atajos de fechas del historial, en el orden en que se muestran (ver utils/rangosFechas.js). */
export const ATAJOS_HISTORIAL = ['hoy', '7', '30', 'mes', 'todo'];

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
  const { desde, hasta } = rangoDesdeUrl(parametros, rangoDeAtajo('7', hoy), [
    'identificador',
    'metodo',
  ]);
  const pagina = Number.parseInt(parametros.get('pagina') ?? '1', 10);
  return {
    desde,
    hasta,
    identificador: parametros.get('identificador') ?? '',
    idMetodo: parametros.get('metodo') ?? '',
    pagina: Number.isInteger(pagina) && pagina > 1 ? pagina : 1,
  };
}

/** Los filtros como parámetros de la URL (solo los que tienen valor; sin fechas, todo=1). */
export function filtrosParaUrl({ desde, hasta, identificador, idMetodo, pagina = 1 }) {
  const url = rangoParaUrl({ desde, hasta });
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

/** 1 → "1 parqueo terminado"; 27 → "27 parqueos terminados". */
export function contarParqueos(cantidad) {
  return cantidad === 1 ? '1 parqueo terminado' : `${cantidad} parqueos terminados`;
}
