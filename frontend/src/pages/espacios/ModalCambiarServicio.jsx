import { useState } from 'react';
import { cambiarHabilitadoEspacio } from '../../api/espacios.js';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearPlaca } from '../../utils/identificador.js';

/**
 * Confirmación para poner un espacio fuera de servicio o volver a habilitarlo.
 *
 * Si el espacio está ocupado y se va a deshabilitar, avisa que ese vehículo puede salir
 * normalmente (el backend y el trigger de V005 lo permiten): solo no entrarán otros.
 *
 * @param fila fila de armarFilas (datosEspacios.js)
 * @param onCambiado recibe el espacio actualizado que devolvió el backend
 */
function ModalCambiarServicio({ fila, onCerrar, onCambiado }) {
  const { espacio, registro } = fila;
  const deshabilitar = espacio.habilitado;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const actualizado = await cambiarHabilitadoEspacio(espacio.idEspacio, !espacio.habilitado);
      onCambiado(actualizado);
    } catch (errorApi) {
      setError(errorApi);
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={`¿${deshabilitar ? 'Deshabilitar' : 'Habilitar'} el espacio ${nombreEspacio(espacio)}?`}
      onCerrar={() => !enviando && onCerrar()}
      acciones={
        <>
          <Boton variante="secundario" disabled={enviando} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante={deshabilitar ? 'peligro' : 'primario'}
            cargando={enviando}
            onClick={confirmar}
          >
            {deshabilitar ? 'Deshabilitar' : 'Habilitar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>
          {deshabilitar
            ? 'No recibirá vehículos hasta que lo vuelvas a habilitar. En el tablero se verá con rayas.'
            : 'Volverá a recibir vehículos.'}
        </p>
        {deshabilitar && registro && (
          <Alerta
            tipo="aviso"
            titulo={`Ahora está ocupado por ${formatearPlaca(registro.identificador)}`}
          >
            Ese vehículo puede salir normalmente; solo no entrarán otros.
          </Alerta>
        )}
        {error && (
          <Alerta tipo="error" titulo="No se pudo cambiar el espacio">
            {error.mensaje}
          </Alerta>
        )}
      </div>
    </Modal>
  );
}

export default ModalCambiarServicio;
