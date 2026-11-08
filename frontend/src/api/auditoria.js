import { get } from './cliente.js';

// Registro de auditoría: { idAuditoria, fecha, tabla, operacion, idFila, idUsuario,
// nombreUsuario, nombreCompleto, rol, datosAntes, datosDespues }. datosAntes y datosDespues son
// la fila como objeto (datosAntes es null cuando se creó). Solo administrador y DBA: el
// administrador recibe solo los cambios de los operadores; el DBA, todos.

/**
 * Los cambios auditados, del más reciente al más antiguo.
 * Filtros opcionales: { desde, hasta } ('2026-11-07') y tabla ('vehiculo', 'pago'...).
 */
export function consultarAuditoria({ desde, hasta, tabla } = {}) {
  return get('/auditoria', { desde, hasta, tabla });
}
