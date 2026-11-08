import { useId, useState } from 'react';
import { crearZona } from '../../../api/zonas.js';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Campo from '../../../components/ui/Campo.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Selector from '../../../components/ui/Selector.jsx';
import { nombreTipoVisible } from '../../../utils/tipoVehiculo.js';
import { normalizarPiso, validarZonaNueva } from './datosZonas.js';

/**
 * Crear una zona: piso, letra y tipo de vehículo. La zona nace sin espacios (se agregan
 * después). Si el piso todavía no tiene zonas, se avisa que con ella aparece el piso nuevo.
 *
 * @param tipos tipos de vehículo [{ idTipo, nombre }]
 * @param pisos pisos que ya existen (['1', '2'])
 * @param onGuardado recibe la zona creada y si el piso era nuevo
 */
function ModalNuevaZona({ tipos, pisos, onCerrar, onGuardado }) {
  const idFormulario = useId();
  const [valores, setValores] = useState({ piso: '', letra: '', idTipo: '' });
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  };

  const piso = normalizarPiso(valores.piso);
  const letra = valores.letra.trim().toUpperCase();
  const pisoNuevo = piso !== null && !pisos.includes(piso);
  const vistaPrevia = piso && /^[A-Z]$/.test(letra) ? `${letra}${piso}` : null;

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const nuevosErrores = validarZonaNueva(valores);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }
    setGuardando(true);
    setErrorEnvio(null);
    try {
      const zona = await crearZona({ piso, letra, idTipo: Number(valores.idTipo) });
      onGuardado(zona, pisoNuevo);
    } catch (error) {
      setErrorEnvio(error);
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo="Nueva zona"
      onCerrar={() => !guardando && onCerrar()}
      acciones={
        <>
          <Boton variante="secundario" disabled={guardando} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando}>
            Crear zona
          </Boton>
        </>
      }
    >
      <form id={idFormulario} onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Piso"
            ayuda="Del 1 al 99."
            error={errores.piso}
            value={valores.piso}
            onChange={cambiar('piso')}
            inputMode="numeric"
            autoComplete="off"
          />
          <Campo
            etiqueta="Letra"
            ayuda="De la A a la Z."
            error={errores.letra}
            value={valores.letra}
            onChange={cambiar('letra')}
            maxLength={1}
            autoCapitalize="characters"
            autoComplete="off"
          />
        </div>
        <Selector
          etiqueta="Tipo de vehículo"
          placeholder="Elige un tipo"
          opciones={tipos.map((tipo) => ({
            valor: tipo.idTipo,
            texto: nombreTipoVisible(tipo.nombre),
          }))}
          ayuda="Todos los espacios de la zona serán para este tipo."
          error={errores.idTipo}
          value={valores.idTipo}
          onChange={cambiar('idTipo')}
        />
        {vistaPrevia && (
          <Alerta tipo="info">
            Se creará la zona <strong>{vistaPrevia}</strong>, sin espacios.
            {pisoNuevo && ` El piso ${piso} todavía no existe: aparecerá con esta zona.`}
          </Alerta>
        )}
        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudo crear la zona">
            {errorEnvio.mensaje}
          </Alerta>
        )}
      </form>
    </Modal>
  );
}

export default ModalNuevaZona;
