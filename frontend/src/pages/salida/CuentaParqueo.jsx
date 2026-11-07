import { useId } from 'react';
import Placa from '../../components/ui/Placa.jsx';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearDuracion, formatearFechaHora, formatearPesos } from '../../utils/formato.js';
import { hayCobro } from './datosSalida.js';

/** Una fila de la cuenta: etiqueta a la izquierda y valor a la derecha. */
function Dato({ etiqueta, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-borde py-2.5 last:border-b-0">
      <dt className="text-tenue">{etiqueta}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * La cuenta del parqueo: quién es, dónde está, cuánto tiempo lleva y el valor a pagar.
 *
 * Todos los números del cobro (minutos, horas cobradas, tarifa y valor) son los de la
 * liquidación del backend; aquí solo se les da formato. El valor va en un panel oscuro, como
 * la pantalla de un cajero de parqueadero, porque es lo que el cliente pregunta.
 *
 * @param registro detalle del registro (placa, espacio y entrada)
 * @param liquidacion la liquidación más reciente ({ salida, minutosTotales, horasCobradas,
 *        valorHora, valorTotal })
 */
function CuentaParqueo({ registro, liquidacion, tipoVehiculo, propietario }) {
  const idTitulo = useId();
  const cobra = hayCobro(liquidacion);

  return (
    <section
      aria-labelledby={idTitulo}
      className="rounded-xl border border-borde bg-white p-5 sm:p-6"
    >
      <h2 id={idTitulo} className="sr-only">
        Cuenta
      </h2>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Placa identificador={registro.identificador} tamano="grande" />
        {(tipoVehiculo || propietario) && (
          <p>
            {tipoVehiculo && <span className="block text-lg font-semibold">{tipoVehiculo}</span>}
            {propietario && <span className="block text-tenue">{propietario}</span>}
          </p>
        )}
      </div>

      <dl className="mt-5">
        <Dato etiqueta="Espacio">{nombreEspacio(registro)}</Dato>
        <Dato etiqueta="Entrada">{formatearFechaHora(registro.entrada)}</Dato>
        <Dato etiqueta="Si sale ahora">{formatearFechaHora(liquidacion.salida)}</Dato>
        <Dato etiqueta="Tiempo dentro">{formatearDuracion(liquidacion.minutosTotales)}</Dato>
      </dl>

      <div className="mt-5 rounded-xl bg-asfalto px-5 py-5 text-white sm:px-6">
        <p className="text-white/75">Valor a pagar</p>
        <p className="mt-1 font-condensada text-6xl leading-none font-bold tabular-nums sm:text-7xl">
          {formatearPesos(liquidacion.valorTotal)}
        </p>
        <p className="mt-3 text-white/75">
          {cobra
            ? `${liquidacion.horasCobradas} h × ${formatearPesos(liquidacion.valorHora)} la hora (cada hora o fracción).`
            : 'No se cobra: estuvo menos de un minuto.'}
        </p>
      </div>
      <p className="mt-2 text-sm text-tenue">Se actualiza cada minuto y otra vez al confirmar.</p>
    </section>
  );
}

export default CuentaParqueo;
