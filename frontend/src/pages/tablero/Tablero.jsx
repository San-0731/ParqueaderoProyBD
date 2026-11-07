import { RefreshCw, SquareParking } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';
import IconoActualizando from '../../components/ui/IconoActualizando.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { clasesBoton } from '../../components/ui/estilos.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import { useIntervalo } from '../../hooks/useIntervalo.js';
import { formatearHora } from '../../utils/formato.js';
import CuadriculaEspacios from './CuadriculaEspacios.jsx';
import LetreroCupos from './LetreroCupos.jsx';
import { agruparPorPisoYZona, cargarTablero, tipoElegido } from './datosTablero.js';

/** Cada cuánto se actualiza solo el tablero. */
const INTERVALO_ACTUALIZACION_MS = 30_000;

/**
 * Tablero de espacios (pantalla de inicio): el letrero de cupos libres por tipo y la
 * cuadrícula de espacios por piso y zona. Un espacio libre lleva a registrar la entrada y uno
 * ocupado a la liquidación de su salida.
 *
 * - Se actualiza solo cada 30 s (si la pestaña está visible) y con el botón "Actualizar".
 * - El filtro por tipo vive en la URL (?tipo=3): sobrevive a recargar la página.
 */
function Tablero() {
  const { datos, cargando, error, recargar } = useConsulta(cargarTablero);
  const [parametros, setParametros] = useSearchParams();
  // Espacio deshabilitado que se tocó: mientras no sea null, el aviso está abierto.
  const [espacioAviso, setEspacioAviso] = useState(null);

  // Si la pestaña está oculta no se consulta: se espera a la siguiente vuelta.
  useIntervalo(() => {
    if (!document.hidden) {
      recargar();
    }
  }, INTERVALO_ACTUALIZACION_MS);

  // Lo que va debajo del encabezado: cargando, error, vacío o el tablero.
  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando espacios…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudo cargar el tablero"
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
    if (datos.espacios.length === 0) {
      return (
        <EstadoVacio
          icono={SquareParking}
          titulo="Todavía no hay espacios registrados"
          descripcion="Los espacios se crean en la base de datos (tabla espacio)."
        />
      );
    }

    const idTipo = tipoElegido(parametros.get('tipo'), datos.ocupacion);
    const elegirTipo = (nuevoTipo) =>
      setParametros(nuevoTipo === null ? {} : { tipo: String(nuevoTipo) }, { replace: true });

    return (
      <>
        <LetreroCupos ocupacion={datos.ocupacion} idTipo={idTipo} onElegir={elegirTipo} />
        <CuadriculaEspacios
          pisos={agruparPorPisoYZona({ ...datos, idTipo })}
          onDeshabilitado={setEspacioAviso}
        />
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
        titulo="Tablero de espacios"
        descripcion="Espacios libres, ocupados y deshabilitados, por piso y zona."
        acciones={acciones}
      />
      {contenido()}
      {espacioAviso && (
        <Modal
          abierto
          titulo={`Espacio ${espacioAviso.codigo} deshabilitado`}
          onCerrar={() => setEspacioAviso(null)}
          acciones={
            <>
              <Link to="/espacios" className={clasesBoton({ variante: 'secundario' })}>
                Ir a administración de espacios
              </Link>
              <Boton onClick={() => setEspacioAviso(null)}>Entendido</Boton>
            </>
          }
        >
          <p>
            Está fuera de servicio y no recibe vehículos. Para volver a usarlo, habilítalo en
            Administración de espacios.
          </p>
        </Modal>
      )}
    </>
  );
}

export default Tablero;
