import { Printer } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';
import Boton from '../../components/ui/Boton.jsx';
import Placa from '../../components/ui/Placa.jsx';
import { clasesBoton } from '../../components/ui/estilos.js';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearDuracion, formatearFechaHora, formatearPesos } from '../../utils/formato.js';

/** Fila de la tirilla: etiqueta y valor en los extremos. */
function Linea({ etiqueta, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-tenue">{etiqueta}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}

const SEPARADOR = 'my-4 border-t-2 border-dashed border-borde';

/**
 * Recibo de la salida, con forma de tirilla de caja (papel de 80 mm). Se muestra después de
 * registrar la salida, con los datos que devolvió el backend.
 *
 * Al imprimir solo sale la tirilla: el menú, el encabezado y los botones llevan print:hidden.
 *
 * @param recibo resultado de datosRecibo (datosSalida.js)
 */
function ReciboSalida({ recibo }) {
  const idTitulo = useId();
  const refTitulo = useRef(null);

  // El recibo reemplaza al formulario: se mueve el foco a su título para que el lector de
  // pantalla anuncie el cambio y el teclado siga desde aquí.
  useEffect(() => {
    refTitulo.current?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <article
        aria-labelledby={idTitulo}
        className="w-full max-w-sm bg-white px-6 py-9 [print-color-adjust:exact] borde-tirilla print:max-w-[72mm] print:px-0 print:py-0 print:[mask:none]"
      >
        <header className="text-center">
          <p className="font-condensada text-2xl leading-tight font-bold">Parqueadero</p>
          <h2
            id={idTitulo}
            ref={refTitulo}
            tabIndex={-1}
            className="text-lg font-semibold outline-none"
          >
            Recibo de salida
          </h2>
          <p className="text-sm text-tenue">Parqueo N.º {recibo.idRegistro}</p>
        </header>

        <hr className={SEPARADOR} />

        <div className="text-center">
          <Placa identificador={recibo.identificador} tamano="mediano" />
          {recibo.tipoVehiculo && <p className="mt-1 font-medium">{recibo.tipoVehiculo}</p>}
        </div>

        <dl className="mt-4 flex flex-col gap-1.5">
          <Linea etiqueta="Espacio">{nombreEspacio(recibo.espacio)}</Linea>
          <Linea etiqueta="Entrada">{formatearFechaHora(recibo.entrada)}</Linea>
          <Linea etiqueta="Salida">{formatearFechaHora(recibo.salida)}</Linea>
          <Linea etiqueta="Tiempo">{formatearDuracion(recibo.minutosTotales)}</Linea>
          {recibo.desglose && (
            <Linea etiqueta="Cobro">
              {recibo.desglose.horasCobradas} h × {formatearPesos(recibo.desglose.valorHora)}
            </Linea>
          )}
        </dl>

        <hr className={SEPARADOR} />

        <div className="flex items-baseline justify-between gap-4">
          <p className="text-lg font-semibold">Total</p>
          <p className="font-condensada text-4xl leading-none font-bold tabular-nums">
            {formatearPesos(recibo.valorTotal)}
          </p>
        </div>

        {recibo.metodo ? (
          <dl className="mt-3 flex flex-col gap-1.5">
            <Linea etiqueta="Método de pago">{recibo.metodo}</Linea>
            {recibo.referencia && (
              <Linea etiqueta="Referencia">
                <span className="break-all">{recibo.referencia}</span>
              </Linea>
            )}
          </dl>
        ) : (
          <p className="mt-3 text-center text-tenue">Sin cobro: estuvo menos de un minuto.</p>
        )}
      </article>

      <div className="flex w-full max-w-sm flex-col gap-3 print:hidden">
        <Boton icono={Printer} onClick={() => window.print()}>
          Imprimir
        </Boton>
        <Link to="/salida" className={clasesBoton({ variante: 'secundario' })}>
          Volver a vehículos dentro
        </Link>
      </div>
    </div>
  );
}

export default ReciboSalida;
