import { CarFront, PencilLine } from 'lucide-react';
import { useState } from 'react';
import { crearCliente } from '../../api/clientes.js';
import { crearVehiculo } from '../../api/vehiculos.js';
import Alerta from '../ui/Alerta.jsx';
import Boton from '../ui/Boton.jsx';
import Campo from '../ui/Campo.jsx';
import Placa from '../ui/Placa.jsx';
import Selector from '../ui/Selector.jsx';
import SeccionPropietario from './SeccionPropietario.jsx';
import {
  clienteParaApi,
  MAX_COLOR,
  PROPIETARIO_VACIO,
  validarPropietario,
  validarVehiculo,
  vehiculoParaApi,
} from './validaciones.js';

/**
 * Registro rápido de un vehículo con su propietario. La placa ya viene de la búsqueda, así
 * que no se vuelve a escribir: se muestra como placa y se puede corregir.
 *
 * Al guardar:
 *   1. si el propietario es nuevo, POST /clientes (y se recuerda: un reintento no lo duplica);
 *   2. POST /vehiculos;
 *   3. onRegistrado({ vehiculo, propietario, registroActivo: null }).
 * Los errores del backend (por ejemplo, 409 de placa repetida) se muestran con su mensaje.
 *
 * <FormularioVehiculo identificador="KLM999" tipos={...} marcas={...} modelos={...}
 *                     idTipoInicial={3} onRegistrado={...} onCorregirPlaca={...} />
 *
 * @param idTipoInicial tipo sugerido (por ejemplo, el del espacio elegido en el tablero)
 */
function FormularioVehiculo({
  identificador,
  tipos,
  marcas,
  modelos,
  idTipoInicial,
  onRegistrado,
  onCorregirPlaca,
}) {
  // Los valores del formulario se guardan como texto (así los entregan los <select>).
  const [valores, setValores] = useState({
    idTipo: idTipoInicial ? String(idTipoInicial) : '',
    idMarca: '',
    idModelo: '',
    color: '',
    anio: '',
  });
  const [propietario, setPropietario] = useState(PROPIETARIO_VACIO);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Al corregir un campo se quita su mensaje de error (los demás se quedan hasta corregirlos).
  function quitarError(...campos) {
    setErrores((anteriores) =>
      Object.fromEntries(Object.entries(anteriores).filter(([campo]) => !campos.includes(campo))),
    );
  }

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    quitarError(campo);
  };

  // Al cambiar la marca se borra el modelo: el anterior era de otra marca.
  function cambiarMarca(evento) {
    const idMarca = evento.target.value;
    setValores((anteriores) => ({ ...anteriores, idMarca, idModelo: '' }));
    quitarError('idModelo');
  }

  function cambiarPropietario(actualizar) {
    setPropietario(actualizar);
    quitarError('documento', 'nombres', 'apellidos', 'telefono');
  }

  const modelosDeMarca = modelos.filter((modelo) => String(modelo.idMarca) === valores.idMarca);

  async function registrar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const nuevosErrores = { ...validarVehiculo(valores), ...validarPropietario(propietario) };
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    setGuardando(true);
    setErrorEnvio(null);
    try {
      let cliente = propietario.cliente;
      if (!cliente) {
        cliente = await crearCliente(clienteParaApi(propietario));
        // Si después falla el vehículo, el reintento usa este cliente en vez de crearlo otra vez.
        setPropietario((anterior) => ({ ...anterior, cliente }));
      }
      const vehiculo = await crearVehiculo(
        vehiculoParaApi({ identificador, ...valores }, cliente.idCliente),
      );
      onRegistrado({ vehiculo, propietario: cliente, registroActivo: null });
    } catch (error) {
      setErrorEnvio(error);
      setGuardando(false);
    }
  }

  const hayErrores = Object.keys(errores).length > 0;

  return (
    <form onSubmit={registrar} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex flex-wrap items-center gap-2 text-lg">
          El vehículo <Placa identificador={identificador} /> no está registrado.
        </p>
        {onCorregirPlaca && (
          <Boton variante="secundario" icono={PencilLine} onClick={onCorregirPlaca}>
            Corregir placa
          </Boton>
        )}
      </div>
      <p className="-mt-3 text-tenue">
        Regístralo para continuar. Solo el tipo y el propietario son obligatorios.
      </p>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold">Datos del vehículo</legend>
        <Selector
          etiqueta="Tipo de vehículo"
          placeholder="Elige el tipo"
          opciones={tipos.map((tipo) => ({ valor: String(tipo.idTipo), texto: tipo.nombre }))}
          value={valores.idTipo}
          onChange={cambiar('idTipo')}
          error={errores.idTipo}
          className="sm:col-span-2"
        />
        <Selector
          etiqueta="Marca (opcional)"
          placeholder="Sin marca"
          opciones={marcas.map((marca) => ({ valor: String(marca.idMarca), texto: marca.nombre }))}
          value={valores.idMarca}
          onChange={cambiarMarca}
        />
        <Selector
          etiqueta="Modelo (opcional)"
          placeholder={valores.idMarca ? 'Elige el modelo' : 'Primero elige la marca'}
          opciones={modelosDeMarca.map((modelo) => ({
            valor: String(modelo.idModelo),
            texto: modelo.nombre,
          }))}
          value={valores.idModelo}
          onChange={cambiar('idModelo')}
          disabled={!valores.idMarca}
          error={errores.idModelo}
        />
        <Campo
          etiqueta="Color (opcional)"
          value={valores.color}
          onChange={cambiar('color')}
          maxLength={MAX_COLOR}
          error={errores.color}
          autoComplete="off"
        />
        <Campo
          etiqueta="Año (opcional)"
          value={valores.anio}
          onChange={cambiar('anio')}
          inputMode="numeric"
          maxLength={4}
          error={errores.anio}
          autoComplete="off"
        />
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-semibold">Propietario</legend>
        <SeccionPropietario
          propietario={propietario}
          onCambiar={cambiarPropietario}
          errores={errores}
        />
      </fieldset>

      {hayErrores && (
        <Alerta tipo="error" titulo="Revisa los datos marcados">
          Corrige los campos con mensaje para poder registrar el vehículo.
        </Alerta>
      )}
      {errorEnvio && (
        <Alerta tipo="error" titulo="No se pudo registrar el vehículo">
          {errorEnvio.mensaje}
        </Alerta>
      )}

      <div>
        <Boton type="submit" icono={CarFront} cargando={guardando}>
          Registrar vehículo
        </Boton>
      </div>
    </form>
  );
}

export default FormularioVehiculo;
