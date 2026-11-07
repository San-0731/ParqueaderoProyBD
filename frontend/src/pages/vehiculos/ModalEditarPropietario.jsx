import { useId, useRef, useState } from 'react';
import { actualizarCliente } from '../../api/clientes.js';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Campo from '../../components/ui/Campo.jsx';
import Modal from '../../components/ui/Modal.jsx';
import {
  clienteParaApi,
  MAX_APELLIDOS,
  MAX_NOMBRES,
  validarPropietarioNuevo,
} from '../../components/vehiculos/validaciones.js';

/**
 * Editar el propietario de un vehículo: documento, nombres, apellidos y teléfono, con las
 * mismas reglas del backend. Si tiene varios vehículos, avisa que el cambio se verá en todos.
 *
 * Un 409 (documento que ya tiene otro propietario) se muestra junto al campo Documento; los
 * demás errores del backend, en una alerta.
 *
 * @param propietario el cliente como está guardado
 * @param cantidadVehiculos cuántos vehículos tiene a su nombre
 * @param onGuardado recibe el cliente actualizado
 */
function ModalEditarPropietario({ propietario, cantidadVehiculos, onCerrar, onGuardado }) {
  const idFormulario = useId();
  const refDocumento = useRef(null);
  const [valores, setValores] = useState({
    documento: propietario.documento,
    nombres: propietario.nombres,
    apellidos: propietario.apellidos,
    telefono: propietario.telefono ?? '',
  });
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  };

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const nuevosErrores = validarPropietarioNuevo(valores);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    setGuardando(true);
    setErrorEnvio(null);
    try {
      const actualizado = await actualizarCliente(propietario.idCliente, clienteParaApi(valores));
      onGuardado(actualizado);
    } catch (error) {
      if (error.estado === 409) {
        // El único dato que no se puede repetir es el documento: el mensaje va junto a él.
        setErrores({ documento: error.mensaje });
        refDocumento.current?.focus();
      } else {
        setErrorEnvio(error);
      }
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo="Editar propietario"
      onCerrar={() => !guardando && onCerrar()}
      acciones={
        <>
          <Boton variante="secundario" disabled={guardando} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando}>
            Guardar cambios
          </Boton>
        </>
      }
    >
      <form id={idFormulario} onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {cantidadVehiculos > 1 && (
          <Alerta tipo="aviso">
            Tiene {cantidadVehiculos} vehículos a su nombre: el cambio se verá en todos.
          </Alerta>
        )}
        <Campo
          ref={refDocumento}
          etiqueta="Documento"
          ayuda="Cédula u otro documento, sin puntos."
          error={errores.documento}
          value={valores.documento}
          onChange={cambiar('documento')}
          autoComplete="off"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Nombres"
            error={errores.nombres}
            value={valores.nombres}
            onChange={cambiar('nombres')}
            maxLength={MAX_NOMBRES}
            autoComplete="off"
          />
          <Campo
            etiqueta="Apellidos"
            error={errores.apellidos}
            value={valores.apellidos}
            onChange={cambiar('apellidos')}
            maxLength={MAX_APELLIDOS}
            autoComplete="off"
          />
        </div>
        <Campo
          etiqueta="Teléfono (opcional)"
          error={errores.telefono}
          value={valores.telefono}
          onChange={cambiar('telefono')}
          type="tel"
          inputMode="tel"
          autoComplete="off"
        />
        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudo guardar el propietario">
            {errorEnvio.mensaje}
          </Alerta>
        )}
      </form>
    </Modal>
  );
}

export default ModalEditarPropietario;
