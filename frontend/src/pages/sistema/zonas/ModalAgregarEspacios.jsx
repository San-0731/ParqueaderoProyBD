import { useId, useState } from 'react';
import { agregarEspaciosAZona } from '../../../api/zonas.js';
import Alerta from '../../../components/ui/Alerta.jsx';
import Boton from '../../../components/ui/Boton.jsx';
import Campo from '../../../components/ui/Campo.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { nombreTipoVisible } from '../../../utils/tipoVehiculo.js';
import { errorCantidad, nombreDeZona, rangoActual, rangoNuevos } from './datosZonas.js';

/**
 * Agregar espacios a una zona. Los nuevos reciben los números siguientes al último que tiene
 * (si llega al 08, empiezan en el 09), hasta el 99. Muestra cuáles se van a crear.
 *
 * @param zona la zona de la API
 * @param onGuardado recibe los espacios creados
 */
function ModalAgregarEspacios({ zona, onCerrar, onGuardado }) {
  const idFormulario = useId();
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState();
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const nombre = nombreDeZona(zona);
  const actual = rangoActual(zona);
  const valida = errorCantidad(cantidad, zona) === undefined;

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const mensaje = errorCantidad(cantidad, zona);
    setError(mensaje);
    if (mensaje) {
      return;
    }
    setGuardando(true);
    setErrorEnvio(null);
    try {
      onGuardado(await agregarEspaciosAZona(zona.idZona, Number(cantidad)));
    } catch (falla) {
      setErrorEnvio(falla);
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={`Agregar espacios a la zona ${nombre}`}
      onCerrar={() => !guardando && onCerrar()}
      acciones={
        <>
          <Boton variante="secundario" disabled={guardando} onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando}>
            Agregar espacios
          </Boton>
        </>
      }
    >
      <form id={idFormulario} onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <p>
          Zona {nombre}, piso {zona.piso}, para {nombreTipoVisible(zona.tipoVehiculo)}.{' '}
          {actual ? `Tiene ${zona.espacios} espacios (${actual}).` : 'Todavía no tiene espacios.'}
        </p>
        <Campo
          etiqueta="Cantidad de espacios"
          error={error}
          value={cantidad}
          onChange={(evento) => {
            setCantidad(evento.target.value);
            setError(undefined);
          }}
          inputMode="numeric"
          autoComplete="off"
        />
        {valida && (
          <Alerta tipo="info">
            Se crearán, habilitados: <strong>{rangoNuevos(zona, Number(cantidad))}</strong>.
          </Alerta>
        )}
        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudieron agregar los espacios">
            {errorEnvio.mensaje}
          </Alerta>
        )}
      </form>
    </Modal>
  );
}

export default ModalAgregarEspacios;
