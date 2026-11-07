import { CarFront, RefreshCw, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Campo from '../../components/ui/Campo.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';
import IconoActualizando from '../../components/ui/IconoActualizando.jsx';
import { clasesBoton } from '../../components/ui/estilos.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import { useIntervalo } from '../../hooks/useIntervalo.js';
import { formatearHora } from '../../utils/formato.js';
import { normalizarIdentificador } from '../../utils/identificador.js';
import FilaVehiculoDentro from './FilaVehiculoDentro.jsx';
import { cargarActivos, contarVehiculos, filtrarActivos } from './datosSalida.js';

/** Cada cuánto se vuelve a consultar: el servidor entrega los minutos al día. */
const INTERVALO_ACTUALIZACION_MS = 60_000;

const enlaceEntrada = (
  <Link to="/entrada" className={clasesBoton({ variante: 'secundario' })}>
    Registrar entrada
  </Link>
);

/**
 * Vehículos dentro: la lista de registros activos para elegir a cuál cobrarle la salida.
 *
 * - Se actualiza sola cada minuto (si la pestaña está visible) y con "Actualizar".
 * - El buscador filtra por parte de la placa; si queda un solo vehículo, Enter abre su cobro
 *   (el cajero escribe la placa y pulsa Enter).
 */
function Salida() {
  const { datos, cargando, error, recargar } = useConsulta(cargarActivos);
  const [texto, setTexto] = useState('');
  const navegar = useNavigate();

  useIntervalo(() => {
    if (!document.hidden) {
      recargar();
    }
  }, INTERVALO_ACTUALIZACION_MS);

  const filtrados = datos ? filtrarActivos(datos.activos, texto) : [];

  function abrirUnico(evento) {
    evento.preventDefault();
    if (filtrados.length === 1) {
      navegar(`/salida/${filtrados[0].idRegistro}`);
    }
  }

  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando vehículos dentro…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudo cargar la lista"
          accion={
            <Boton variante="secundario" onClick={recargar}>
              Reintentar
            </Boton>
          }
        >
          {error.mensaje}
        </Alerta>
      );
    }
    if (datos.activos.length === 0) {
      return (
        <EstadoVacio
          icono={CarFront}
          titulo="No hay vehículos dentro"
          descripcion="Cuando registres una entrada, el vehículo aparecerá aquí para cobrar su salida."
          accion={enlaceEntrada}
        />
      );
    }

    return (
      <>
        <form
          role="search"
          onSubmit={abrirUnico}
          className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <Campo
            etiqueta="Buscar placa o código"
            ayuda="Con un solo resultado, Enter abre su cobro."
            type="search"
            value={texto}
            onChange={(evento) => setTexto(normalizarIdentificador(evento.target.value))}
            autoComplete="off"
            enterKeyHint="go"
            className="sm:w-80"
          />
          <p aria-live="polite" className="text-sm text-tenue sm:pb-7">
            {texto
              ? `${filtrados.length} de ${contarVehiculos(datos.activos.length)}`
              : `${contarVehiculos(datos.activos.length)} dentro`}
          </p>
        </form>

        {filtrados.length === 0 ? (
          <EstadoVacio
            icono={SearchX}
            titulo={`Ningún vehículo dentro coincide con ${texto}`}
            descripcion="Revisa la placa. Si el vehículo todavía no ha entrado, registra su entrada."
            accion={enlaceEntrada}
          />
        ) : (
          <ul aria-label="Vehículos dentro" className="flex flex-col gap-3">
            {filtrados.map((activo) => (
              <FilaVehiculoDentro key={activo.idRegistro} activo={activo} />
            ))}
          </ul>
        )}
      </>
    );
  }

  const acciones = (
    <>
      {datos && (
        <p className="self-center text-sm text-tenue">
          Actualizado a las {formatearHora(datos.actualizado)}
        </p>
      )}
      <Boton
        variante="secundario"
        icono={cargando ? IconoActualizando : RefreshCw}
        aria-busy={cargando || undefined}
        onClick={recargar}
      >
        Actualizar
      </Boton>
    </>
  );

  return (
    <>
      <EncabezadoPagina
        titulo="Vehículos dentro"
        descripcion="Vehículos que están en el parqueadero. Elige uno para cobrar su salida."
        acciones={acciones}
      />
      {contenido()}
    </>
  );
}

export default Salida;
