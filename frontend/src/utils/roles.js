// Roles de la aplicación. La regla es la misma del backend (model/Rol.java): los roles son
// jerárquicos y cada uno puede todo lo del anterior. Si se cambia una, hay que cambiar la otra.
//
// Ocultar un botón o una pestaña según el rol es solo comodidad: quien protege de verdad es el
// backend, que responde 403 aunque alguien llame a la API sin pasar por la pantalla.

/** Nivel de cada rol: a mayor nivel, más permisos. */
const NIVEL = { OPERADOR: 1, ADMINISTRADOR: 2, DBA: 3 };

/** Nombre para mostrar de cada rol. */
const NOMBRE = { OPERADOR: 'Operador', ADMINISTRADOR: 'Administrador', DBA: 'DBA' };

/**
 * Si el rol tiene al menos los permisos de `minimo`.
 * alcanza('DBA', 'ADMINISTRADOR') → true; alcanza('OPERADOR', 'ADMINISTRADOR') → false.
 * Un rol desconocido (o sin sesión) nunca alcanza.
 */
export function alcanza(rol, minimo) {
  return (NIVEL[rol] ?? 0) >= NIVEL[minimo];
}

/** "Administrador" para 'ADMINISTRADOR'. */
export function nombreRol(rol) {
  return NOMBRE[rol] ?? rol;
}
