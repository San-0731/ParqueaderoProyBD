// Fechas de calendario como texto "2026-11-06" (el formato de los filtros del backend y de los
// <input type="date">), calculadas con la fecha LOCAL del equipo.
//
// Ojo: no se usa toISOString(), porque da la fecha en UTC. En Bogotá (UTC-5), desde las 7 p. m.
// en UTC ya es el día siguiente y el filtro "hoy" quedaría corrido un día.

const dosDigitos = (numero) => String(numero).padStart(2, '0');

/** Date → "2026-11-06" (fecha local). */
export function fechaLocalIso(fecha) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** "2026-11-06" → Date a las 00:00 locales. */
function aFechaLocal(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Suma (o resta, con n negativo) días: ("2026-11-06", -6) → "2026-10-31". */
export function sumarDias(iso, dias) {
  const fecha = aFechaLocal(iso);
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocalIso(fecha);
}

/** Primer día del mes: "2026-11-06" → "2026-11-01". */
export function inicioDeMes(iso) {
  return `${iso.slice(0, 7)}-01`;
}
