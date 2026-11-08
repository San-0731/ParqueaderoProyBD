package com.parqueadero.model;

import com.google.gson.JsonElement;

import java.time.LocalDateTime;

/**
 * Un cambio auditado (vistas {@code vw_auditoria} y
 * {@code vw_auditoria_operadores}, V008).
 *
 * @param idAuditoria    llave primaria
 * @param fecha          cuándo pasó
 * @param tabla          qué tabla cambió (cliente, vehiculo, espacio, registro_parqueo, pago)
 * @param operacion      INSERT o UPDATE
 * @param idFila         llave de la fila que cambió
 * @param idUsuario      quién lo hizo
 * @param nombreUsuario  su nombre de usuario
 * @param nombreCompleto su nombre
 * @param rol            el rol que tenía cuando lo hizo
 * @param datosAntes     la fila antes (JSON), o {@code null} en un INSERT
 * @param datosDespues   la fila después (JSON)
 */
public record RegistroAuditoria(long idAuditoria, LocalDateTime fecha, String tabla, String operacion,
        long idFila, long idUsuario, String nombreUsuario, String nombreCompleto, String rol,
        JsonElement datosAntes, JsonElement datosDespues) {
}
