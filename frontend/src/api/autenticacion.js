import { get, post } from './cliente.js';

// Usuario: { idUsuario, nombreUsuario, nombreCompleto, rol, activo }
// rol: 'OPERADOR', 'ADMINISTRADOR' o 'DBA' (ver utils/roles.js).

/**
 * Inicia sesión. 200 → { token, usuario }. Si el usuario o la contraseña no son correctos,
 * el backend responde 401 con el mensaje "Usuario o contraseña incorrectos.".
 */
export function iniciarSesion(nombreUsuario, clave) {
  return post('/auth/login', { nombreUsuario, clave });
}

/** Cierra la sesión del token que se envía (204). */
export function cerrarSesion() {
  return post('/auth/logout');
}

/** El usuario de la sesión actual; 401 si la sesión ya no es válida. */
export function consultarUsuarioActual() {
  return get('/auth/yo');
}
