import { MapPinPlus, SquareParking } from 'lucide-react';
import { useId, useState } from 'react';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Cargando from '../../../components/ui/Cargando.jsx';
import EstadoVacio from '../../../components/ui/EstadoVacio.jsx';
import Tabla from '../../../components/ui/Tabla.jsx';
import { useNotificaciones } from '../../../context/NotificacionesContext.js';
import { useConsulta } from '../../../hooks/useConsulta.js';
import { codigoEspacio } from '../../../utils/espacio.js';
import { nombreTipoVisible } from '../../../utils/tipoVehiculo.js';
import ModalAgregarEspacios from './ModalAgregarEspacios.jsx';
import ModalNuevaZona from './ModalNuevaZona.jsx';
import { cargarZonas, espaciosDisponibles, nombreDeZona, rangoActual } from './datosZonas.js';

/**
 * Sistema → Zonas y espacios (solo el DBA). Una zona es una letra dentro de un piso, para un
 * tipo de vehículo. Crear una zona en un piso que no existe crea el piso. Después se le
 * agregan espacios, que aparecen solos en el tablero y en Espacios.
 *
 * Las zonas y los espacios no se borran: un espacio se retira deshabilitándolo en Espacios.
 */
function Zonas() {
  const idTitulo = useId();
  const { datos, cargando, error, recargar } = useConsulta(cargarZonas);
  const { notificarExito } = useNotificaciones();
  // { tipo: 'nueva' } | { tipo: 'espacios', zona } | null
  const [modal, setModal] = useState(null);

  const pisos = [...new Set((datos?.zonas ?? []).map((zona) => zona.piso))];

  function zonaCreada(zona, pisoNuevo) {
    setModal(null);
    const nombre = nombreDeZona(zona);
    notificarExito(
      pisoNuevo
        ? `Zona ${nombre} creada: es la primera del piso ${zona.piso}. Ahora agrégale espacios.`
        : `Zona ${nombre} creada. Ahora agrégale espacios.`,
    );
    recargar();
  }

  function espaciosAgregados(zona, creados) {
    setModal(null);
    const codigos = creados.map(codigoEspacio);
    const rango =
      codigos.length === 1 ? codigos[0] : `${codigos[0]} a ${codigos[codigos.length - 1]}`;
    notificarExito(
      `Se ${creados.length === 1 ? 'agregó 1 espacio' : `agregaron ${creados.length} espacios`} a la zona ${nombreDeZona(zona)}: ${rango}.`,
    );
    recargar();
  }

  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando zonas…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudieron cargar las zonas"
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
    if (datos.zonas.length === 0) {
      return (
        <EstadoVacio
          icono={SquareParking}
          titulo="Todavía no hay zonas"
          descripcion="Crea la primera zona y después agrégale espacios."
        />
      );
    }
    return (
      <Tabla
        etiqueta="Lista de zonas"
        filas={datos.zonas}
        claveFila="idZona"
        columnas={[
          {
            clave: 'zona',
            titulo: 'Zona',
            fija: true,
            render: (zona) => (
              <span className="font-condensada text-xl font-bold">{nombreDeZona(zona)}</span>
            ),
          },
          { clave: 'piso', titulo: 'Piso' },
          {
            clave: 'tipo',
            titulo: 'Tipo de vehículo',
            render: (zona) => nombreTipoVisible(zona.tipoVehiculo),
          },
          {
            clave: 'espacios',
            titulo: 'Espacios',
            render: (zona) =>
              zona.espacios === 0 ? 'Sin espacios' : `${zona.espacios} (${rangoActual(zona)})`,
          },
          {
            clave: 'acciones',
            titulo: 'Acciones',
            render: (zona) => (
              <Boton
                variante="secundario"
                aria-label={`Agregar espacios a la zona ${nombreDeZona(zona)}`}
                disabled={espaciosDisponibles(zona) === 0}
                onClick={() => setModal({ tipo: 'espacios', zona })}
              >
                Agregar espacios
              </Boton>
            ),
          },
        ]}
      />
    );
  }

  return (
    <section aria-labelledby={idTitulo}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={idTitulo} className="font-condensada text-2xl font-semibold">
            Zonas y espacios
          </h2>
          <p className="text-tenue">
            Cada zona es una letra dentro de un piso. Un piso aparece cuando tiene su primera zona.
          </p>
        </div>
        <Boton icono={MapPinPlus} disabled={!datos} onClick={() => setModal({ tipo: 'nueva' })}>
          Nueva zona
        </Boton>
      </div>
      {contenido()}

      {modal?.tipo === 'nueva' && (
        <ModalNuevaZona
          tipos={datos.tipos}
          pisos={pisos}
          onCerrar={() => setModal(null)}
          onGuardado={zonaCreada}
        />
      )}
      {modal?.tipo === 'espacios' && (
        <ModalAgregarEspacios
          key={modal.zona.idZona}
          zona={modal.zona}
          onCerrar={() => setModal(null)}
          onGuardado={(creados) => espaciosAgregados(modal.zona, creados)}
        />
      )}
    </section>
  );
}

export default Zonas;
