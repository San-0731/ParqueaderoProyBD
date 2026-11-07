import { useId, useRef, useState } from 'react';
import { actualizarUsuario, crearUsuario } from '../../../api/usuarios.js';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Campo from '../../../components/ui/Campo.jsx';
import Interruptor from '../../../components/ui/Interruptor.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Selector from '../../../components/ui/Selector.jsx';
import {
  MAX_NOMBRE_COMPLETO,
  OPCIONES_ROL,
  validarCambioUsuario,
  validarUsuarioNuevo,
} from './validacionesUsuario.js';

/**
 * Crear un usuario (sin `usuario`) o editar uno (con `usuario`).
 *
 * - Al crear se piden el nombre de usuario, el nombre completo, el rol y la contraseña inicial
 *   (el DBA se la entrega a la persona).
 * - Al editar, el nombre de usuario no se cambia (es con lo que inicia sesión); se cambian el
 *   nombre completo, el rol y si puede iniciar sesión.
 * - Un 409 al crear (nombre de usuario repetido) va junto a su campo; los demás errores del
 *   backend (por ejemplo, "Debe quedar al menos un DBA activo"), en una alerta.
 *
 * @param usuario el usuario a editar, o undefined para crear uno nuevo
 * @param esYo si el usuario a editar es quien tiene la sesión abierta
 * @param onGuardado recibe el usuario creado o actualizado
 */
function ModalUsuario({ usuario, esYo = false, onCerrar, onGuardado }) {
  const editando = Boolean(usuario);
  const idFormulario = useId();
  const refNombreUsuario = useRef(null);
  const [valores, setValores] = useState({
    nombreUsuario: '',
    nombreCompleto: usuario?.nombreCompleto ?? '',
    rol: usuario?.rol ?? '',
    clave: '',
    activo: usuario?.activo ?? true,
  });
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  };

  // Quitarse el rol DBA o desactivarse a sí mismo cierra la propia sesión.
  const pierdeSuSesion = esYo && (valores.rol !== 'DBA' || !valores.activo);

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const nuevosErrores = editando ? validarCambioUsuario(valores) : validarUsuarioNuevo(valores);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    setGuardando(true);
    setErrorEnvio(null);
    try {
      const guardado = editando
        ? await actualizarUsuario(usuario.idUsuario, {
            nombreCompleto: valores.nombreCompleto.trim(),
            rol: valores.rol,
            activo: valores.activo,
          })
        : await crearUsuario({
            nombreUsuario: valores.nombreUsuario.trim(),
            nombreCompleto: valores.nombreCompleto.trim(),
            rol: valores.rol,
            clave: valores.clave,
          });
      onGuardado(guardado);
    } catch (error) {
      if (!editando && error.estado === 409) {
        // Al crear, lo único que no se puede repetir es el nombre de usuario.
        setErrores({ nombreUsuario: error.mensaje });
        refNombreUsuario.current?.focus();
      } else {
        setErrorEnvio(error);
      }
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={editando ? `Editar el usuario ${usuario.nombreUsuario}` : 'Nuevo usuario'}
      onCerrar={() => !guardando && onCerrar()}
      acciones={
        <>
          <Boton variante="secundario" disabled={guardando} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </Boton>
        </>
      }
    >
      <form id={idFormulario} onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {!editando && (
          <Campo
            ref={refNombreUsuario}
            etiqueta="Nombre de usuario"
            ayuda="Con esto inicia sesión. Minúsculas, números, punto o guion bajo (ana.perez). No se puede cambiar después."
            error={errores.nombreUsuario}
            value={valores.nombreUsuario}
            onChange={cambiar('nombreUsuario')}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        )}
        <Campo
          etiqueta="Nombre completo"
          error={errores.nombreCompleto}
          value={valores.nombreCompleto}
          onChange={cambiar('nombreCompleto')}
          maxLength={MAX_NOMBRE_COMPLETO}
          autoComplete="off"
        />
        <Selector
          etiqueta="Rol"
          placeholder="Elige un rol"
          opciones={OPCIONES_ROL}
          ayuda="Operador: entradas y salidas. Administrador: además edita, reportes y espacios. DBA: además el sistema."
          error={errores.rol}
          value={valores.rol}
          onChange={cambiar('rol')}
        />
        {!editando && (
          <Campo
            etiqueta="Contraseña inicial"
            type="password"
            ayuda="Mínimo 8 caracteres. Entrégasela a la persona: no se vuelve a mostrar."
            error={errores.clave}
            value={valores.clave}
            onChange={cambiar('clave')}
            autoComplete="new-password"
          />
        )}
        {editando && (
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Puede iniciar sesión</span>
            <Interruptor
              activo={valores.activo}
              etiqueta="Puede iniciar sesión"
              onCambiar={() =>
                setValores((anteriores) => ({ ...anteriores, activo: !anteriores.activo }))
              }
            />
          </div>
        )}
        {pierdeSuSesion && (
          <Alerta tipo="aviso">
            Este es tu usuario: si te quitas el rol DBA o te desactivas, se cerrará tu sesión.
          </Alerta>
        )}
        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudo guardar el usuario">
            {errorEnvio.mensaje}
          </Alerta>
        )}
      </form>
    </Modal>
  );
}

export default ModalUsuario;
