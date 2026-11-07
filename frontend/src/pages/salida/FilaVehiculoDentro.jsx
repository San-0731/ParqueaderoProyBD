import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import Placa from '../../components/ui/Placa.jsx';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearDuracion, formatearFechaHora } from '../../utils/formato.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';

/**
 * Un vehículo dentro, con forma de tiquete de parqueadero: a la izquierda el "talón" con la
 * placa, separado por una línea punteada (la perforación), y a la derecha cuánto lleva dentro.
 * Toda la fila es un enlace a su cobro.
 *
 * En celular se apila: arriba la placa y el tiempo, abajo el espacio y la entrada.
 *
 * @param activo fila de GET /registros/activos ({ idRegistro, identificador, tipoVehiculo,
 *        nombreCliente, piso, zona, numero, entrada, minutosTranscurridos })
 */
function FilaVehiculoDentro({ activo }) {
  const tiempo = formatearDuracion(activo.minutosTranscurridos);
  const entrada = formatearFechaHora(activo.entrada);
  const detalle = [nombreTipoVisible(activo.tipoVehiculo), activo.nombreCliente]
    .filter(Boolean)
    .join(', ');

  return (
    <li>
      {/* Sin aria-label: el nombre del enlace es el mismo texto que se ve, separado con espacios
          ({' '}), más "salida" al final solo para el lector de pantalla. Así quien usa control
          por voz puede decir lo que ve (WCAG 2.5.3). */}
      <Link
        to={`/salida/${activo.idRegistro}`}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 rounded-xl border border-borde bg-white p-4 transition-colors hover:border-senal sm:grid-cols-[10rem_minmax(0,1fr)_auto_auto] sm:py-0 sm:pl-0"
      >
        <span className="flex items-center sm:self-stretch sm:border-r-2 sm:border-dashed sm:border-borde sm:py-4 sm:pl-4">
          <Placa identificador={activo.identificador} />
        </span>{' '}
        <span className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto sm:py-4">
          <span className="block font-semibold">{nombreEspacio(activo)}</span>{' '}
          {detalle && (
            <>
              <span className="block truncate text-sm text-tenue">{detalle}</span>{' '}
            </>
          )}
          <span className="block text-sm text-tenue">Entró el {entrada}</span>
        </span>{' '}
        <span className="text-right sm:py-4">
          <span className="block font-condensada text-3xl leading-none font-bold tabular-nums">
            {tiempo}
          </span>{' '}
          <span className="block text-sm text-tenue">dentro</span>
        </span>{' '}
        {/* En celular "Cobrar" no se ve (toda la fila es el enlace), pero el lector de pantalla
            sí lo lee: sr-only en celular y visible desde tablet (sm:not-sr-only). */}
        <span className="sr-only items-center gap-1 font-semibold text-senal group-hover:underline sm:not-sr-only sm:flex">
          Cobrar <span className="sr-only">salida</span>
          <ChevronRight aria-hidden="true" className="size-5" />
        </span>
      </Link>
    </li>
  );
}

export default FilaVehiculoDentro;
