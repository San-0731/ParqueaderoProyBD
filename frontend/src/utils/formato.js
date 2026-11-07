// Formato colombiano para mostrar datos en pantalla: pesos, fechas, horas y duraciones.
// Los valores nulos o inválidos se muestran como SIN_DATO (por ejemplo, la salida de un
// parqueo que sigue activo).

export const SIN_DATO = '—';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

// Acepta "2026-11-03" o "2026-11-03T14:30" con segundos opcionales.
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/;

/**
 * Convierte el texto que envía el backend en un Date con la hora local.
 *
 * El backend envía la hora de Bogotá sin zona horaria ("2026-11-03T14:30:00") y las
 * fechas solas como "2026-10-01". No se usa new Date(texto) porque JavaScript interpreta
 * una fecha sola como medianoche UTC: en Colombia (UTC-5) "2026-10-01" se mostraría como
 * 30/09/2026. Leyendo las partes a mano, la fecha y la hora quedan tal cual llegaron.
 */
function aFecha(iso) {
  if (typeof iso !== 'string') {
    return null;
  }
  const partes = PATRON_FECHA.exec(iso);
  if (!partes) {
    return null;
  }
  const [anio, mes, dia, hora, minuto, segundo] = partes
    .slice(1)
    .map((parte) => Number(parte ?? 0));
  // En Date los meses van de 0 (enero) a 11 (diciembre).
  return new Date(anio, mes - 1, dia, hora, minuto, segundo);
}

/** 12500 → "$ 12.500". Acepta números o texto numérico ("5000.00"). */
export function formatearPesos(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return SIN_DATO;
  }
  const numero = Number(valor);
  return Number.isFinite(numero) ? formatoPesos.format(numero) : SIN_DATO;
}

/** "2026-11-03" o "2026-11-03T14:30:00" → "03/11/2026". */
export function formatearFecha(iso) {
  const fecha = aFecha(iso);
  return fecha ? formatoFecha.format(fecha) : SIN_DATO;
}

/**
 * "2026-11-03T14:30:00" → "03/11/2026 2:30 p. m.". Se unen dos formatos porque el formato
 * combinado de Intl pone una coma entre la fecha y la hora.
 */
export function formatearFechaHora(iso) {
  const fecha = aFecha(iso);
  return fecha ? `${formatoFecha.format(fecha)} ${formatoHora.format(fecha)}` : SIN_DATO;
}

/**
 * Solo la hora: "2026-11-03T15:45:00" → "3:45 p. m.". También acepta un Date (por ejemplo,
 * la hora en que se actualizó una pantalla).
 */
export function formatearHora(valor) {
  const fecha = valor instanceof Date ? valor : aFecha(valor);
  return fecha && !Number.isNaN(fecha.getTime()) ? formatoHora.format(fecha) : SIN_DATO;
}

/** 135 → "2 h 15 min"; 60 → "1 h"; 59 → "59 min". */
export function formatearDuracion(minutos) {
  if (minutos === null || minutos === undefined || !Number.isFinite(Number(minutos))) {
    return SIN_DATO;
  }
  const total = Math.max(0, Math.floor(Number(minutos)));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) {
    return `${resto} min`;
  }
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
