import { Lock, UserRoundPen } from 'lucide-react';
import { useId, useState } from 'react';
import { crearCliente } from '../../api/clientes.js';
import { actualizarVehiculo } from '../../api/vehiculos.js';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Placa from '../../components/ui/Placa.jsx';
import CamposVehiculo from '../../components/vehiculos/CamposVehiculo.jsx';
import { idMarcaDeModelo } from '../../components/vehiculos/modelos.js';
import SeccionPropietario from '../../components/vehiculos/SeccionPropietario.jsx';
import {
  clienteParaApi,
  PROPIETARIO_VACIO,
  validarPropietario,
  validarVehiculo,
  vehiculoParaActualizar,
} from '../../components/vehiculos/validaciones.js';
import { nombrePropietario } from './datosVehiculos.js';

/** Los datos guardados, como texto para los campos del formulario. */
function valoresIniciales(vehiculo, modelos) {
  const idMarca = idMarcaDeModelo(vehiculo.idModelo, modelos);
  return {
    idMarca: idMarca === null ? '' : String(idMarca),
    idModelo: vehiculo.idModelo === null ? '' : String(vehiculo.idModelo),
    color: vehiculo.color ?? '',
    anio: vehiculo.anio === null ? '' : String(vehiculo.anio),
  };
}

/**
 * Editar un vehículo: marca, modelo, color, año y propietario. La placa y el tipo se muestran
 * fijos: no se pueden cambiar (el backend también lo impide).
 *
 * Para cambiar el propietario se busca otro por documento, igual que en el registro; si no
 * existe, se registra aquí mismo antes de guardar el vehículo.
 *
 * Se monta al abrirse: el estado empieza con los datos guardados del vehículo.
 *
 * @param fila fila de armarFilas (datosVehiculos.js)
 * @param onGuardado recibe el vehículo actualizado
 */
function ModalEditarVehiculo({ fila, marcas, modelos, onCerrar, onGuardado }) {
  const idFormulario = useId();
  const { vehiculo, tipo, propietario: propietarioActual } = fila;
  const [valores, setValores] = useState(() => valoresIniciales(vehiculo, modelos));
  // null = se conserva el propietario actual; si no, el estado de SeccionPropietario.
  const [nuevoPropietario, setNuevoPropietario] = useState(null);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [guardando, setGuardando] = useState(false);

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
    setNuevoPropietario(actualizar);
    quitarError('documento', 'nombres', 'apellidos', 'telefono');
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) {
      return;
    }
    const nuevosErrores = {
      ...validarVehiculo(valores),
      ...(nuevoPropietario ? validarPropietario(nuevoPropietario) : {}),
    };
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    setGuardando(true);
    setErrorEnvio(null);
    try {
      let idCliente = vehiculo.idCliente;
      if (nuevoPropietario) {
        let cliente = nuevoPropietario.cliente;
        if (!cliente) {
          cliente = await crearCliente(clienteParaApi(nuevoPropietario));
          // Si después falla el vehículo, el reintento usa este cliente en vez de crearlo otra vez.
          setNuevoPropietario((anterior) => ({ ...anterior, cliente }));
        }
        idCliente = cliente.idCliente;
      }
      const actualizado = await actualizarVehiculo(
        vehiculo.idVehiculo,
        vehiculoParaActualizar(valores, idCliente),
      );
      onGuardado(actualizado);
    } catch (error) {
      setErrorEnvio(error);
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo="Editar vehículo"
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
      <form id={idFormulario} onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-concreto px-4 py-3">
          <Placa identificador={vehiculo.identificador} tamano="mediano" />
          <p>
            <span className="block font-semibold">{tipo}</span>
            <span className="flex items-center gap-1 text-sm text-tenue">
              <Lock aria-hidden="true" className="size-3.5" />
              La placa y el tipo no se pueden cambiar.
            </span>
          </p>
        </div>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-semibold">Datos del vehículo</legend>
          <CamposVehiculo
            valores={valores}
            errores={errores}
            marcas={marcas}
            modelos={modelos}
            onCambiar={cambiarVehiculo}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-semibold">Propietario</legend>
          {nuevoPropietario ? (
            <div className="flex flex-col gap-3">
              <SeccionPropietario
                propietario={nuevoPropietario}
                onCambiar={cambiarPropietario}
                errores={errores}
              />
              <div>
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setNuevoPropietario(null);
                    quitarError('documento', 'nombres', 'apellidos', 'telefono');
                  }}
                >
                  Dejar a {nombrePropietario(propietarioActual) ?? 'el propietario actual'}
                </Boton>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                <span className="block font-medium">{nombrePropietario(propietarioActual)}</span>
                <span className="text-sm text-tenue">Documento {propietarioActual?.documento}</span>
              </p>
              <Boton
                variante="secundario"
                icono={UserRoundPen}
                onClick={() => setNuevoPropietario(PROPIETARIO_VACIO)}
              >
                Cambiar propietario
              </Boton>
            </div>
          )}
        </fieldset>

        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudo guardar el vehículo">
            {errorEnvio.mensaje}
          </Alerta>
        )}
      </form>
    </Modal>
  );
}

export default ModalEditarVehiculo;
