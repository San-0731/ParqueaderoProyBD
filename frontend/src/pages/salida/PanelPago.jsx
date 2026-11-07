import { Banknote, CircleCheck, CreditCard, Landmark, LogOut, Smartphone } from 'lucide-react';
import { useId } from 'react';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Campo from '../../components/ui/Campo.jsx';
import MensajeCampo from '../../components/ui/MensajeCampo.jsx';
import { MAX_REFERENCIA } from './datosSalida.js';

// Ícono genérico por método (no logos de las marcas). Uno nuevo en el catálogo usa la tarjeta.
const ICONOS = {
  pse: Landmark,
  nequi: Smartphone,
  daviplata: Smartphone,
  efectivo: Banknote,
};

/**
 * Panel de pago: el método (tarjetas grandes), la referencia si el método la pide y el botón
 * final. Con valor $ 0 no hay métodos: la salida se registra sin cobro.
 *
 * Es un <form>: el botón (o Enter en la referencia) llama a onEnviar, que valida y abre la
 * confirmación. Los errores de validación van junto a su campo; los del backend, en una Alerta.
 *
 * @param errores { metodo?, referencia? } de validarPago
 * @param aviso texto si al confirmar el valor dejó de ser $ 0 (ya pasó el primer minuto)
 * @param calculando true mientras se vuelve a consultar la liquidación antes del modal
 */
function PanelPago({
  cobra,
  metodos,
  idMetodo,
  onElegirMetodo,
  referencia,
  onCambiarReferencia,
  errores,
  aviso,
  errorEnvio,
  calculando,
  onEnviar,
  className = '',
}) {
  const idTitulo = useId();
  const nombreGrupo = useId();
  const idErrorMetodo = useId();
  const metodo = metodos.find((opcion) => opcion.idMetodo === idMetodo) ?? null;

  function enviar(evento) {
    evento.preventDefault();
    onEnviar();
  }

  return (
    <section
      aria-labelledby={idTitulo}
      className={`rounded-xl border border-borde bg-white p-5 sm:p-6 ${className}`}
    >
      <h2 id={idTitulo} className="font-condensada text-2xl font-semibold">
        Pago
      </h2>

      <form noValidate onSubmit={enviar} className="mt-4 flex flex-col gap-5">
        {aviso && <Alerta tipo="aviso">{aviso}</Alerta>}

        {cobra ? (
          <fieldset aria-describedby={errores.metodo ? idErrorMetodo : undefined}>
            <legend className="mb-3 font-semibold">Método de pago</legend>
            <div className="grid grid-cols-2 gap-3">
              {metodos.map((opcion) => (
                <TarjetaMetodo
                  key={opcion.idMetodo}
                  metodo={opcion}
                  nombreGrupo={nombreGrupo}
                  elegido={opcion.idMetodo === idMetodo}
                  onElegir={onElegirMetodo}
                />
              ))}
            </div>
            {errores.metodo && (
              <div className="mt-2">
                <MensajeCampo idError={idErrorMetodo} error={errores.metodo} />
              </div>
            )}
          </fieldset>
        ) : (
          <Alerta tipo="info" titulo="Salida sin cobro">
            Estuvo menos de un minuto: se registra la salida sin pago.
          </Alerta>
        )}

        {cobra && metodo?.requiereReferencia && (
          <Campo
            etiqueta="Número de referencia"
            ayuda={`Código de la transacción en ${metodo.nombre}.`}
            error={errores.referencia}
            value={referencia}
            onChange={(evento) => onCambiarReferencia(evento.target.value)}
            maxLength={MAX_REFERENCIA}
            autoComplete="off"
            spellCheck={false}
          />
        )}

        {errorEnvio && (
          <Alerta tipo="error" titulo="No se pudo registrar la salida">
            {errorEnvio.mensaje}
          </Alerta>
        )}

        <Boton
          type="submit"
          tamano="grande"
          icono={LogOut}
          cargando={calculando}
          className="w-full"
        >
          {cobra ? 'Confirmar pago y salida' : 'Confirmar salida sin cobro'}
        </Boton>
      </form>
    </section>
  );
}

/**
 * Un método de pago como tarjeta: un radio nativo escondido dentro de un <label>, igual que los
 * cajones de la entrada (las flechas del teclado cambian de opción sin código extra).
 */
function TarjetaMetodo({ metodo, nombreGrupo, elegido, onElegir }) {
  const idPista = useId();
  const Icono = ICONOS[metodo.nombre.toLowerCase()] ?? CreditCard;

  return (
    <label className="relative flex min-h-24 cursor-pointer flex-col justify-between gap-2 rounded-xl border-2 border-borde bg-white p-3 transition-colors hover:border-senal has-checked:border-senal has-checked:bg-senal-claro has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-senal">
      <input
        type="radio"
        name={nombreGrupo}
        value={metodo.idMetodo}
        checked={elegido}
        onChange={() => onElegir(metodo.idMetodo)}
        aria-label={metodo.nombre}
        aria-describedby={idPista}
        className="sr-only"
      />
      <Icono aria-hidden="true" className={`size-6 ${elegido ? 'text-senal' : 'text-tenue'}`} />
      {elegido && (
        <CircleCheck aria-hidden="true" className="absolute top-3 right-3 size-5 text-senal" />
      )}
      <span>
        <span aria-hidden="true" className="block text-lg leading-tight font-semibold">
          {metodo.nombre}
        </span>
        <span id={idPista} className="block text-sm text-tenue">
          {metodo.requiereReferencia ? 'Pide referencia' : 'Sin referencia'}
        </span>
      </span>
    </label>
  );
}

export default PanelPago;
