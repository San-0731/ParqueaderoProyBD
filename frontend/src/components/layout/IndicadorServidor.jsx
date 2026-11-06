import { CircleCheck, DatabaseZap, LoaderCircle, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { consultarSalud } from '../../api/salud.js';

/** Cada cuánto se vuelve a comprobar el servidor. */
const INTERVALO_MS = 30_000;

// Cada estado tiene un ícono distinto (no solo un color): en celular solo se ve el ícono.
const ESTADOS = {
  comprobando: {
    texto: 'Comprobando…',
    icono: LoaderCircle,
    clases: 'bg-deshabilitado-claro text-deshabilitado',
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
 * Muestra si el backend responde. Consulta GET /api/salud al cargar y cada 30 s:
 * - responde 200 → "Conectado";
 * - responde 503 (el backend está encendido pero MySQL no) → "Sin base de datos";
 * - no responde (backend apagado) → "Sin conexión".
 *
 * No usa useConsulta para que el estado anterior se mantenga mientras se vuelve a comprobar.
 */
function IndicadorServidor({ className = '' }) {
  const [estado, setEstado] = useState('comprobando');

  useEffect(() => {
    let vigente = true;

    function comprobar() {
      consultarSalud()
        .then(
          () => 'conectado',
          (error) => (error?.estado === 503 ? 'sinBaseDatos' : 'sinConexion'),
        )
        .then((nuevoEstado) => {
          if (vigente) {
            setEstado(nuevoEstado);
          }
        });
    }

    comprobar();
    const intervalo = setInterval(comprobar, INTERVALO_MS);
    return () => {
      vigente = false;
      clearInterval(intervalo);
    };
  }, []);

  const { texto, icono: Icono, clases } = ESTADOS[estado];

  return (
    <p
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold max-sm:px-1.5 ${clases} ${className}`}
    >
      <Icono
        aria-hidden="true"
        className={`size-4 shrink-0 ${estado === 'comprobando' ? 'motion-safe:animate-spin' : ''}`}
      />
      <span className="sr-only">Servidor: </span>
      {/* En pantallas muy angostas el texto queda solo para lectores de pantalla. */}
      <span className="max-sm:sr-only">{texto}</span>
    </p>
  );
}

export default IndicadorServidor;
