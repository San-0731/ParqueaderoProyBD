/**
 * Interruptor de encendido y apagado (role="switch"). Muestra "Sí" o "No" al lado, así el
 * estado no depende solo del color ni de la posición de la perilla.
 *
 * <Interruptor activo={espacio.habilitado} etiqueta="En servicio A1-01" onCambiar={...} />
 *
 * @param etiqueta nombre para el lector de pantalla (por ejemplo, "En servicio A1-01")
 * @param onCambiar se llama al tocarlo; quien lo usa decide (por ejemplo, pide confirmación)
 */
function Interruptor({ activo, etiqueta, onCambiar, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={onCambiar}
      className="group inline-flex min-h-11 items-center gap-2 rounded-lg px-1 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          activo ? 'bg-libre' : 'bg-deshabilitado/40'
        }`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
            activo ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span aria-hidden="true" className="w-6 text-left font-semibold">
        {activo ? 'Sí' : 'No'}
      </span>
    </button>
  );
}

export default Interruptor;
