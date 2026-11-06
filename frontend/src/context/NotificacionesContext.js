import { createContext, useContext } from 'react';

/** Contexto de los avisos flotantes. Lo provee <ProveedorNotificaciones> (en main.jsx). */
export const NotificacionesContext = createContext(null);

/**
 * Avisos flotantes ("toasts") desde cualquier pantalla:
 *
 *   const { notificarExito, notificarError } = useNotificaciones();
 *   notificarExito('Entrada registrada en el espacio 3.');
 *
 * Los avisos desaparecen solos a los 5 segundos.
 */
export function useNotificaciones() {
  const contexto = useContext(NotificacionesContext);
  if (!contexto) {
    throw new Error('useNotificaciones debe usarse dentro de <ProveedorNotificaciones>.');
  }
  return contexto;
}
