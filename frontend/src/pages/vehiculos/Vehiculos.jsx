import { CarFront, ChevronLeft, Plus, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Campo from '../../components/ui/Campo.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';
import { useNotificaciones } from '../../context/NotificacionesContext.js';
import { useSesion } from '../../context/SesionContext.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import {
  formatearPlaca,
  normalizarIdentificador,
  validarIdentificador,
} from '../../utils/identificador.js';
import FichaVehiculo from './FichaVehiculo.jsx';
import ListaVehiculos from './ListaVehiculos.jsx';
import ModalEditarPropietario from './ModalEditarPropietario.jsx';
import ModalEditarVehiculo from './ModalEditarVehiculo.jsx';
import NuevoVehiculo from './NuevoVehiculo.jsx';
import {
  cargarVehiculos,
  contarVehiculos,
  filtrarFilas,
  nombrePropietario,
} from './datosVehiculos.js';

/**
 * Vehículos y propietarios: la lista a la izquierda y la ficha del elegido a la derecha.
 *
 * - Lo que se ve está en la URL: ?id=12 (vehículo elegido) o ?nuevo=KLM999 (registro). Así se
 *   puede recargar la página sin perderlo.
 * - En celular se ve una cosa a la vez: la lista, o la ficha con "Volver a la lista".
 * - Editar el vehículo y editar el propietario son dos modales distintos: un propietario puede
 *   tener varios vehículos y el cambio se ve en todos.
 */
