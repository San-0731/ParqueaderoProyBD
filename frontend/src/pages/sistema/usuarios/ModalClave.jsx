import { useId, useState } from 'react';
import { cambiarClaveUsuario } from '../../../api/usuarios.js';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Campo from '../../../components/ui/Campo.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { errorClave } from './validacionesUsuario.js';

/**
 * Poner una contraseña nueva a un usuario (por ejemplo, si la olvidó). El backend cierra sus
 * sesiones abiertas: tiene que volver a entrar con la nueva.
 *
 * @param usuario a quién se le cambia
 * @param esYo si es quien tiene la sesión abierta (su sesión también se cerrará)
 * @param onGuardado se llama cuando el backend confirma el cambio
 */
function ModalClave({ usuario, esYo = false, onCerrar, onGuardado }) {
  const idFormulario = useId();
  const [clave, setClave] = useState('');
  const [error, setError] = useState();
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const mensaje = errorClave(clave);
    setError(mensaje);
    if (mensaje) {
      return;
    }
    setGuardando(true);
    setErrorEnvio(null);
    try {
      await cambiarClaveUsuario(usuario.idUsuario, clave);
      onGuardado();
    } catch (falla) {
      setErrorEnvio(falla);
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={`Cambiar la contraseña de ${usuario.nombreUsuario}`}
      onCerrar={() => !guardando && onCerrar()}
      acciones={
        <>
          <Boton variante="secundario" disabled={guardando} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando}>
            Cambiar contraseña
          </Boton>
        </>
      }
    >
      <form id={idFormulario} onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <p>
          {esYo
            ? 'Se cerrará tu sesión: vuelve a entrar con la contraseña nueva.'
            : 'Se cerrarán sus sesiones abiertas: tendrá que entrar con la contraseña nueva.'}
        </p>
        <Campo
          etiqueta="Contraseña nueva"
          type="password"
          ayuda="Mínimo 8 caracteres."
          error={error}
          value={clave}
          onChange={(evento) => {
            setClave(evento.target.value);
            setError(undefined);
          }}
          autoComplete="new-password"
        />
        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudo cambiar la contraseña">
            {errorEnvio.mensaje}
          </Alerta>
        )}
      </form>
    </Modal>
  );
}

export default ModalClave;
