import { CarFront, PencilLine } from 'lucide-react';
import { useState } from 'react';
import { crearCliente } from '../../api/clientes.js';
import { crearVehiculo } from '../../api/vehiculos.js';
import Alerta from '../ui/Alerta.jsx';
import Boton from '../ui/Boton.jsx';
import Placa from '../ui/Placa.jsx';
import { nombreTipoVisible, tipoSegunPlaca, TIPOS } from '../../utils/tipoVehiculo.js';
import CamposVehiculo from './CamposVehiculo.jsx';
import SeccionPropietario from './SeccionPropietario.jsx';
import {
  clienteParaApi,
  PROPIETARIO_VACIO,
  validarPropietario,
  validarVehiculo,
  vehiculoParaApi,
} from './validaciones.js';

/**
 * Registro rápido de un vehículo con su propietario. La placa ya viene de la búsqueda, así
 * que no se vuelve a escribir: se muestra como placa y se puede corregir. El tipo no se elige:
 * sale de la placa (utils/tipoVehiculo.js) y lo asigna el backend.
 *
 * Al guardar:
 *   1. si el propietario es nuevo, POST /clientes (y se recuerda: un reintento no lo duplica);
 *   2. POST /vehiculos;
 *   3. onRegistrado({ vehiculo, propietario, registroActivo: null }).
 * Los errores del backend (por ejemplo, 409 de placa repetida) se muestran con su mensaje.
 *
 * <FormularioVehiculo identificador="KLM999" marcas={...} modelos={...}
 *                     onRegistrado={...} onCorregirPlaca={...} />
 */
function FormularioVehiculo({ identificador, marcas, modelos, onRegistrado, onCorregirPlaca }) {
  // Los valores del formulario se guardan como texto (así los entregan los <select>).
  const [valores, setValores] = useState({
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

  function cambiarVehiculo(cambios) {
    setValores((anteriores) => ({ ...anteriores, ...cambios }));
    quitarError(...Object.keys(cambios));
  }

  function cambiarPropietario(actualizar) {
    setPropietario(actualizar);
    quitarError('documento', 'nombres', 'apellidos', 'telefono');
  }

  const tipo = tipoSegunPlaca(identificador);

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
        Regístralo para continuar. Solo el propietario es obligatorio; el tipo sale de la placa.
      </p>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold">Datos del vehículo</legend>
        <TipoSegunPlaca tipo={tipo} />
        <CamposVehiculo
          valores={valores}
          errores={errores}
          marcas={marcas}
          modelos={modelos}
          onCambiar={cambiarVehiculo}
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

/**
 * El tipo calculado a partir de la placa. Si sale Bicicleta (la placa no tiene forma de carro,
 * moto ni camión) se avisa, porque también puede ser una placa mal escrita (ABC1234).
 */
function TipoSegunPlaca({ tipo }) {
  return (
    <div className="rounded-lg bg-concreto px-4 py-3 sm:col-span-2">
      <p className="text-sm text-tenue">Tipo de vehículo, según la placa</p>
      <p className="text-lg font-semibold">{nombreTipoVisible(tipo)}</p>
      {tipo === TIPOS.BICICLETA && (
        <p className="mt-1 text-sm">
          No tiene forma de placa de carro (ABC123), moto (ABC12D) ni camión de carga pesada (R12345
          o S12345), así que se registra como bicicleta. Si es un error, corrige la placa.
        </p>
      )}
    </div>
  );
}

export default FormularioVehiculo;