function Vehiculos() {
  const puedeEditar = useSesion().puede('ADMINISTRADOR');
  const { datos, cargando, error, recargar } = useConsulta(cargarVehiculos);
  const [parametros, setParametros] = useSearchParams();
  const [texto, setTexto] = useState('');
  // Modal abierto: 'vehiculo', 'propietario' o null.
  const [editando, setEditando] = useState(null);
  const { notificarExito } = useNotificaciones();

  const idElegido = Number(parametros.get('id')) || null;
  const creando = parametros.has('nuevo');
  const panelAbierto = creando || idElegido !== null;

  const elegir = (idVehiculo) => setParametros({ id: String(idVehiculo) }, { replace: true });
  const abrirNuevo = (placa = '') => setParametros({ nuevo: placa }, { replace: true });
  const volverALista = () => setParametros({}, { replace: true });

  const filas = datos?.filas ?? [];
  const filtradas = filtrarFilas(filas, texto);
  const elegida = filas.find((fila) => fila.vehiculo.idVehiculo === idElegido) ?? null;

  // Enter en el buscador con un solo resultado lo abre.
  function abrirUnico(evento) {
    evento.preventDefault();
    if (filtradas.length === 1) {
      elegir(filtradas[0].vehiculo.idVehiculo);
    }
  }

  function registrado({ vehiculo }) {
    recargar();
    setTexto('');
    elegir(vehiculo.idVehiculo);
    notificarExito(`Vehículo ${formatearPlaca(vehiculo.identificador)} registrado.`);
  }

  function vehiculoGuardado(vehiculo) {
    setEditando(null);
    recargar();
    notificarExito(`Vehículo ${formatearPlaca(vehiculo.identificador)} actualizado.`);
  }

  function propietarioGuardado(cliente) {
    setEditando(null);
    recargar();
    notificarExito(`Propietario ${nombrePropietario(cliente)} actualizado.`);
  }

  // Columna izquierda: buscador y lista.
  function lista() {
    const placaBuscada = normalizarIdentificador(texto);
    const puedeRegistrar = placaBuscada !== '' && validarIdentificador(placaBuscada) === null;
    return (
      <>
        <form role="search" onSubmit={abrirUnico} className="mb-4 flex flex-col gap-2">
          <Campo
            etiqueta="Buscar placa, documento o nombre"
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            autoComplete="off"
            enterKeyHint="go"
          />
          <p aria-live="polite" className="text-sm text-tenue">
            {texto.trim()
              ? `${filtradas.length} de ${contarVehiculos(filas.length)}`
              : contarVehiculos(filas.length)}
          </p>
        </form>
        {filtradas.length > 0 ? (
          <ListaVehiculos filas={filtradas} idElegido={idElegido} onElegir={elegir} />
        ) : (
          <EstadoVacio
            icono={SearchX}
            titulo={`Ningún vehículo coincide con "${texto.trim()}"`}
            descripcion="Revisa la placa, el documento o el nombre."
            accion={
              puedeRegistrar && (
                <Boton icono={Plus} onClick={() => abrirNuevo(placaBuscada)}>
                  Registrar {formatearPlaca(placaBuscada)}
                </Boton>
              )
            }
          />
        )}
      </>
    );
  }

  // Columna derecha: la ficha, el registro de uno nuevo o la invitación a elegir.
  function panel() {
    if (creando) {
      return (
        <NuevoVehiculo
          // key: si se pide registrar otra placa, el formulario empieza de cero.
          key={parametros.get('nuevo')}
          placaInicial={parametros.get('nuevo')}
          filas={filas}
          marcas={datos.marcas}
          modelos={datos.modelos}
          onRegistrado={registrado}
          onVerExistente={elegir}
        />
      );
    }
    if (elegida) {
      return (
        <FichaVehiculo
          fila={elegida}
          // Solo el administrador (o el DBA) edita; al operador no se le muestran los botones.
          onEditarVehiculo={puedeEditar ? () => setEditando('vehiculo') : undefined}
          onEditarPropietario={puedeEditar ? () => setEditando('propietario') : undefined}
          onElegir={elegir}
        />
      );
    }
    if (idElegido !== null) {
      return (
        <Alerta tipo="aviso" titulo="Vehículo no encontrado">
          No hay un vehículo con el número {idElegido}. Elige uno de la lista.
        </Alerta>
      );
    }
    return (
      <EstadoVacio
        icono={CarFront}
        titulo="Elige un vehículo"
        descripcion="Su ficha aparece aquí, con sus datos y los de su propietario."
      />
    );
  }

  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando vehículos…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudo cargar la lista de vehículos"
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
    if (filas.length === 0 && !creando) {
      return (
        <EstadoVacio
          icono={CarFront}
          titulo="Todavía no hay vehículos registrados"
          descripcion="Registra el primero con su placa y su propietario."
          accion={
            <Boton icono={Plus} onClick={() => abrirNuevo()}>
              Nuevo vehículo
            </Boton>
          }
        />
      );
    }

    return (
      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* En celular, con un panel abierto se oculta la lista (y al revés). */}
        <div className={panelAbierto ? 'hidden lg:block' : ''}>{lista()}</div>
        <div className={`lg:sticky lg:top-8 ${panelAbierto ? '' : 'hidden lg:block'}`}>
          <Boton
            variante="secundario"
            icono={ChevronLeft}
            onClick={volverALista}
            className="mb-4 lg:hidden"
          >
            Volver a la lista
          </Boton>
          {panel()}
        </div>
      </div>
    );
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Vehículos y propietarios"
        descripcion="Busca un vehículo para ver su ficha, corregir sus datos o los de su propietario."
        acciones={
          <Boton icono={Plus} onClick={() => abrirNuevo()}>
            Nuevo vehículo
          </Boton>
        }
      />
      {contenido()}

      {editando === 'vehiculo' && elegida && (
        <ModalEditarVehiculo
          fila={elegida}
          marcas={datos.marcas}
          modelos={datos.modelos}
          onCerrar={() => setEditando(null)}
          onGuardado={vehiculoGuardado}
        />
      )}
      {editando === 'propietario' && elegida?.propietario && (
        <ModalEditarPropietario
          propietario={elegida.propietario}
          cantidadVehiculos={elegida.otrosVehiculos.length + 1}
          onCerrar={() => setEditando(null)}
          onGuardado={propietarioGuardado}
        />
      )}
    </>
  );
}

export default Vehiculos;
