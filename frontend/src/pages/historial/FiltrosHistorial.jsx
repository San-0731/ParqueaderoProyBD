import { useId } from 'react';
import AtajosFechas from '../../components/filtros/AtajosFechas.jsx';
import CamposFechas from '../../components/filtros/CamposFechas.jsx';
import Campo from '../../components/ui/Campo.jsx';
import Selector from '../../components/ui/Selector.jsx';
import { normalizarIdentificador } from '../../utils/identificador.js';
import { ATAJOS_HISTORIAL } from './datosHistorial.js';

/**
 * Filtros del historial: fechas (desde y hasta, ambas incluidas, por fecha de entrada), placa,
 * método de pago y atajos de fechas. No guarda estado: lo que se elige va directo a la URL con
 * onCambiar, y la pantalla vuelve a leerlo de ahí.
 *
 * @param filtros { desde, hasta, identificador, idMetodo } (de filtrosDesdeUrl)
 * @param hoy "2026-11-06", para calcular los atajos
 * @param metodos catálogo de métodos de pago (vacío mientras carga)
 * @param errorRango mensaje si "desde" es posterior a "hasta"
 * @param onCambiar recibe solo lo que cambió, por ejemplo { idMetodo: '2' }
 */
function FiltrosHistorial({ filtros, hoy, metodos, errorRango, onCambiar }) {
  const idTitulo = useId();

  return (
    <section
      aria-labelledby={idTitulo}
      className="mb-6 rounded-xl border border-borde bg-white p-4 sm:p-5"
    >
      <h2 id={idTitulo} className="sr-only">
        Filtros
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CamposFechas
          desde={filtros.desde}
          hasta={filtros.hasta}
          error={errorRango}
          onCambiar={onCambiar}
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
          onChange={(evento) => onCambiar({ idMetodo: evento.target.value })}
        />
      </div>
      <div className="mt-4">
        <AtajosFechas
          claves={ATAJOS_HISTORIAL}
          desde={filtros.desde}
          hasta={filtros.hasta}
          hoy={hoy}
          onCambiar={onCambiar}
        />
      </div>
    </section>
  );
}

export default FiltrosHistorial;
