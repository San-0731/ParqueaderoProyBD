import { useCallback, useEffect, useState } from 'react';

/**
 * Ejecuta una consulta a la API al montar el componente y entrega su estado:
 * { datos, cargando, error, recargar }.
 *
 * Uso:
 *   // Sin parámetros: se pasa la función de la API directamente.
 *   const { datos, cargando, error, recargar } = useConsulta(listarTiposVehiculo);
 *
 *   // Con parámetros: la función se memoriza con useCallback. Cuando cambia idTipo,
 *   // cambia la función y se vuelve a consultar.
 *   const consulta = useCallback(() => listarEspacios({ idTipo }), [idTipo]);
 *   const { datos } = useConsulta(consulta);
 *
 * Detalles:
 * - Mientras se recarga se conservan los datos anteriores (la actualización automática no
 *   hace parpadear la pantalla); la pantalla muestra "Cargando" solo si aún no hay datos.
 * - Si la consulta falla, datos queda en null y error tiene el ErrorApi.
 * - Si el componente se desmonta o llega una consulta más nueva, la respuesta vieja se
 *   descarta (bandera "vigente").
 *
 * @param consulta función sin argumentos que devuelve una promesa (las de src/api/)
 */
export function useConsulta(consulta) {
  // Cada llamada a recargar() suma 1 y eso vuelve a ejecutar el efecto.
  const [recargas, setRecargas] = useState(0);

  // Resultado de la última respuesta, junto con la consulta y la recarga a la que
  // corresponde. Así "cargando" se calcula en vez de guardarse: no hay que cambiar el
  // estado al empezar la consulta (la regla set-state-in-effect de ESLint lo prohíbe).
  const [resultado, setResultado] = useState({
    consulta: null,
    recargas: -1,
    datos: null,
    error: null,
  });

  useEffect(() => {
    let vigente = true;
    // Promise.resolve().then(...) también atrapa los errores que se lancen antes de
    // devolver la promesa (por ejemplo, si falta VITE_API_URL).
    Promise.resolve()
      .then(() => consulta())
      .then(
        (datos) => {
          if (vigente) {
            setResultado({ consulta, recargas, datos, error: null });
          }
        },
        (error) => {
          if (vigente) {
            setResultado({ consulta, recargas, datos: null, error });
          }
        },
      );
    // Limpieza: se ejecuta al desmontar o antes de la siguiente consulta.
    return () => {
      vigente = false;
    };
  }, [consulta, recargas]);

  const recargar = useCallback(() => setRecargas((anterior) => anterior + 1), []);

  // Está cargando mientras el resultado guardado no sea el de la consulta y recarga actuales.
  const cargando = resultado.consulta !== consulta || resultado.recargas !== recargas;

  return {
    datos: resultado.datos,
    cargando,
    error: cargando ? null : resultado.error,
    recargar,
  };
}
