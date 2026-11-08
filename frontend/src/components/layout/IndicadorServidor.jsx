import { CircleCheck, DatabaseZap, LoaderCircle, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { consultarSalud } from '../../api/salud.js';

/** Cada cuánto se vuelve a comprobar el servidor cuando ya respondió (o ya se dio por caído). */
const INTERVALO_MS = 30_000;
/** Mientras se espera a que el servidor despierte, cada cuánto se reintenta. */
const REINTENTO_MS = 5_000;
/** Cuánto se espera a que el servidor despierte antes de mostrar "Sin conexión". */
const ESPERA_MAXIMA_MS = 90_000;

// Cada estado tiene un ícono distinto (no solo un color): en celular solo se ve el ícono.
const ESTADOS = {
  conectando: {
    texto: 'Conectando con el servidor… puede tardar hasta un minuto',
    icono: LoaderCircle,
    clases: 'bg-espera-claro text-espera',
  },
  conectado: { texto: 'Conectado', icono: CircleCheck, clases: 'bg-libre-claro text-libre' },
  sinConexion: { texto: 'Sin conexión', icono: Unplug, clases: 'bg-ocupado-claro text-ocupado' },
  sinBaseDatos: {
    texto: 'Sin base de datos',
    icono: DatabaseZap,
    clases: 'bg-ocupado-claro text-ocupado',
  },
};

/**
 * Muestra si el backend responde, consultando GET /api/salud:
 * - mientras no responde, "Conectando con el servidor…" (ámbar) y reintenta cada 5 s: en
 *   producción el backend gratuito de Render se apaga sin uso y tarda cerca de un minuto en
 *   despertar, así que al principio no es un error;
 * - responde 200 → "Conectado"; responde 503 (backend encendido, MySQL no) → "Sin base de datos";
 * - si pasan 90 s sin respuesta → "Sin conexión" (rojo).
 * Después de una respuesta (o de dar el servidor por caído) vuelve a comprobar cada 30 s. Si el
 * servidor deja de responder estando conectado, vuelve a esperar hasta 90 s en ámbar.
 *
 * Usa setTimeout en cadena (y no setInterval) porque la espera cambia según el resultado. No usa
 * useConsulta para que el estado anterior se mantenga mientras se vuelve a comprobar.
 *
 * @param compacto en pantallas angostas deja solo el ícono (el texto queda para lectores de
 *        pantalla); con false el texto siempre se ve (pantalla de inicio de sesión)
 */
function IndicadorServidor({ className = '', compacto = true }) {
  const [estado, setEstado] = useState('conectando');

  useEffect(() => {
    let vigente = true;
    let temporizador;
    // Desde cuándo se espera una respuesta; null mientras el servidor responde.
    let esperandoDesde = Date.now();

    /**
     * Qué mostrar después de una consulta y cuánto esperar para la siguiente.
     * @param resultado 'conectado', 'sinBaseDatos' (503) o 'sinRespuesta'
     */
    function siguientePaso(resultado) {
      if (resultado !== 'sinRespuesta') {
        esperandoDesde = null;
        return { nuevoEstado: resultado, espera: INTERVALO_MS };
      }
      // Sin respuesta: puede que el servidor esté despertando.
      esperandoDesde ??= Date.now();
      if (Date.now() - esperandoDesde < ESPERA_MAXIMA_MS) {
        return { nuevoEstado: 'conectando', espera: REINTENTO_MS };
      }
      return { nuevoEstado: 'sinConexion', espera: INTERVALO_MS };
    }

    function comprobar() {
      consultarSalud()
        .then(
          () => 'conectado',
          (error) => (error?.estado === 503 ? 'sinBaseDatos' : 'sinRespuesta'),
        )
        .then(siguientePaso)
        .then(({ nuevoEstado, espera }) => {
          if (vigente) {
            setEstado(nuevoEstado);
            temporizador = setTimeout(comprobar, espera);
          }
        });
    }

    comprobar();
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, []);

  const { texto, icono: Icono, clases } = ESTADOS[estado];

  return (
    <p
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1 text-sm leading-tight font-semibold ${compacto ? 'max-sm:px-1.5' : ''} ${clases} ${className}`}
    >
      <Icono
        aria-hidden="true"
        className={`size-4 shrink-0 ${estado === 'conectando' ? 'motion-safe:animate-spin' : ''}`}
      />
      <span className="sr-only">Servidor: </span>
      {/* En pantallas muy angostas (si es compacto) el texto queda solo para lectores de pantalla. */}
      <span className={compacto ? 'max-sm:sr-only' : ''}>{texto}</span>
    </p>
  );
}

export default IndicadorServidor;
