import { CircleCheck, CircleSlash, UserPlus, UsersRound } from 'lucide-react';
import { useId, useState } from 'react';
import { listarUsuarios } from '../../../api/usuarios.js';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Cargando from '../../../components/ui/Cargando.jsx';
import EstadoVacio from '../../../components/ui/EstadoVacio.jsx';
import Tabla from '../../../components/ui/Tabla.jsx';
import { useNotificaciones } from '../../../context/NotificacionesContext.js';
import { useSesion } from '../../../context/SesionContext.js';
import { useConsulta } from '../../../hooks/useConsulta.js';
import { nombreRol } from '../../../utils/roles.js';
import ModalClave from './ModalClave.jsx';
import ModalUsuario from './ModalUsuario.jsx';

/** Activo o desactivado, con ícono y texto (no solo color). */
function EstadoUsuario({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1.5 font-medium text-libre">
      <CircleCheck aria-hidden="true" className="size-4" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-medium text-tenue">
      <CircleSlash aria-hidden="true" className="size-4" />
      Desactivado
    </span>
  );
}

/**
 * Sistema → Usuarios (solo el DBA): las cuentas de la aplicación. Se crean, se editan (nombre,
 * rol y si pueden iniciar sesión) y se les cambia la contraseña. No se borran: se desactivan,
 * porque la auditoría guarda quién hizo cada cambio.
 */
function Usuarios() {
  const { usuario: yo } = useSesion();
  const idTitulo = useId();
  const { datos, cargando, error, recargar } = useConsulta(listarUsuarios);
  const { notificarExito } = useNotificaciones();
  // { tipo: 'nuevo' } | { tipo: 'editar', usuario } | { tipo: 'clave', usuario } | null
  const [modal, setModal] = useState(null);

  const esYo = (usuario) => usuario?.idUsuario === yo?.idUsuario;

  function guardado(mensaje) {
    setModal(null);
    notificarExito(mensaje);
    // Si el DBA se quitó a sí mismo el acceso, esta consulta recibe 401 y la sesión se cierra.
    recargar();
  }

  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando usuarios…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudieron cargar los usuarios"
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
      return <EstadoVacio icono={UsersRound} titulo="Todavía no hay usuarios" />;
    }
    return (
      <Tabla
        etiqueta="Lista de usuarios"
        filas={datos}
        claveFila="idUsuario"
        columnas={[
          {
            clave: 'nombreUsuario',
            titulo: 'Usuario',
            fija: true,
            render: (usuario) => (
              <span className="font-semibold">
                {usuario.nombreUsuario}
                {esYo(usuario) && <span className="font-normal text-tenue"> (tú)</span>}
              </span>
            ),
          },
          { clave: 'nombreCompleto', titulo: 'Nombre' },
          { clave: 'rol', titulo: 'Rol', render: (usuario) => nombreRol(usuario.rol) },
          {
            clave: 'activo',
            titulo: 'Estado',
            render: (usuario) => <EstadoUsuario activo={usuario.activo} />,
          },
          {
            clave: 'acciones',
            titulo: 'Acciones',
            render: (usuario) => (
              <div className="flex gap-2">
                {/* Sin íconos: así las dos acciones caben sin desplazar la tabla. */}
                <Boton
                  variante="secundario"
                  aria-label={`Editar ${usuario.nombreUsuario}`}
                  onClick={() => setModal({ tipo: 'editar', usuario })}
                >
                  Editar
                </Boton>
                <Boton
                  variante="secundario"
                  aria-label={`Cambiar la contraseña de ${usuario.nombreUsuario}`}
                  onClick={() => setModal({ tipo: 'clave', usuario })}
                >
                  Contraseña
                </Boton>
              </div>
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
            Usuarios
          </h2>
          <p className="text-tenue">Quién puede entrar a la aplicación y con qué rol.</p>
        </div>
        <Boton icono={UserPlus} onClick={() => setModal({ tipo: 'nuevo' })}>
          Nuevo usuario
        </Boton>
      </div>
      {contenido()}

      {modal?.tipo === 'nuevo' && (
        <ModalUsuario
          onCerrar={() => setModal(null)}
          onGuardado={(creado) =>
            guardado(`Usuario ${creado.nombreUsuario} creado. Entrégale su contraseña inicial.`)
          }
        />
      )}
      {modal?.tipo === 'editar' && (
        <ModalUsuario
          key={modal.usuario.idUsuario}
          usuario={modal.usuario}
          esYo={esYo(modal.usuario)}
          onCerrar={() => setModal(null)}
          onGuardado={(actualizado) =>
            guardado(`Usuario ${actualizado.nombreUsuario} actualizado.`)
          }
        />
      )}
      {modal?.tipo === 'clave' && (
        <ModalClave
          key={modal.usuario.idUsuario}
          usuario={modal.usuario}
          esYo={esYo(modal.usuario)}
          onCerrar={() => setModal(null)}
          onGuardado={() => guardado(`Contraseña de ${modal.usuario.nombreUsuario} cambiada.`)}
        />
      )}
    </section>
  );
}

export default Usuarios;
