import { get } from './cliente.js';

/**
 * Estado del servidor y de la base de datos.
 * 200 → { estado: 'OK', baseDatos: 'OK' }. Con MySQL apagado el backend responde 503, y el
 * cliente lo convierte en un ErrorApi con estado 503; si el backend está apagado, estado 0.
 */
export function consultarSalud() {
  return get('/salud');
}
