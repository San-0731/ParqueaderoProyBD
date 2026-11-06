import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import { useNotificaciones } from '../../context/NotificacionesContext.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import { registrarEntrada } from '../../api/registros.js';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearHora } from '../../utils/formato.js';
import {
  formatearPlaca,
  normalizarIdentificador,
  validarIdentificador,
} from '../../utils/identificador.js';
import { buscarVehiculo, calcularVista, cargarDatosEntrada } from './datosEntrada.js';
import PasoEspacio from './PasoEspacio.jsx';
import PasoVehiculo from './PasoVehiculo.jsx';
import ResumenEntrada from './ResumenEntrada.jsx';

/**
 * Registrar entrada: 1) buscar el vehículo (o registrarlo si es nuevo), 2) elegir un espacio
 * libre de su tipo y 3) confirmar. Si se llega desde el tablero (?idEspacio=3), ese espacio
 * viene elegido. Todo lo que se muestra se calcula a partir del estado; no hay efectos.
 */
function Entrada() {
  const { datos, cargando, error, recargar } = useConsulta(cargarDatosEntrada);
  const { notificarExito } = useNotificaciones();
  const [parametros, setParametros] = useSearchParams();
  const campoPlaca = useRef(null);

  const [texto, setTexto] = useState('');
  const [errorTexto, setErrorTexto] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState(null);
  // null (sin buscar) o { identificador, ficha }; ficha es null si el vehículo no existe.
  const [resultado, setResultado] = useState(null);
  // Espacio que el operador tocó (tiene prioridad sobre el que llegó desde el tablero).
  const [eleccion, setEleccion] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);

  function cambiarTexto(evento) {
    const identificador = normalizarIdentificador(evento.target.value);
    setTexto(identificador);
    setErrorTexto(null);
    // Si se cambia la placa buscada, el resultado anterior ya no aplica.
    if (resultado && resultado.identificador !== identificador) {
      setResultado(null);
    }
  }

  async function buscar(evento) {
    evento.preventDefault();
    const mensaje = validarIdentificador(texto);
    setErrorTexto(mensaje);
    if (mensaje || buscando) {
      return;
    }
    const identificador = normalizarIdentificador(texto);
    setBuscando(true);
    setErrorBusqueda(null);
    setErrorEnvio(null);
    try {
      setResultado({ identificador, ficha: await buscarVehiculo(identificador) });
    } catch (errorApi) {
      setResultado(null);
      setErrorBusqueda(errorApi);
    } finally {
      setBuscando(false);
    }
  }

  // "Corregir placa" y "Cambiar vehículo": el foco vuelve al buscador con el texto seleccionado.
  function corregir() {
    campoPlaca.current?.focus();
    campoPlaca.current?.select();
  }

  function registrado(ficha) {
    setResultado({ identificador: ficha.vehiculo.identificador, ficha });
    notificarExito(`Vehículo ${formatearPlaca(ficha.vehiculo.identificador)} registrado.`);
  }

  async function confirmar(idEspacio) {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const registro = await registrarEntrada({
        identificador: resultado.identificador,
        idEspacio,
      });
      notificarExito(
        `Entrada registrada: ${formatearPlaca(registro.identificador)} en ` +
          `${nombreEspacio(registro)}, a las ${formatearHora(registro.entrada)}`,
      );
      // Listo para el siguiente vehículo.
      setTexto('');
      setResultado(null);
      setEleccion(null);
      setParametros({}, { replace: true });
      recargar();
      campoPlaca.current?.focus();
    } catch (errorApi) {
      setErrorEnvio(errorApi);
      // Un 409 puede ser "espacio ocupado": se recargan los espacios para quitarlo.
      if (errorApi?.estado === 409) {
        recargar();
      }
    } finally {
      setEnviando(false);
    }
  }

  const encabezado = (
    <EncabezadoPagina
      titulo="Registrar entrada"
      descripcion="Busca el vehículo por su placa, elige un espacio libre de su tipo y confirma."
    />
  );

  if (cargando && !datos) {
    return (
      <>
        {encabezado}
        <Cargando texto="Cargando espacios y catálogos…" />
      </>
    );
  }
  if (error) {
    return (
      <>
        {encabezado}
        <Alerta
          tipo="error"
          titulo="No se pudo cargar la pantalla"
          accion={
            <Boton variante="secundario" onClick={recargar}>
              Reintentar
            </Boton>
          }
        >
          {error.mensaje}
        </Alerta>
      </>
    );
  }

  // Todo lo que se muestra se calcula a partir del estado (función pura de datosEntrada.js).
  const {
    ficha,
    listo,
    tipoVehiculo,
    espaciosLibres,
    espacioElegido,
    espacioDelTablero,
    espacioResumen,
    faltantes,
    motivoInactivo,
    aviso,
  } = calcularVista({
    datos,
    resultado,
    eleccion,
    textoPreseleccion: parametros.get('idEspacio'),
  });

  return (
    <>
      {encabezado}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <PasoVehiculo
            ref={campoPlaca}
            texto={texto}
            onCambiarTexto={cambiarTexto}
            errorTexto={errorTexto}
            buscando={buscando}
            onBuscar={buscar}
            errorBusqueda={errorBusqueda}
            resultado={resultado}
            catalogos={datos}
            idTipoSugerido={espacioDelTablero?.idTipo}
            onRegistrado={registrado}
            onCorregir={corregir}
          />
          <PasoEspacio
            activo={listo}
            motivoInactivo={motivoInactivo}
            tipoVehiculo={tipoVehiculo}
            espacios={espaciosLibres}
            idElegido={espacioElegido?.idEspacio ?? null}
            onElegir={setEleccion}
            aviso={aviso}
          />
        </div>
        <ResumenEntrada
          identificador={resultado?.identificador}
          tipoVehiculo={tipoVehiculo}
          espacio={espacioResumen}
          desdeTablero={Boolean(espacioResumen) && espacioResumen === espacioDelTablero}
          faltantes={faltantes}
          bloqueo={ficha?.registroActivo ? 'El vehículo ya está dentro.' : null}
          enviando={enviando}
          errorEnvio={errorEnvio}
          onConfirmar={() => confirmar(espacioElegido.idEspacio)}
          className="lg:sticky lg:top-8"
        />
      </div>
    </>
  );
}

export default Entrada;
