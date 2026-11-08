package com.parqueadero.model;

/**
 * Respuesta de {@code POST /api/auth/login}: el token de la sesión y el
 * usuario. El frontend guarda el token y lo envía en cada petición con la
 * cabecera {@code Authorization: Bearer <token>}.
 *
 * @param token   token de la sesión (en la base solo queda su hash)
 * @param usuario quién inició sesión
 */
public record SesionIniciada(String token, Usuario usuario) {
}
