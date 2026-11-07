import { useCallback, useEffect, useMemo, useState } from 'react';
import * as apiAutenticacion from '../api/autenticacion.js';
import { alPerderSesion } from '../api/cliente.js';
import { borrarSesionGuardada, guardarSesion, leerSesionGuardada } from '../api/sesionGuardada.js';
import { alcanza } from '../utils/roles.js';
import { SesionContext } from './SesionContext.js';

/** Aviso de la pantalla de inicio cuando el backend rechazó la sesión. */
export const AVISO_SESION_TERMINADA = 'Tu sesión terminó. Inicia sesión de nuevo.';

/**
 * Guarda quién inició sesión y lo comparte con toda la app (useSesion()).
 *
 * - Al cargar, si hay una sesión guardada (la pestaña se recargó), la usa de inmediato y le
 *   pregunta al backend (/auth/yo) si sigue vigente; así también se actualiza el rol si el DBA
 *   lo cambió. Si el backend responde 401, la cierra. Si el backend no responde, la conserva:
 *   cada pantalla mostrará su propio error de conexión.
 * - Si cualquier petición recibe 401, la sesión se cierra con un aviso (alPerderSesion).
 */
function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);
  const [aviso, setAviso] = useState(null);

  const terminar = useCallback((motivo) => {
    borrarSesionGuardada();
    setSesion(null);
    setAviso(motivo);
  }, []);

  // El backend rechazó el token en alguna petición: la sesión ya no sirve.
  useEffect(() => alPerderSesion(() => terminar(AVISO_SESION_TERMINADA)), [terminar]);

  // Al cargar con una sesión guardada, se confirma con el backend (una sola vez).
  useEffect(() => {
    const guardada = leerSesionGuardada();
    if (!guardada) {
      return;
    }
    let vigente = true;
    apiAutenticacion
      .consultarUsuarioActual()
      .then((usuario) => {
        if (vigente) {
          const actualizada = { ...guardada, usuario };
          guardarSesion(actualizada);
          setSesion(actualizada);
        }
      })
      .catch(() => {
        // Un 401 ya lo atendió alPerderSesion; cualquier otro error (backend apagado) deja la
        // sesión como estaba.
      });
    return () => {
      vigente = false;
    };
  }, []);

  const iniciarSesion = useCallback(async (nombreUsuario, clave) => {
    const nueva = await apiAutenticacion.iniciarSesion(nombreUsuario, clave);
    guardarSesion(nueva);
    setSesion(nueva);
    setAviso(null);
    return nueva.usuario;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await apiAutenticacion.cerrarSesion();
    } catch {
      // Aunque el backend no responda, en este navegador la sesión se cierra igual.
    }
    terminar(null);
  }, [terminar]);

  const valor = useMemo(() => {
    const usuario = sesion?.usuario ?? null;
    return {
      estado: usuario ? 'con-sesion' : 'sin-sesion',
      usuario,
      aviso,
      puede: (minimo) => alcanza(usuario?.rol, minimo),
      iniciarSesion,
      cerrarSesion,
    };
  }, [sesion, aviso, iniciarSesion, cerrarSesion]);

  return <SesionContext value={valor}>{children}</SesionContext>;
}

export default ProveedorSesion;
