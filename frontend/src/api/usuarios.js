import { get, post, put } from './cliente.js';

// Usuario: { idUsuario, nombreUsuario, nombreCompleto, rol, activo }. Todas estas rutas son
// solo para el DBA (el backend responde 403 a los demás).

/** Todos los usuarios: activos primero, por rol y por nombre de usuario. */
export function listarUsuarios() {
  return get('/usuarios');
}

/**
 * Crea un usuario activo: { nombreUsuario, nombreCompleto, rol, clave }. 201 → el usuario;
 * 409 si el nombre de usuario ya existe.
 */
export function crearUsuario(datos) {
  return post('/usuarios', datos);
}

/**
 * Cambia { nombreCompleto, rol, activo } (el nombre de usuario no se cambia). 409 si el
 * sistema se quedaría sin ningún DBA activo.
 */
export function actualizarUsuario(idUsuario, datos) {
  return put(`/usuarios/${encodeURIComponent(idUsuario)}`, datos);
}

/** Pone una contraseña nueva y cierra todas las sesiones de ese usuario (204). */
export function cambiarClaveUsuario(idUsuario, clave) {
  return put(`/usuarios/${encodeURIComponent(idUsuario)}/clave`, { clave });
}
