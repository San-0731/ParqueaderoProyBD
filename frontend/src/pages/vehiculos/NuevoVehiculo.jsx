import { ArrowRight, Eye } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Campo from '../../components/ui/Campo.jsx';
import Placa from '../../components/ui/Placa.jsx';
import FormularioVehiculo from '../../components/vehiculos/FormularioVehiculo.jsx';
import { normalizarIdentificador, validarIdentificador } from '../../utils/identificador.js';

/**
 * Registrar un vehículo desde la pantalla de vehículos:
 *   1. se escribe la placa y "Continuar";
 *   2. si ya está registrada, se ofrece ver su ficha;
 *   3. si no, el mismo formulario del registro rápido de la entrada (FormularioVehiculo).
 *
 * La revisión del paso 2 usa la lista ya cargada (todos los vehículos). Si otra persona la
 * registró entre tanto, el backend responde 409 y el formulario muestra su mensaje.
 *
 * @param placaInicial placa que llegó desde el buscador ("Registrar KLM999"), o ''
 * @param filas filas de armarFilas, para saber si la placa ya existe
 * @param onRegistrado recibe { vehiculo, propietario } del vehículo nuevo
 * @param onVerExistente recibe el idVehiculo del que ya existe
 */
function NuevoVehiculo({
  placaInicial,
  filas,
  marcas,
  modelos,
  onRegistrado,
  onVerExistente,
  className = '',
}) {
  const idTitulo = useId();
  const refPlaca = useRef(null);
  const [texto, setTexto] = useState(normalizarIdentificador(placaInicial));
  const [error, setError] = useState(null);
  // Placa confirmada con "Continuar" (o la que llegó del buscador); null mientras se escribe.
  const [placa, setPlaca] = useState(() =>
    placaInicial && !validarIdentificador(placaInicial)
      ? normalizarIdentificador(placaInicial)
      : null,
  );

  const existente = placa
    ? (filas.find((fila) => fila.vehiculo.identificador === placa) ?? null)
    : null;

  function continuar(evento) {
    evento.preventDefault();
    const mensaje = validarIdentificador(texto);
    setError(mensaje);
    if (!mensaje) {
      setPlaca(normalizarIdentificador(texto));
    }
  }

  // Cambiar la placa después de "Continuar" obliga a confirmarla otra vez.
  function cambiarTexto(evento) {
    setTexto(normalizarIdentificador(evento.target.value));
    setError(null);
    setPlaca(null);
  }

  function corregirPlaca() {
    setPlaca(null);
    refPlaca.current?.focus();
    refPlaca.current?.select();
  }

  return (
    <section
      aria-labelledby={idTitulo}
      className={`flex flex-col gap-6 rounded-xl border border-borde bg-white p-5 sm:p-6 ${className}`}
    >
      <h2 id={idTitulo} className="font-condensada text-2xl font-semibold">
        Nuevo vehículo
      </h2>

      <form onSubmit={continuar} noValidate className="flex flex-wrap items-start gap-3">
        <Campo
          ref={refPlaca}
          etiqueta="Placa o código"
          ayuda="El tipo sale de la placa: ABC123 carro, ABC12D moto, R12345 camión de carga pesada."
          error={error}
          value={texto}
          onChange={cambiarTexto}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-w-56 flex-1 [&_input]:font-condensada [&_input]:text-xl [&_input]:tracking-wide"
        />
        {/* El margen alinea el botón con la caja de texto (debajo de la etiqueta). */}
        <Boton type="submit" icono={ArrowRight} className="sm:mt-[1.875rem]">
          Continuar
        </Boton>
      </form>

      {placa && existente && (
        <Alerta
          tipo="aviso"
          titulo="Ya está registrado"
          accion={
            <Boton
              variante="secundario"
              icono={Eye}
              onClick={() => onVerExistente(existente.vehiculo.idVehiculo)}
            >
              Ver su ficha
            </Boton>
          }
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            <Placa identificador={placa} /> ya está en la lista de vehículos.
          </span>
        </Alerta>
      )}

      {placa && !existente && (
        <div className="border-t border-borde pt-6">
          <FormularioVehiculo
            identificador={placa}
            marcas={marcas}
            modelos={modelos}
            onRegistrado={onRegistrado}
            onCorregirPlaca={corregirPlaca}
          />
        </div>
      )}
    </section>
  );
}

export default NuevoVehiculo;
