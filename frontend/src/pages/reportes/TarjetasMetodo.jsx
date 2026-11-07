import { formatearPesos } from '../../utils/formato.js';

/** 1 → "1 pago"; 3 → "3 pagos". */
function contarPagos(cantidad) {
  return `${cantidad} ${cantidad === 1 ? 'pago' : 'pagos'}`;
}

/**
 * Ingresos del rango: el total general en un panel oscuro (como la pantalla de un cajero) y una
 * tarjeta por cada método de pago con su total, su cantidad de pagos y qué parte del total es.
 *
 * @param tarjetas de ingresosPorMetodo (datosReportes.js)
 */
function TarjetasMetodo({ totalGeneral, cantidadPagos, tarjetas }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <li className="col-span-2 rounded-xl bg-asfalto p-5 text-white lg:col-span-1">
        <p className="text-white/75">Total recaudado</p>
        <p className="mt-1 font-condensada text-4xl leading-none font-bold tabular-nums">
          {formatearPesos(totalGeneral)}
        </p>
        <p className="mt-2 text-sm text-white/75">{contarPagos(cantidadPagos)}</p>
      </li>
      {tarjetas.map((tarjeta) => (
        <li key={tarjeta.nombre} className="rounded-xl border border-borde bg-white p-4 sm:p-5">
          <p className="font-semibold">{tarjeta.nombre}</p>
          <p className="mt-1 font-condensada text-3xl leading-none font-bold tabular-nums">
            {formatearPesos(tarjeta.total)}
          </p>
          <p className="mt-2 text-sm text-tenue">
            {contarPagos(tarjeta.cantidad)}, {tarjeta.porcentaje} % del total
          </p>
          {/* Barrita de proporción: decorativa, el porcentaje ya está escrito arriba. */}
          <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-concreto">
            <div
              className="h-full rounded-full bg-senal"
              style={{ width: `${tarjeta.porcentaje}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default TarjetasMetodo;
