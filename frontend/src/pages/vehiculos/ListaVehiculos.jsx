import { useRef } from 'react';
import Placa from '../../components/ui/Placa.jsx';
import { nombrePropietario } from './datosVehiculos.js';

// Teclas que mueven la selección: cuánto avanzar desde la posición actual.
const MOVIMIENTOS = {
  ArrowDown: (indice) => indice + 1,
  ArrowUp: (indice) => indice - 1,
  Home: () => 0,
  End: (_indice, total) => total - 1,
};

/**
 * Lista de vehículos para elegir cuál ver en la ficha.
 *
 * - Mouse: clic en un vehículo.
 * - Teclado: ↑ y ↓ pasan al anterior o al siguiente, Inicio y Fin al primero y al último,
 *   y Tab sale de la lista hacia la ficha. Solo el vehículo elegido está en el orden de Tab
 *   ("roving tabindex"): así Tab no tiene que recorrer toda la lista.
 *
 * El elegido se resalta con el contorno azul, crece un poco y se eleva con una sombra. Al
 * pasar el mouse sobre otro, ese también crece levemente. El crecimiento usa motion-safe:,
 * así que con "reducir movimiento" solo cambian el contorno y la sombra.
 *
 * @param filas filas de armarFilas (datosVehiculos.js)
 * @param idElegido id del vehículo elegido, o null
 * @param onElegir recibe el idVehiculo
 */
function ListaVehiculos({ filas, idElegido, onElegir }) {
  const botones = useRef(new Map());
  const indiceElegido = filas.findIndex((fila) => fila.vehiculo.idVehiculo === idElegido);

  function moverConTeclado(evento) {
    const mover = MOVIMIENTOS[evento.key];
    if (!mover) {
      return;
    }
    evento.preventDefault();
    const actual = filas.findIndex(
      (fila) => botones.current.get(fila.vehiculo.idVehiculo) === document.activeElement,
    );
    const desde = actual === -1 ? Math.max(indiceElegido, 0) : actual;
    const destino = Math.min(Math.max(mover(desde, filas.length), 0), filas.length - 1);
    const { idVehiculo } = filas[destino].vehiculo;
    onElegir(idVehiculo);
    botones.current.get(idVehiculo)?.focus();
  }

  return (
    <ul aria-label="Vehículos" onKeyDown={moverConTeclado} className="flex flex-col gap-2 p-1">
      {filas.map((fila, indice) => {
        const { idVehiculo } = fila.vehiculo;
        const elegido = idVehiculo === idElegido;
        // Si no hay ninguno elegido, el primero recibe el foco con Tab.
        const enTab = elegido || (indiceElegido === -1 && indice === 0);
        return (
          <li key={idVehiculo}>
            <FilaVehiculo
              ref={(boton) => {
                if (boton) {
                  botones.current.set(idVehiculo, boton);
                } else {
                  botones.current.delete(idVehiculo);
                }
              }}
              fila={fila}
              elegido={elegido}
              tabIndex={enTab ? 0 : -1}
              onElegir={() => onElegir(idVehiculo)}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Un vehículo de la lista: placa, tipo, marca y modelo, propietario y si está dentro. */
function FilaVehiculo({ ref, fila, elegido, tabIndex, onElegir }) {
  const { vehiculo, tipo, modelo, propietario, activo } = fila;
  const nombre = nombrePropietario(propietario);

  return (
    <button
      ref={ref}
      type="button"
      tabIndex={tabIndex}
      aria-current={elegido ? 'true' : undefined}
      onClick={onElegir}
      className={`relative flex w-full flex-col gap-1 rounded-xl border bg-white px-4 py-3 text-left transition duration-150 ease-out ${
        elegido
          ? 'z-10 border-senal shadow-md ring-2 ring-senal motion-safe:scale-[1.02]'
          : 'border-borde hover:border-senal/50 hover:shadow-sm motion-safe:hover:scale-[1.01]'
      }`}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* Los espacios ({' '}) separan las palabras en el nombre del botón: "KLM 234 Carro
            Dentro Mazda 3, Laura…", el mismo texto que se ve (WCAG 2.5.3). */}
        <Placa identificador={vehiculo.identificador} />{' '}
        <span className="font-semibold">{tipo}</span>
        {activo && ' '}
        {activo && (
          <span className="ml-auto rounded-full bg-ocupado-claro px-2.5 py-0.5 text-sm font-semibold text-ocupado">
            Dentro
          </span>
        )}
      </span>{' '}
      <span className="truncate text-sm text-tenue">
        {modelo ?? 'Sin marca ni modelo'}
        {nombre && `, ${nombre}`}
      </span>
    </button>
  );
}

export default ListaVehiculos;
