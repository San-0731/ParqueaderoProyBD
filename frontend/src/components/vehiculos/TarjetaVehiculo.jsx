import Placa from '../ui/Placa.jsx';
import { SIN_DATO } from '../../utils/formato.js';

/**
 * Datos de un vehículo y de su propietario en una lista de definiciones (<dl>).
 * La usan la entrada (vehículo encontrado) y la pantalla de vehículos.
 *
 * <TarjetaVehiculo vehiculo={v} propietario={c} tipo="Carro" modelo="Mazda 3"
 *                  acciones={<Boton variante="secundario">Cambiar vehículo</Boton>} />
 *
 * @param tipo nombre del tipo de vehículo
 * @param modelo marca y modelo ("Mazda 3"), o null si no se registró
 */
function TarjetaVehiculo({ vehiculo, propietario, tipo, modelo, acciones }) {
  const datos = [
    ['Tipo', tipo],
    ['Marca y modelo', modelo],
    ['Color', vehiculo.color],
    ['Año', vehiculo.anio],
    ['Propietario', `${propietario.nombres} ${propietario.apellidos}`],
    ['Documento', propietario.documento],
    ['Teléfono', propietario.telefono],
  ];

  return (
    <div className="rounded-xl border border-borde bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Placa identificador={vehiculo.identificador} />
        {acciones}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        {datos.map(([termino, valor]) => (
          <div key={termino}>
            <dt className="text-sm text-tenue">{termino}</dt>
            <dd className="font-medium">{valor ?? SIN_DATO}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default TarjetaVehiculo;
