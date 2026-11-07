import { SquareParking } from 'lucide-react';
import { useId, useState } from 'react';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';
import Insignia from '../../components/ui/Insignia.jsx';
import Interruptor from '../../components/ui/Interruptor.jsx';
import Placa from '../../components/ui/Placa.jsx';
import Tabla from '../../components/ui/Tabla.jsx';
import { useNotificaciones } from '../../context/NotificacionesContext.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import { codigoEspacio } from '../../utils/espacio.js';
import { SIN_DATO } from '../../utils/formato.js';
import ModalCambiarServicio from './ModalCambiarServicio.jsx';
import { agruparPorPiso, cargarEspacios, resumirEspacios } from './datosEspacios.js';

/** Tabla de los espacios de un piso. */
function TablaPiso({ piso, filas, onCambiar }) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo} className="mb-8">
      <h2 id={idTitulo} className="mb-3 font-condensada text-2xl font-semibold">
        Piso {piso}
      </h2>
      <Tabla
        etiqueta={`Espacios del piso ${piso}`}
        filas={filas}
        claveFila="codigo"
        // El interruptor va justo después del código: es la acción de esta pantalla y así se
        // alcanza en celular sin desplazar la tabla. La zona ya está en el código (A-01).
        columnas={[
          {
            clave: 'codigo',
            titulo: 'Espacio',
            fija: true,
            render: (fila) => (
              <span className="font-condensada text-xl font-bold">{fila.codigo}</span>
            ),
          },
          {
            clave: 'servicio',
            titulo: 'En servicio',
            render: (fila) => (
              <Interruptor
                activo={fila.espacio.habilitado}
                etiqueta={`En servicio ${fila.codigo}`}
                onCambiar={() => onCambiar(fila)}
              />
            ),
          },
          {
            clave: 'estado',
            titulo: 'Estado',
            render: (fila) => <Insignia estado={fila.estado} />,
          },
          { clave: 'tipo', titulo: 'Tipo' },
          {
            clave: 'vehiculo',
            titulo: 'Vehículo',
            render: (fila) =>
              fila.registro ? <Placa identificador={fila.registro.identificador} /> : SIN_DATO,
          },
        ]}
      />
    </section>
  );
}

/**
 * Administración de espacios: todos los espacios por piso, con su estado y un interruptor para
 * ponerlos fuera de servicio o volver a habilitarlos (siempre con confirmación).
 */
function Espacios() {
  const { datos, cargando, error, recargar } = useConsulta(cargarEspacios);
  // Fila del espacio que se va a cambiar; mientras no sea null, el modal está abierto.
  const [cambiando, setCambiando] = useState(null);
  const { notificarExito } = useNotificaciones();

  function cambiado(espacio) {
    setCambiando(null);
    recargar();
    notificarExito(
      `Espacio ${codigoEspacio(espacio)} ${espacio.habilitado ? 'habilitado' : 'deshabilitado'}.`,
    );
  }

  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando espacios…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudieron cargar los espacios"
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
    if (datos.length === 0) {
      return (
        <EstadoVacio
          icono={SquareParking}
          titulo="Todavía no hay espacios registrados"
          descripcion="Los espacios se crean en la base de datos (tabla espacio)."
        />
      );
    }
    return (
      <>
        <p aria-live="polite" className="mb-6 text-tenue">
          {resumirEspacios(datos)}.
        </p>
        {agruparPorPiso(datos).map(({ piso, filas }) => (
          <TablaPiso key={piso} piso={piso} filas={filas} onCambiar={setCambiando} />
        ))}
      </>
    );
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Administración de espacios"
        descripcion="Pon un espacio fuera de servicio (por mantenimiento, por ejemplo) o vuelve a habilitarlo."
      />
      {contenido()}
      {cambiando && (
        <ModalCambiarServicio
          // key: si se abre otro espacio, el modal empieza de cero.
          key={cambiando.espacio.idEspacio}
          fila={cambiando}
          onCerrar={() => setCambiando(null)}
          onCambiado={cambiado}
        />
      )}
    </>
  );
}

export default Espacios;
