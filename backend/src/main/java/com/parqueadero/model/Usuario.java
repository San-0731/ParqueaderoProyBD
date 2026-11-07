package com.parqueadero.model;

/**
 * Usuario de la aplicación (tabla {@code usuario}, V007), tal como se le
 * muestra al frontend. A propósito NO tiene la contraseña ni su hash: este
 * objeto se convierte a JSON en las respuestas.
 *
 * @param idUsuario      llave primaria
 * @param nombreUsuario  con lo que inicia sesión (por ejemplo, {@code ana.perez})
 * @param nombreCompleto nombre para mostrar
 * @param rol            su rol
 * @param activo         si puede iniciar sesión
 */
public record Usuario(long idUsuario, String nombreUsuario, String nombreCompleto, Rol rol,
        boolean activo) {
}
