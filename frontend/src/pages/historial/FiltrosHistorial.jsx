import { useId } from 'react';
import Campo from '../../components/ui/Campo.jsx';
import Selector from '../../components/ui/Selector.jsx';
import { normalizarIdentificador } from '../../utils/identificador.js';
import { ATAJOS, esAtajoActivo, rangoDeAtajo } from './datosHistorial.js';

/**
 * Filtros del historial: fechas (desde y hasta, ambas incluidas, por fecha de entrada), placa,
 * método de pago y atajos de fechas. No guarda estado: lo que se elige va directo a la URL con
 * onCambiar, y la pantalla vuelve a leerlo de ahí.
 *
 * @param filtros los de filtrosDesdeUrl
 * @param hoy "2026-11-06", para calcular los atajos
 * @param metodos catálogo de métodos de pago (vacío mientras carga)
 * @param errorRango mensaje si "desde" es posterior a "hasta"
 * @param onCambiar recibe solo lo que cambió, por ejemplo { idMetodo: '2' }
 */
function FiltrosHistorial({ filtros, hoy, metodos, errorRango, onCambiar }) {
  const idTitulo = useId();
  const idAtajos = useId();
  const cambiar = (campo) => (evento) => onCambiar({ [campo]: evento.target.value });

  return (
    <section
      aria-labelledby={idTitulo}
      className="mb-6 rounded-xl border border-borde bg-white p-4 sm:p-5"
    >
      <h2 id={idTitulo} className="sr-only">
        Filtros
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo
          etiqueta="Desde"
          type="date"
          value={filtros.desde}
          onChange={cambiar('desde')}
          aria-invalid={errorRango ? true : undefined}
        />
        <Campo
          etiqueta="Hasta"
          type="date"
          value={filtros.hasta}
          onChange={cambiar('hasta')}
          error={errorRango}
        />
        <Campo
          etiqueta="Placa o código"
          type="search"
          value={filtros.identificador}
          onChange={(evento) =>
            onCambiar({ identificador: normalizarIdentificador(evento.target.value) })
          }
          autoComplete="off"
          ayuda="Basta con una parte: KLM encuentra KLM234."
        />
        <Selector
          etiqueta="Método de pago"
          placeholder="Todos los métodos"
          opciones={metodos.map((metodo) => ({
            valor: String(metodo.idMetodo),
            texto: metodo.nombre,
          }))}
          value={filtros.idMetodo}
          onChange={cambiar('idMetodo')}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p id={idAtajos} className="mr-1 text-sm text-tenue">
          Rango rápido:
        </p>
        <div role="group" aria-labelledby={idAtajos} className="flex flex-wrap gap-2">
          {ATAJOS.map(({ clave, texto }) => {
            const activo = esAtajoActivo(clave, filtros, hoy);
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
                {texto}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FiltrosHistorial;
