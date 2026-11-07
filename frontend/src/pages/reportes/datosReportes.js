// Reglas de los reportes: las tarjetas por método, la serie del gráfico por día y la altura de
// cada barra. Son funciones sin React. Los totales los calcula el backend; aquí solo se
// ordenan y se reparten para dibujarlos.

import { sumarDias } from '../../utils/fechas.js';

/** Atajos de fechas de los reportes, en el orden en que se muestran (ver utils/rangosFechas.js). */
export const ATAJOS_REPORTES = ['mes', 'mesAnterior', '7', '30', 'todo'];

/** Hasta cuántos días se dibujan todos (con ceros); con más, solo los días con pagos. */
export const MAXIMO_DIAS_CONTINUOS = 62;

/** Qué parte del total es un valor, en porcentaje entero: (4000, 15000) → 27. */
export function porcentaje(parte, total) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/**
 * Una tarjeta por cada método del catálogo (en su orden), incluso los que no tuvieron pagos en
 * el rango (quedan en $ 0): así el diseño no cambia según las fechas. Si el reporte trae un
 * método que no está en el catálogo, se agrega al final.
 *
 * @param metodos catálogo [{ idMetodo, nombre }]
 * @param porMetodo del reporte [{ metodoPago, cantidadPagos, totalRecaudado }]
 * @param totalGeneral total del reporte, para el porcentaje
 * @returns [{ nombre, total, cantidad, porcentaje }]
 */
export function ingresosPorMetodo(metodos, porMetodo, totalGeneral) {
  const porNombre = new Map(porMetodo.map((fila) => [fila.metodoPago, fila]));
  const nombres = [
    ...metodos.map((metodo) => metodo.nombre),
    ...porMetodo
      .map((fila) => fila.metodoPago)
      .filter((nombre) => !metodos.some((m) => m.nombre === nombre)),
  ];
  return nombres.map((nombre) => {
    const fila = porNombre.get(nombre);
    const total = Number(fila?.totalRecaudado ?? 0);
    return {
      nombre,
      total,
      cantidad: fila?.cantidadPagos ?? 0,
      porcentaje: porcentaje(total, Number(totalGeneral)),
    };
  });
}

/** Cantidad de días entre dos fechas, contando ambas: ("2026-10-01", "2026-10-31") → 31. */
export function diasDelRango(desde, hasta) {
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

/**
 * Los días que dibuja el gráfico: [{ fecha, total, cantidad }].
 * - Con las dos fechas y hasta 62 días: TODOS los días del rango; los que no tuvieron pagos
 *   van en cero (así se ve el ritmo real, con sus huecos).
 * - Sin fechas o con un rango más largo: solo los días con pagos (serían demasiadas barras).
 *
 * @param porDia del reporte [{ fecha, cantidadPagos, totalRecaudado }], solo días con pagos
 */
export function serieDiaria(porDia, desde, hasta) {
  const deDia = (fila) => ({
    fecha: fila.fecha,
    total: Number(fila.totalRecaudado),
    cantidad: fila.cantidadPagos,
  });
  if (!desde || !hasta || desde > hasta || diasDelRango(desde, hasta) > MAXIMO_DIAS_CONTINUOS) {
    return porDia.map(deDia);
  }
  const porFecha = new Map(porDia.map((fila) => [fila.fecha, deDia(fila)]));
  const serie = [];
  for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
    serie.push(porFecha.get(fecha) ?? { fecha, total: 0, cantidad: 0 });
  }
  return serie;
}

/** Valor más alto de la serie (0 si está vacía o todo es 0). */
export function maximoDeSerie(serie) {
  return serie.reduce((maximo, dia) => Math.max(maximo, dia.total), 0);
}

/**
 * Altura de una barra en porcentaje del día más alto: (65000, 130000) → 50. Es proporcional;
 * con el máximo en 0 todas miden 0.
 */
export function alturaRelativa(valor, maximo) {
  return maximo > 0 ? (valor / maximo) * 100 : 0;
}

/** Ancho de cada parte de la barra de ocupación de un tipo, en porcentaje de su total. */
export function partesOcupacion({ total, ocupados, libres, deshabilitados }) {
  const parte = (cantidad) => (total > 0 ? (cantidad / total) * 100 : 0);
  return {
    ocupados: parte(ocupados),
    libres: parte(libres),
    deshabilitados: parte(deshabilitados),
  };
}
