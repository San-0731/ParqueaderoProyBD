import Tabla from '../../components/ui/Tabla.jsx';
import { formatearFecha, formatearPesos } from '../../utils/formato.js';
import { alturaRelativa, maximoDeSerie } from './datosReportes.js';

/** 1 → "1 pago"; 3 → "3 pagos". */
const contarPagos = (cantidad) => `${cantidad} ${cantidad === 1 ? 'pago' : 'pagos'}`;

/** Texto de una barra: "06/11/2026: $ 15.000 en 3 pagos" (globo y lector de pantalla). */
function describirDia(dia) {
  return dia.total > 0
    ? `${formatearFecha(dia.fecha)}: ${formatearPesos(dia.total)} en ${contarPagos(dia.cantidad)}`
    : `${formatearFecha(dia.fecha)}: sin pagos`;
}

/**
 * Etiqueta bajo una barra: con pocos días, todos; con muchos, el 1 y cada 5 días (como en un
 * calendario). Así no se amontonan los números en celular.
 */
function etiquetaDia(fecha, indice, total) {
  const dia = Number(fecha.slice(8, 10));
  if (total <= 10 || indice === 0 || dia === 1 || dia % 5 === 0) {
    return total > 31 ? fecha.slice(5).split('-').reverse().join('/') : String(dia);
  }
  return '';
}

/**
 * Ingresos por día: un gráfico de barras hecho solo con divs de Tailwind (sin librería) y, debajo,
 * la misma información en una tabla (la versión accesible y para leer cifras exactas).
 *
 * Cada barra es una "imagen" enfocable (role="img") con su descripción completa: al pasar el
 * mouse o al llegar con Tab aparece el globo con el valor. La altura es proporcional al día más
 * alto.
 *
 * @param serie de serieDiaria (datosReportes.js): [{ fecha, total, cantidad }]
 * @param porDia del reporte, solo los días con pagos (para la tabla)
 */
function GraficoDias({ serie, porDia, totalGeneral, cantidadPagos }) {
  const maximo = maximoDeSerie(serie);

  return (
    <>
      <div className="rounded-xl border border-borde bg-white p-4 sm:p-5">
        <p className="mb-2 text-sm text-tenue">
          Día más alto: <span className="font-semibold text-asfalto">{formatearPesos(maximo)}</span>
        </p>
        <ul
          aria-label="Gráfico de ingresos por día"
          className="flex h-48 items-end gap-0.5 border-b border-borde sm:gap-1"
        >
          {serie.map((dia, indice) => {
            const altura = alturaRelativa(dia.total, maximo);
            // El globo se alinea a la izquierda o a la derecha cerca de los bordes, para que no
            // se salga del recuadro.
            const alineacion =
              indice < 2
                ? 'left-0'
                : indice > serie.length - 3
                  ? 'right-0'
                  : 'left-1/2 -translate-x-1/2';
            return (
              <li key={dia.fecha} className="flex h-full flex-1">
                {/* La barra es una "imagen" con su descripción (role="img" + aria-label: el lector
                    de pantalla la lee) y enfocable con Tab para mostrar el globo con el teclado. */}
                <span
                  role="img"
                  tabIndex={0}
                  aria-label={describirDia(dia)}
                  className="group relative flex h-full w-full items-end rounded-t-sm outline-offset-1"
                >
                  <span
                    className={`block w-full rounded-t-sm transition-colors ${
                      dia.total > 0
                        ? 'min-h-0.5 bg-senal group-hover:bg-senal-oscuro group-focus-visible:bg-senal-oscuro'
                        : ''
                    }`}
                    style={{ height: `${altura}%` }}
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute z-10 hidden rounded-md bg-asfalto px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus-visible:block ${alineacion}`}
                    style={{ bottom: `calc(${altura}% + 6px)` }}
                  >
                    {describirDia(dia)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {/* Eje de los días: mismas columnas que las barras. */}
        <div aria-hidden="true" className="mt-1 flex gap-0.5 sm:gap-1">
          {serie.map((dia, indice) => (
            <span key={dia.fecha} className="flex-1 text-center text-xs text-tenue tabular-nums">
              {etiquetaDia(dia.fecha, indice, serie.length)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Tabla
          etiqueta="Ingresos por día"
          filas={porDia}
          claveFila="fecha"
          columnas={[
            { clave: 'fecha', titulo: 'Fecha', render: (fila) => formatearFecha(fila.fecha) },
            { clave: 'cantidadPagos', titulo: 'Pagos', alinear: 'derecha' },
            {
              clave: 'totalRecaudado',
              titulo: 'Total',
              alinear: 'derecha',
              render: (fila) => formatearPesos(fila.totalRecaudado),
            },
          ]}
          pie={{
            fecha: 'Total',
            cantidadPagos: cantidadPagos,
            totalRecaudado: formatearPesos(totalGeneral),
          }}
        />
      </div>
    </>
  );
}

export default GraficoDias;
