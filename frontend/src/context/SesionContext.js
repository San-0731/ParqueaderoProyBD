import { createContext, useContext } from 'react';

/** Contexto de la sesión. Lo provee <ProveedorSesion> (en main.jsx). */
export const SesionContext = createContext(null);

/**
 * La sesión desde cualquier pantalla:
 *
 *   const { usuario, puede, cerrarSesion } = useSesion();
 *   if (puede('ADMINISTRADOR')) { ... }
 *
 * - estado: 'sin-sesion' o 'con-sesion'.
 * - usuario: { idUsuario, nombreUsuario, nombreCompleto, rol } o null.
 * - puede(minimo): si el rol del usuario alcanza ese rol (utils/roles.js).
 * - aviso: por qué se cerró la sesión sin que el usuario lo pidiera (para la pantalla de inicio).
 * - iniciarSesion(nombreUsuario, clave), cerrarSesion().
 */
export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de <ProveedorSesion>.');
  }
  return contexto;
}
