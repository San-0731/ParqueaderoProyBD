import { useEffect, useEffectEvent } from 'react';

/**
 * Ejecuta una función cada cierto tiempo mientras el componente esté en pantalla.
 *
 * Uso:
 *   // Recargar el tablero cada 30 segundos.
 *   useIntervalo(() => recargar(), 30_000);
 *
 * Detalles:
 * - useEffectEvent hace que el intervalo use siempre la versión más reciente de la función
 *   sin reiniciar el reloj cada vez que el componente se vuelve a dibujar.
 * - Al desmontar el componente, el intervalo se detiene (clearInterval).
 * - Con milisegundos null el intervalo queda en pausa.
 *
 * @param alCumplirse función que se llama en cada vuelta
 * @param milisegundos cada cuánto se llama, o null para no llamarla
 */
export function useIntervalo(alCumplirse, milisegundos) {
  const cumplido = useEffectEvent(alCumplirse);

  useEffect(() => {
    if (milisegundos === null) {
      return undefined;
    }
    const intervalo = setInterval(() => cumplido(), milisegundos);
    return () => clearInterval(intervalo);
  }, [milisegundos]);
}
