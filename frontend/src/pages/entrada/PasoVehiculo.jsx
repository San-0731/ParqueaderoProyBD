import { PencilLine, Search } from 'lucide-react';
import { Link } from 'react-router';
import FormularioVehiculo from '../../components/vehiculos/FormularioVehiculo.jsx';
import TarjetaVehiculo from '../../components/vehiculos/TarjetaVehiculo.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Campo from '../../components/ui/Campo.jsx';
import Tarjeta from '../../components/ui/Tarjeta.jsx';
import { clasesBoton } from '../../components/ui/estilos.js';
import { nombreEspacio } from '../../utils/espacio.js';
import { formatearHora } from '../../utils/formato.js';
import { formatearPlaca } from '../../utils/identificador.js';
import { describirModelo } from '../../components/vehiculos/modelos.js';
import { nombreTipo } from './datosEntrada.js';
import TituloPaso from './TituloPaso.jsx';

/**
 * Paso 1: buscar el vehículo por su placa. El buscador queda siempre visible (así se puede
 * buscar otra placa en cualquier momento) y debajo va el resultado:
 * - encontrado: sus datos y su propietario;
 * - ya está dentro: aviso con el enlace para registrar su salida;
 * - no registrado: el registro rápido, con la placa ya puesta.
 *
 * @param ref se pasa al campo de la placa, para devolverle el foco (React 19 lo recibe como prop)
 * @param resultado null (sin buscar) o { identificador, ficha } con ficha null si no existe
 */
function PasoVehiculo({
  ref,
  texto,
  onCambiarTexto,
  errorTexto,
  buscando,
  onBuscar,
  errorBusqueda,
  resultado,
  catalogos,
  onRegistrado,
  onCorregir,
}) {
  return (
    <Tarjeta titulo={<TituloPaso numero={1}>Vehículo</TituloPaso>}>
      <form onSubmit={onBuscar} noValidate className="flex flex-wrap items-start gap-3">
        <Campo
          ref={ref}
          etiqueta="Placa o código"
          ayuda="Se guarda en mayúsculas, sin espacios ni guiones."
          error={errorTexto}
          value={texto}
          onChange={onCambiarTexto}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-w-56 flex-1 [&_input]:font-condensada [&_input]:text-xl [&_input]:tracking-wide"
        />
        {/* El margen alinea el botón con la caja de texto (debajo de la etiqueta). */}
        <Boton type="submit" icono={Search} cargando={buscando} className="sm:mt-[1.875rem]">
          Buscar
        </Boton>
      </form>

      {errorBusqueda && (
        <div className="mt-4">
          <Alerta tipo="error" titulo="No se pudo buscar el vehículo">
            {errorBusqueda.mensaje}
          </Alerta>
        </div>
      )}

      {resultado && (
        <div className="mt-6 border-t border-borde pt-6">
          <Resultado
            resultado={resultado}
            catalogos={catalogos}
            onRegistrado={onRegistrado}
            onCorregir={onCorregir}
          />
        </div>
      )}
    </Tarjeta>
  );
}

/** Lo que se muestra debajo del buscador según lo que se encontró. */
function Resultado({ resultado, catalogos, onRegistrado, onCorregir }) {
  const { identificador, ficha } = resultado;
  const { tipos, marcas, modelos } = catalogos;

  if (!ficha) {
    return (
      <FormularioVehiculo
        identificador={identificador}
        marcas={marcas}
        modelos={modelos}
        onRegistrado={onRegistrado}
        onCorregirPlaca={onCorregir}
      />
    );
  }

  const { vehiculo, propietario, registroActivo } = ficha;
  return (
    <div className="flex flex-col gap-4">
      <TarjetaVehiculo
        vehiculo={vehiculo}
        propietario={propietario}
        tipo={nombreTipo(vehiculo.idTipo, tipos)}
        modelo={describirModelo(vehiculo.idModelo, modelos, marcas)}
        acciones={
          <Boton variante="secundario" icono={PencilLine} onClick={onCorregir}>
            Cambiar vehículo
          </Boton>
        }
      />
      {registroActivo && (
        <Alerta
          tipo="aviso"
          titulo="Este vehículo ya está dentro"
          accion={
            <Link to={`/salida/${registroActivo.idRegistro}`} className={clasesBoton()}>
              Registrar salida
            </Link>
          }
        >
          {formatearPlaca(vehiculo.identificador)} está en el espacio{' '}
          {nombreEspacio(registroActivo)} desde las {formatearHora(registroActivo.entrada)}
        </Alerta>
      )}
    </div>
  );
}

export default PasoVehiculo;
