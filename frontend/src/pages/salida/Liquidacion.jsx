import { ChevronLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { consultarLiquidacion, registrarSalida } from '../../api/registros.js';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { clasesBoton } from '../../components/ui/estilos.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import { useIntervalo } from '../../hooks/useIntervalo.js';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearPesos } from '../../utils/formato.js';
import { formatearPlaca } from '../../utils/identificador.js';
import CuentaParqueo from './CuentaParqueo.jsx';
import PanelPago from './PanelPago.jsx';
import ReciboSalida from './ReciboSalida.jsx';
import {
  cargarCobro,
  datosParaSalida,
  datosRecibo,
  hayCobro,
  masReciente,
  validarPago,
} from './datosSalida.js';

/** Cada cuánto se recalcula la cuenta mientras se elige el pago. */
const INTERVALO_ACTUALIZACION_MS = 60_000;

/** Errores con los que no tiene sentido reintentar: no existe, ya está cerrado, id inválido. */
const ESTADOS_DEFINITIVOS = [400, 404, 409];

const enlaceVolver = (
  <Link to="/salida" className={clasesBoton({ variante: 'secundario' })}>
    Volver a vehículos dentro
  </Link>
);

/**
 * Cobro de la salida (/salida/:idRegistro): la cuenta, el pago, la confirmación y el recibo.
 *
 * Flujo:
 * 1. Carga el registro, la liquidación y los métodos de pago; la cuenta se recalcula cada minuto.
 * 2. Al pulsar "Confirmar pago y salida" se valida el pago y se vuelve a pedir la liquidación,
 *    para que el modal muestre el valor de ese momento (puede haber pasado otra hora).
 * 3. Al confirmar en el modal se registra la salida (cierra el registro y guarda el pago en una
 *    sola transacción del backend) y se muestra el recibo.
 *
 * El valor siempre es el que calcula el backend: esta pantalla no hace cuentas.
 */
function Liquidacion() {
  const { idRegistro } = useParams();
  const consulta = useCallback(() => cargarCobro(idRegistro), [idRegistro]);
  const { datos, cargando, error, recargar } = useConsulta(consulta);

  const [idMetodo, setIdMetodo] = useState(null);
  const [referencia, setReferencia] = useState('');
  const [errores, setErrores] = useState({});
  // Liquidación pedida justo antes de confirmar; se muestra si es más nueva que la de la carga.
  const [liquidacionReciente, setLiquidacionReciente] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [calculando, setCalculando] = useState(false);
  // Liquidación que se muestra en el modal; mientras no sea null, el modal está abierto.
  const [porConfirmar, setPorConfirmar] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [recibo, setRecibo] = useState(null);

  // Se recalcula cada minuto, salvo con la pestaña oculta o en medio de la confirmación.
  // Con el recibo en pantalla (null) el intervalo se detiene.
  useIntervalo(
    () => {
      if (!document.hidden && !calculando && !porConfirmar && !enviando) {
        recargar();
      }
    },
    recibo ? null : INTERVALO_ACTUALIZACION_MS,
  );

  const liquidacion = datos ? masReciente(datos.liquidacion, liquidacionReciente) : null;
  const cobra = liquidacion ? hayCobro(liquidacion) : false;
  const metodo = datos?.metodos.find((opcion) => opcion.idMetodo === idMetodo) ?? null;

  function elegirMetodo(id) {
    setIdMetodo(id);
    setErrores({});
  }

  function cambiarReferencia(texto) {
    setReferencia(texto);
    setErrores((anteriores) => ({ ...anteriores, referencia: undefined }));
  }

  // Paso 2: validar y pedir el valor de este momento antes de abrir el modal.
  async function pedirConfirmacion() {
    const nuevosErrores = validarPago({ cobra, metodo, referencia });
    setErrores(nuevosErrores);
    setErrorEnvio(null);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }
    setCalculando(true);
    try {
      const fresca = await consultarLiquidacion(idRegistro);
      setLiquidacionReciente(fresca);
      if (hayCobro(fresca) && !cobra) {
        // Se veía $ 0, pero ya pasó el primer minuto: ahora hay que elegir cómo paga.
        setAviso(
          `Ya pasó el primer minuto: ahora se cobran ${formatearPesos(fresca.valorTotal)}. Elige el método de pago.`,
        );
        return;
      }
      setAviso(null);
      setPorConfirmar(fresca);
    } catch (errorConsulta) {
      setErrorEnvio(errorConsulta);
      recargar();
    } finally {
      setCalculando(false);
    }
  }

  // Paso 3: registrar la salida con lo que se confirmó en el modal.
  async function confirmar() {
    const cobraConfirmado = hayCobro(porConfirmar);
    setEnviando(true);
    try {
      const detalle = await registrarSalida(
        idRegistro,
        datosParaSalida({ cobra: cobraConfirmado, metodo, referencia }),
      );
      setRecibo(
        datosRecibo({
          detalle,
          liquidacion: porConfirmar,
          metodos: datos.metodos,
          tipoVehiculo: datos.tipoVehiculo,
        }),
      );
    } catch (errorSalida) {
      // El mensaje del backend va al panel (por ejemplo, una referencia repetida). Se recarga
      // la cuenta: si el parqueo ya estaba cerrado, la pantalla pasa a mostrar ese error.
      setErrorEnvio(errorSalida);
      recargar();
    } finally {
      setEnviando(false);
      setPorConfirmar(null);
    }
  }

  function contenido() {
    if (recibo) {
      return <ReciboSalida recibo={recibo} />;
    }
    if (cargando && !datos) {
      return <Cargando texto="Calculando la cuenta…" />;
    }
    if (error) {
      const definitivo = ESTADOS_DEFINITIVOS.includes(error.estado);
      return (
        <Alerta
          tipo="error"
          titulo={definitivo ? 'No se puede cobrar este parqueo' : 'No se pudo cargar la cuenta'}
          accion={
            definitivo ? (
              enlaceVolver
            ) : (
              <Boton variante="secundario" onClick={recargar}>
                Reintentar
              </Boton>
            )
          }
        >
          {error.mensaje}
        </Alerta>
      );
    }

    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <CuentaParqueo
          registro={datos.registro}
          liquidacion={liquidacion}
          tipoVehiculo={datos.tipoVehiculo}
          propietario={datos.propietario}
        />
        <PanelPago
          cobra={cobra}
          metodos={datos.metodos}
          idMetodo={idMetodo}
          onElegirMetodo={elegirMetodo}
          referencia={referencia}
          onCambiarReferencia={cambiarReferencia}
          errores={errores}
          aviso={aviso}
          errorEnvio={errorEnvio}
          calculando={calculando}
          onEnviar={pedirConfirmacion}
          className="lg:sticky lg:top-8"
        />
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden">
        <Link
          to="/salida"
          className="mb-3 inline-flex min-h-11 items-center gap-1 font-semibold text-senal hover:underline"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          Vehículos dentro
        </Link>
        <EncabezadoPagina
          titulo={recibo ? 'Salida registrada' : 'Cobrar salida'}
          descripcion={
            recibo
              ? 'Entrega el recibo al cliente o imprímelo.'
              : `Parqueo N.º ${idRegistro}: revisa la cuenta, elige cómo paga el cliente y confirma la salida.`
          }
        />
      </div>

      {contenido()}

      {porConfirmar && (
        <Modal
          abierto
          titulo="¿Confirmar el pago y la salida?"
          onCerrar={() => !enviando && setPorConfirmar(null)}
          acciones={
            <>
              <Boton
                variante="secundario"
                disabled={enviando}
                onClick={() => setPorConfirmar(null)}
              >
                Cancelar
              </Boton>
              <Boton cargando={enviando} onClick={confirmar}>
                {hayCobro(porConfirmar) ? 'Confirmar pago y salida' : 'Confirmar salida sin cobro'}
              </Boton>
            </>
          }
        >
          <p>
            {formatearPlaca(datos.registro.identificador)} sale del espacio{' '}
            {nombreEspacio(datos.registro)}.{' '}
            {hayCobro(porConfirmar) ? (
              <>
                Se cobran{' '}
                <strong className="tabular-nums">{formatearPesos(porConfirmar.valorTotal)}</strong>{' '}
                con {metodo.nombre}
                {metodo.requiereReferencia && `, referencia ${referencia.trim()}`}.
              </>
            ) : (
              'No se cobra: estuvo menos de un minuto.'
            )}
          </p>
          <p className="mt-2 text-tenue">Esto cierra el parqueo y no se puede deshacer.</p>
        </Modal>
      )}
    </>
  );
}

export default Liquidacion;
