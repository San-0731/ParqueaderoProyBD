import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';
import { partesOcupacion } from './datosReportes.js';

/** "2 ocupados, 9 libres, 1 deshabilitado" (solo lo que no es cero). */
function describirOcupacion({ ocupados, libres, deshabilitados }) {
  const partes = [
    ocupados > 0 && `${ocupados} ${ocupados === 1 ? 'ocupado' : 'ocupados'}`,
    libres > 0 && `${libres} ${libres === 1 ? 'libre' : 'libres'}`,
    deshabilitados > 0 &&
      `${deshabilitados} ${deshabilitados === 1 ? 'deshabilitado' : 'deshabilitados'}`,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(', ') : 'Sin espacios';
}

/**
 * Ocupación actual por tipo de vehículo: una barra horizontal por tipo, dividida en ocupados
 * (rojo), libres (verde) y deshabilitados (rayas), los mismos colores del tablero. Las cifras
 * van escritas al lado: la información no depende solo del color.
 *
 * @param ocupacion GET /reportes/ocupacion
 */
function OcupacionTipos({ ocupacion }) {
  const tipos = ocupacion.filter((tipo) => tipo.total > 0);

  return (
    <div className="rounded-xl border border-borde bg-white p-4 sm:p-5">
      <ul className="flex flex-col gap-4">
        {tipos.map((tipo) => {
          const partes = partesOcupacion(tipo);
          const nombre = nombreTipoVisible(tipo.tipoVehiculo);
          return (
            <li
              key={tipo.idTipo}
              className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="font-semibold">
                {nombre} <span className="font-normal text-tenue">({tipo.total})</span>
              </span>
              <span
                aria-hidden="true"
                className="flex h-4 overflow-hidden rounded-full border border-borde bg-white"
              >
                <span className="h-full bg-ocupado" style={{ width: `${partes.ocupados}%` }} />
                <span className="h-full bg-libre" style={{ width: `${partes.libres}%` }} />
                <span
                  className="h-full bg-white rayado-deshabilitado"
                  style={{ width: `${partes.deshabilitados}%` }}
                />
              </span>
              <span className="text-sm text-tenue">{describirOcupacion(tipo)}</span>
            </li>
          );
        })}
      </ul>

      <ul aria-hidden="true" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-tenue">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-ocupado" /> Ocupados
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-libre" /> Libres
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm border border-borde bg-white rayado-deshabilitado" />
          Deshabilitados
        </li>
      </ul>
    </div>
  );
}

export default OcupacionTipos;
