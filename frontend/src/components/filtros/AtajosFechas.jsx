import { useId } from 'react';
import { ATAJOS, esAtajoActivo, rangoDeAtajo } from '../../utils/rangosFechas.js';

/**
 * Botones de rango rápido ("Hoy", "Este mes", "Todo"...). El que coincide con las fechas
 * elegidas queda marcado (aria-pressed).
 *
 * <AtajosFechas claves={['mes', 'mesAnterior', 'todo']} desde={desde} hasta={hasta}
 *               hoy="2026-11-06" onCambiar={({ desde, hasta }) => ...} />
 *
 * @param claves los atajos que se muestran, en orden (ver ATAJOS en utils/rangosFechas.js)
 * @param onCambiar recibe { desde, hasta } del atajo ("" en ambos para "Todo")
 */
function AtajosFechas({ claves, desde, hasta, hoy, onCambiar }) {
  const idTitulo = useId();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p id={idTitulo} className="mr-1 text-sm text-tenue">
        Rango rápido:
      </p>
      <div role="group" aria-labelledby={idTitulo} className="flex flex-wrap gap-2">
        {claves.map((clave) => {
          const activo = esAtajoActivo(clave, { desde, hasta }, hoy);
          return (
            <button
              key={clave}
              type="button"
              aria-pressed={activo}
              onClick={() => onCambiar(rangoDeAtajo(clave, hoy))}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                activo
                  ? 'border-senal bg-senal text-white'
                  : 'border-borde bg-white text-asfalto hover:border-senal/50 hover:bg-senal-claro'
              }`}
            >
              {ATAJOS[clave]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AtajosFechas;
