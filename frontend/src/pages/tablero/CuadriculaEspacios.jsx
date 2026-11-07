import { useId } from 'react';
import TarjetaEspacio from './TarjetaEspacio.jsx';

/**
 * Cuadrícula de espacios: un bloque por piso (h2) y, dentro, uno por zona (h3) con sus
 * espacios. Los encabezados permiten saltar de piso en piso con el lector de pantalla.
 *
 * @param pisos resultado de agruparPorPisoYZona
 * @param onDeshabilitado se llama al tocar un espacio deshabilitado
 */
function CuadriculaEspacios({ pisos, onDeshabilitado }) {
  // Prefijo único para los id de los encabezados (el piso puede traer espacios, como "Sótano 1").
  const prefijo = useId();

  return (
    <div className="space-y-10">
      {pisos.map(({ piso, zonas }, indicePiso) => (
        <section key={piso} aria-labelledby={`${prefijo}-${indicePiso}`}>
          <h2
            id={`${prefijo}-${indicePiso}`}
            className="mb-4 border-b border-borde pb-2 font-condensada text-2xl font-semibold"
          >
            Piso {piso}
          </h2>

          <div className="space-y-6">
            {zonas.map(({ zona, tipos, libres, espacios }, indiceZona) => (
              <section key={zona} aria-labelledby={`${prefijo}-${indicePiso}-${indiceZona}`}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                  <h3
                    id={`${prefijo}-${indicePiso}-${indiceZona}`}
                    className="text-lg font-semibold"
                  >
                    Zona {zona}
                  </h3>
                  <p className="text-sm text-tenue">
                    {tipos.join(' y ')}, {libres} {libres === 1 ? 'libre' : 'libres'} de{' '}
                    {espacios.length}
                  </p>
                </div>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
                  {espacios.map((espacio) => (
                    <li key={espacio.idEspacio}>
                      <TarjetaEspacio espacio={espacio} onDeshabilitado={onDeshabilitado} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default CuadriculaEspacios;
