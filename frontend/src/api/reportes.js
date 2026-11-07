import { get } from './cliente.js';

/**
 * Ingresos por la fecha del pago. Filtros opcionales: { desde, hasta } ("2026-10-01").
 * { desde, hasta, cantidadPagos, totalGeneral,
 *   porMetodo: [{ metodoPago, cantidadPagos, totalRecaudado }],
 *   porDia: [{ fecha, cantidadPagos, totalRecaudado }],
 *   detalle: [{ fecha, metodoPago, cantidadPagos, totalRecaudado }] }
 */
export function consultarIngresos({ desde, hasta } = {}) {
  return get('/reportes/ingresos', { desde, hasta });
}

/**
 * Ocupación actual de los espacios por tipo de vehículo:
 * [{ idTipo, tipoVehiculo, total, ocupados, libres, deshabilitados }].
 */
export function consultarOcupacion() {
  return get('/reportes/ocupacion');
}
