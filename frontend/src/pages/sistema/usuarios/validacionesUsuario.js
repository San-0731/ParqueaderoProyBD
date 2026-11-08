// Reglas de los usuarios, las mismas del backend (UsuarioService y el CHECK de V007), para
// avisar en el formulario antes de enviar. Si cambia una, hay que cambiar la otra.

import { nombreRol } from '../../../utils/roles.js';

export const MAX_NOMBRE_COMPLETO = 100;
export const LARGO_MINIMO_CLAVE = 8;
export const LARGO_MAXIMO_CLAVE = 100;

const FORMATO_NOMBRE_USUARIO = /^[a-z0-9._]{3,30}$/;

/** Opciones del selector de rol, de menos a más permisos. */
export const OPCIONES_ROL = ['OPERADOR', 'ADMINISTRADOR', 'DBA'].map((rol) => ({
  valor: rol,
  texto: nombreRol(rol),
}));

/** Mensaje de error de la contraseña, o undefined si está bien. */
export function errorClave(clave) {
  const largo = clave?.length ?? 0;
  if (largo < LARGO_MINIMO_CLAVE || largo > LARGO_MAXIMO_CLAVE) {
    return `La contraseña debe tener entre ${LARGO_MINIMO_CLAVE} y ${LARGO_MAXIMO_CLAVE} caracteres.`;
  }
  return undefined;
}

/** Errores del nombre completo y el rol (comunes a crear y editar). */
function erroresDatos({ nombreCompleto, rol }) {
  const errores = {};
  const nombre = nombreCompleto.trim();
  if (!nombre) {
    errores.nombreCompleto = 'El nombre completo es obligatorio.';
  } else if (nombre.length > MAX_NOMBRE_COMPLETO) {
    errores.nombreCompleto = `El nombre completo no puede tener más de ${MAX_NOMBRE_COMPLETO} caracteres.`;
  }
  if (!rol) {
    errores.rol = 'Elige un rol.';
  }
  return errores;
}

/** Errores de un usuario nuevo, por campo: { nombreUsuario?, nombreCompleto?, rol?, clave? }. */
export function validarUsuarioNuevo(valores) {
  const errores = erroresDatos(valores);
  if (!FORMATO_NOMBRE_USUARIO.test(valores.nombreUsuario.trim())) {
    errores.nombreUsuario =
      'De 3 a 30 caracteres: minúsculas sin tildes, números, punto o guion bajo.';
  }
  const clave = errorClave(valores.clave);
  if (clave) {
    errores.clave = clave;
  }
  return errores;
}

/** Errores al editar un usuario: { nombreCompleto?, rol? }. */
export function validarCambioUsuario(valores) {
  return erroresDatos(valores);
}
