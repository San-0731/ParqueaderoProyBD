import { CircleCheck } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import Alerta from '../../components/ui/Alerta.jsx';
import Tarjeta from '../../components/ui/Tarjeta.jsx';
import { clasesBoton } from '../../components/ui/estilos.js';
import { codigoEspacio, nombreEspacio } from '../../utils/espacio.js';
import { agruparPorPiso } from './datosEntrada.js';
import TituloPaso from './TituloPaso.jsx';

/**
 * Paso 2: elegir un espacio libre del tipo del vehículo. Cada espacio es un "cajón" que se
 * toca (un radio nativo escondido dentro de un <label>): así funcionan las flechas del
 * teclado y el lector de pantalla anuncia "A-03, piso 1, botón de opción, seleccionado".
 *
 * @param activo false mientras no haya un vehículo listo (se muestra motivoInactivo)
 * @param espacios espacios libres del tipo del vehículo
 * @param aviso texto si el espacio que llegó desde el tablero no se puede usar
 */
function PasoEspacio({
  activo,
  motivoInactivo,
  tipoVehiculo,
  espacios,
  idElegido,
  onElegir,
  aviso,
}) {
  const nombreGrupo = useId();

  return (
    <Tarjeta titulo={<TituloPaso numero={2}>Espacio</TituloPaso>}>
      {aviso && (
        <div className="mb-4">
          <Alerta tipo="aviso">{aviso}</Alerta>
        </div>
      )}

      {!activo && <p className="text-tenue">{motivoInactivo}</p>}

      {activo && espacios.length === 0 && (
        <Alerta
          tipo="aviso"
          titulo={`No hay espacios libres para ${tipoVehiculo}`}
          accion={
            <Link to="/" className={clasesBoton({ variante: 'secundario' })}>
              Ver tablero
            </Link>
          }
        >
          Cuando salga un vehículo de ese tipo, su espacio aparecerá aquí.
        </Alerta>
      )}

      {activo && espacios.length > 0 && (
        <fieldset>
          <legend className="mb-3 font-semibold">Espacios libres para {tipoVehiculo}</legend>
          <div className="flex flex-col gap-4">
            {agruparPorPiso(espacios).map(({ piso, espacios: espaciosDelPiso }) => (
              <fieldset key={piso}>
                <legend className="mb-2 text-sm text-tenue">Piso {piso}</legend>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
                  {espaciosDelPiso.map((espacio) => (
                    <Cajon
                      key={espacio.idEspacio}
                      espacio={espacio}
                      nombreGrupo={nombreGrupo}
                      elegido={espacio.idEspacio === idElegido}
                      onElegir={onElegir}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </fieldset>
      )}
    </Tarjeta>
  );
}

/** Un espacio libre con el estilo del tablero (línea punteada); elegido, la línea se vuelve sólida. */
function Cajon({ espacio, nombreGrupo, elegido, onElegir }) {
  return (
    <label className="flex min-h-20 cursor-pointer flex-col justify-between gap-1 rounded-xl border-2 border-dashed border-libre bg-white p-3 transition-colors hover:bg-libre-claro has-checked:border-solid has-checked:bg-libre-claro has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-senal">
      <input
        type="radio"
        name={nombreGrupo}
        value={espacio.idEspacio}
        checked={elegido}
        onChange={() => onElegir(espacio.idEspacio)}
        aria-label={nombreEspacio(espacio)}
        className="sr-only"
      />
      <span className="font-condensada text-2xl leading-none font-bold">
        {codigoEspacio(espacio)}
      </span>
      <span
        aria-hidden="true"
        className={`flex items-center gap-1 text-sm font-semibold ${elegido ? 'text-libre' : 'text-tenue'}`}
      >
        {elegido && <CircleCheck className="size-4" />}
        {elegido ? 'Elegido' : 'Libre'}
      </span>
    </label>
  );
}

export default PasoEspacio;
