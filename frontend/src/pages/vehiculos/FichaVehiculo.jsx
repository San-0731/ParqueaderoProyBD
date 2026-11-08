import { History, LogOut, PencilLine } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import Boton from '../../components/ui/Boton.jsx';
import Placa from '../../components/ui/Placa.jsx';
import { clasesBoton } from '../../components/ui/estilos.js';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearFechaHora, SIN_DATO } from '../../utils/formato.js';
import { formatearPlaca } from '../../utils/identificador.js';
import { nombrePropietario } from './datosVehiculos.js';

/**
 * Un dato de la ficha: etiqueta pequeña arriba y valor debajo. El <div> que agrupa dt y dd debe
 * ser hijo directo del <dl> (por eso la clase va aquí y no en otro div alrededor).
 */
function Dato({ etiqueta, className = '', children }) {
  return (
    <div className={className}>
      <dt className="text-sm text-tenue">{etiqueta}</dt>
      <dd className="font-medium">{children ?? SIN_DATO}</dd>
    </div>
  );
}

/**
 * Ficha de un vehículo: sus datos, si está dentro del parqueadero y su propietario, cada parte
 * con su botón "Editar". Sin onEditarVehiculo u onEditarPropietario (rol sin permiso para
 * editar) ese botón no se muestra.
 *
 * @param fila fila de armarFilas (datosVehiculos.js)
 * @param onElegir recibe el idVehiculo de otro vehículo del mismo propietario
 */
function FichaVehiculo({ fila, onEditarVehiculo, onEditarPropietario, onElegir }) {
  const idTitulo = useId();
  const idPropietario = useId();
  const { vehiculo, tipo, modelo, propietario, activo, otrosVehiculos } = fila;

  return (
    <article
      aria-labelledby={idTitulo}
      className="flex flex-col gap-6 rounded-xl border border-borde bg-white p-5 sm:p-6"
    >
      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={idTitulo}>
            <span className="sr-only">Vehículo </span>
            <Placa identificador={vehiculo.identificador} tamano="grande" />
          </h2>
          {onEditarVehiculo && (
            <Boton variante="secundario" icono={PencilLine} onClick={onEditarVehiculo}>
              Editar vehículo
            </Boton>
          )}
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Dato etiqueta="Tipo, según la placa">{tipo}</Dato>
          <Dato etiqueta="Marca y modelo">{modelo}</Dato>
          <Dato etiqueta="Color">{vehiculo.color}</Dato>
          <Dato etiqueta="Año">{vehiculo.anio}</Dato>
        </dl>

        {activo ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ocupado/35 bg-ocupado-claro px-4 py-3">
            <p>
              <span className="font-semibold text-ocupado">Dentro del parqueadero</span>
              <span className="block text-sm">
                En {nombreEspacio(activo)} desde el {formatearFechaHora(activo.entrada)}
              </span>
            </p>
            <Link
              to={`/salida/${activo.idRegistro}`}
              className={clasesBoton({ variante: 'secundario' })}
            >
              <LogOut aria-hidden="true" className="size-5" />
              Cobrar salida
            </Link>
          </div>
        ) : (
          <p className="rounded-lg bg-concreto px-4 py-3 text-tenue">Fuera del parqueadero.</p>
        )}

        <Link
          to={`/historial?identificador=${vehiculo.identificador}`}
          className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-senal hover:underline"
        >
          <History aria-hidden="true" className="size-5" />
          Ver su historial
        </Link>
      </section>

      <section aria-labelledby={idPropietario} className="border-t border-borde pt-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 id={idPropietario} className="font-condensada text-2xl font-semibold">
            Propietario
          </h3>
          {propietario && onEditarPropietario && (
            <Boton variante="secundario" icono={PencilLine} onClick={onEditarPropietario}>
              Editar propietario
            </Boton>
          )}
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Dato etiqueta="Nombre" className="col-span-2">
            {nombrePropietario(propietario)}
          </Dato>
          <Dato etiqueta="Documento">{propietario?.documento}</Dato>
          <Dato etiqueta="Teléfono">{propietario?.telefono}</Dato>
        </dl>

        {otrosVehiculos.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-tenue">Otros vehículos de este propietario</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {otrosVehiculos.map((otro) => (
                <li key={otro.idVehiculo}>
                  <button
                    type="button"
                    onClick={() => onElegir(otro.idVehiculo)}
                    aria-label={`Ver ${formatearPlaca(otro.identificador)}`}
                    className="rounded-md transition motion-safe:hover:scale-105"
                  >
                    <Placa identificador={otro.identificador} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </article>
  );
}

export default FichaVehiculo;
