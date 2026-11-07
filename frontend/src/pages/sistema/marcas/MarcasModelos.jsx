import { Plus, Tags } from 'lucide-react';
import { useId, useState } from 'react';
import { crearMarca, crearModelo, listarMarcas, listarModelos } from '../../../api/catalogos.js';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Cargando from '../../../components/ui/Cargando.jsx';
import EstadoVacio from '../../../components/ui/EstadoVacio.jsx';
import Tabla from '../../../components/ui/Tabla.jsx';
import { useNotificaciones } from '../../../context/NotificacionesContext.js';
import { useConsulta } from '../../../hooks/useConsulta.js';
import { SIN_DATO } from '../../../utils/formato.js';
import ModalNombre from './ModalNombre.jsx';

/** Largos de marca.nombre y modelo.nombre en la base (V001). */
const MAX_MARCA = 50;
const MAX_MODELO = 60;

/** Marcas y modelos en paralelo; cada marca con la lista de sus modelos. */
async function cargarMarcasYModelos() {
  const [marcas, modelos] = await Promise.all([listarMarcas(), listarModelos()]);
  return marcas.map((marca) => ({
    ...marca,
    modelos: modelos.filter((modelo) => modelo.idMarca === marca.idMarca).map((m) => m.nombre),
  }));
}

/**
 * Sistema → Marcas y modelos (solo el DBA): el catálogo que se usa al registrar un vehículo.
 * Si a un vehículo le falta su modelo, el operador lo registra sin modelo, el DBA lo agrega
 * aquí y el administrador edita el vehículo para asignárselo.
 */
function MarcasModelos() {
  const idTitulo = useId();
  const { datos, cargando, error, recargar } = useConsulta(cargarMarcasYModelos);
  const { notificarExito } = useNotificaciones();
  const [modal, setModal] = useState(null); // 'marca' | 'modelo' | null

  function guardado(mensaje) {
    setModal(null);
    notificarExito(mensaje);
    recargar();
  }

  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando marcas…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudieron cargar las marcas"
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
      return <EstadoVacio icono={Tags} titulo="Todavía no hay marcas" />;
    }
    return (
      <Tabla
        etiqueta="Lista de marcas"
        filas={datos}
        claveFila="idMarca"
        columnas={[
          {
            clave: 'nombre',
            titulo: 'Marca',
            fija: true,
            render: (marca) => <span className="font-semibold">{marca.nombre}</span>,
          },
          {
            clave: 'modelos',
            titulo: 'Modelos',
            render: (marca) => (marca.modelos.length ? marca.modelos.join(', ') : SIN_DATO),
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
            Marcas y modelos
          </h2>
          <p className="text-tenue">El catálogo que se elige al registrar un vehículo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" icono={Plus} onClick={() => setModal('marca')}>
            Nueva marca
          </Boton>
          <Boton icono={Plus} disabled={!datos?.length} onClick={() => setModal('modelo')}>
            Nuevo modelo
          </Boton>
        </div>
      </div>
      {contenido()}

      {modal === 'marca' && (
        <ModalNombre
          titulo="Nueva marca"
          textoBoton="Crear marca"
          maximo={MAX_MARCA}
          enviar={(nombre) => crearMarca(nombre)}
          onCerrar={() => setModal(null)}
          onGuardado={(marca) => guardado(`Marca ${marca.nombre} creada.`)}
        />
      )}
      {modal === 'modelo' && (
        <ModalNombre
          titulo="Nuevo modelo"
          textoBoton="Crear modelo"
          maximo={MAX_MODELO}
          marcas={datos}
          enviar={(nombre, idMarca) => crearModelo(idMarca, nombre)}
          onCerrar={() => setModal(null)}
          onGuardado={(modelo) => {
            const marca = datos.find((m) => m.idMarca === modelo.idMarca);
            guardado(`Modelo ${marca ? `${marca.nombre} ` : ''}${modelo.nombre} creado.`);
          }}
        />
      )}
    </section>
  );
}

export default MarcasModelos;
