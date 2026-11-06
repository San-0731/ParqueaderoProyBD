import { CircleCheck, Search } from 'lucide-react';
import { useState } from 'react';
import { listarClientes } from '../../api/clientes.js';
import Alerta from '../ui/Alerta.jsx';
import Boton from '../ui/Boton.jsx';
import Campo from '../ui/Campo.jsx';
import { normalizarDocumento, validarDocumento } from './validaciones.js';

/**
 * Parte "Propietario" del formulario de vehículo. Primero se busca por documento:
 * - si existe, se muestra su nombre y se usa ese cliente;
 * - si no existe, aparecen los campos para registrarlo (nombres, apellidos y teléfono).
 *
 * El estado vive en el formulario padre (forma inicial: PROPIETARIO_VACIO de validaciones.js).
 * onCambiar funciona como un setState: recibe una función que recibe el estado anterior.
 *
 * @param errores errores de validación del padre: { documento, nombres, apellidos, telefono }
 */
function SeccionPropietario({ propietario, onCambiar, errores = {} }) {
  const [buscando, setBuscando] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState(null);
  const [errorBusqueda, setErrorBusqueda] = useState(null);

  async function buscar() {
    const mensaje = validarDocumento(propietario.documento);
    setErrorDocumento(mensaje);
    if (mensaje || buscando) {
      return;
    }
    const documento = normalizarDocumento(propietario.documento);
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const [cliente] = await listarClientes({ documento });
      onCambiar((anterior) => ({
        ...anterior,
        documento,
        buscado: documento,
        cliente: cliente ?? null,
      }));
    } catch (error) {
      setErrorBusqueda(error);
    } finally {
      setBuscando(false);
    }
  }

  // Si cambia el documento, hay que volver a buscar.
  function cambiarDocumento(evento) {
    const documento = evento.target.value;
    setErrorDocumento(null);
    onCambiar((anterior) => ({ ...anterior, documento, buscado: null, cliente: null }));
  }

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.value;
    onCambiar((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const { buscado, cliente } = propietario;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <Campo
          etiqueta="Documento del propietario"
          ayuda="Cédula u otro documento, sin puntos."
          error={errorDocumento ?? errores.documento}
          value={propietario.documento}
          onChange={cambiarDocumento}
          onKeyDown={(evento) => {
            // Enter busca el propietario en lugar de enviar todo el formulario.
            if (evento.key === 'Enter') {
              evento.preventDefault();
              buscar();
            }
          }}
          inputMode="text"
          autoComplete="off"
          className="min-w-56 flex-1"
        />
        {/* El margen alinea el botón con la caja de texto (debajo de la etiqueta). */}
        <Boton
          variante="secundario"
          icono={Search}
          cargando={buscando}
          onClick={buscar}
          className="sm:mt-[1.875rem]"
        >
          Buscar propietario
        </Boton>
      </div>

      {errorBusqueda && (
        <Alerta tipo="error" titulo="No se pudo buscar el propietario">
          {errorBusqueda.mensaje}
        </Alerta>
      )}

      {buscado && cliente && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-libre-claro px-3 py-2 text-libre"
        >
          <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
          <span>
            <span className="font-semibold">
              {cliente.nombres} {cliente.apellidos}
            </span>{' '}
            ya está registrado como propietario.
          </span>
        </p>
      )}

      {buscado && !cliente && (
        <>
          <Alerta tipo="info">
            No hay un propietario con el documento {buscado}. Regístralo con estos datos.
          </Alerta>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Nombres"
              error={errores.nombres}
              value={propietario.nombres}
              onChange={cambiar('nombres')}
              autoComplete="off"
            />
            <Campo
              etiqueta="Apellidos"
              error={errores.apellidos}
              value={propietario.apellidos}
              onChange={cambiar('apellidos')}
              autoComplete="off"
            />
            <Campo
              etiqueta="Teléfono (opcional)"
              error={errores.telefono}
              value={propietario.telefono}
              onChange={cambiar('telefono')}
              type="tel"
              inputMode="tel"
              autoComplete="off"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default SeccionPropietario;
