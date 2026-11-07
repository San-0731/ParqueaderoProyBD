import { LogIn } from 'lucide-react';
import { useId } from 'react';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Placa from '../../components/ui/Placa.jsx';
import { codigoEspacio } from '../../utils/espacio.js';

/** ['a'] → "a"; ['a', 'b'] → "a y b". */
function unir(partes) {
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0];
}

/**
 * Resumen de lo que se va a registrar y el botón final. En escritorio se queda fijo a la
 * derecha mientras se recorren los pasos; en celular va al final.
 *
 * @param faltantes lo que falta para poder confirmar (['buscar el vehículo', ...])
 * @param bloqueo motivo que impide confirmar aunque no falte nada (vehículo ya dentro)
 * @param desdeTablero true si el espacio mostrado es el que llegó desde el tablero
 */
function ResumenEntrada({
  identificador,
  tipoVehiculo,
  espacio,
  desdeTablero,
  faltantes,
  bloqueo,
  enviando,
  errorEnvio,
  onConfirmar,
  className = '',
}) {
  const idTitulo = useId();
  const idMotivo = useId();
  const motivo = bloqueo ?? (faltantes.length > 0 ? `Falta ${unir(faltantes)}.` : null);

  return (
    <aside
      aria-labelledby={idTitulo}
      className={`rounded-xl border border-borde bg-white p-5 sm:p-6 ${className}`}
    >
      <h2 id={idTitulo} className="font-condensada text-2xl font-semibold">
        Resumen de la entrada
      </h2>

      <dl className="mt-4 flex flex-col gap-4">
        <div>
          <dt className="text-sm text-tenue">Vehículo</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {identificador ? (
              <Placa identificador={identificador} tamano="mediano" />
            ) : (
              <span className="text-tenue">Sin buscar</span>
            )}
            {tipoVehiculo && <span className="font-medium">{tipoVehiculo}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-tenue">Espacio</dt>
          <dd className="mt-1">
            {espacio ? (
              <>
                <span className="font-condensada text-3xl leading-none font-bold">
                  {codigoEspacio(espacio)}
                </span>{' '}
                <span className="text-tenue">piso {espacio.piso}</span>
                {desdeTablero && (
                  <span className="block text-sm text-tenue">Elegido en el tablero</span>
                )}
              </>
            ) : (
              <span className="text-tenue">Sin elegir</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-tenue">Hora de entrada</dt>
          <dd className="mt-1">La pone el servidor al confirmar.</dd>
        </div>
      </dl>

      {errorEnvio && (
        <div className="mt-5">
          <Alerta tipo="error" titulo="No se pudo registrar la entrada">
            {errorEnvio.mensaje}
          </Alerta>
        </div>
      )}

      <Boton
        tamano="grande"
        icono={LogIn}
        cargando={enviando}
        disabled={motivo !== null}
        onClick={onConfirmar}
        aria-describedby={motivo ? idMotivo : undefined}
        className="mt-5 w-full"
      >
        Confirmar entrada
      </Boton>
      {motivo && (
        <p id={idMotivo} className="mt-2 text-sm text-tenue">
          {motivo}
        </p>
      )}
    </aside>
  );
}

export default ResumenEntrada;
