import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

// El amarillo se reserva para las placas: la advertencia usa asfalto sobre concreto.
const TIPOS = {
  error: {
    icono: CircleAlert,
    rol: 'alert',
    clases: 'border-ocupado/40 bg-ocupado-claro',
    color: 'text-ocupado',
  },
  exito: {
    icono: CircleCheck,
    rol: 'status',
    clases: 'border-libre/40 bg-libre-claro',
    color: 'text-libre',
  },
  aviso: {
    icono: TriangleAlert,
    rol: 'status',
    clases: 'border-asfalto/40 bg-concreto',
    color: 'text-asfalto',
  },
  info: {
    icono: Info,
    rol: 'status',
    clases: 'border-senal/30 bg-senal-claro',
    color: 'text-senal-oscuro',
  },
};

/**
 * Mensaje dentro de la pantalla (no flotante), por ejemplo el error 409 del backend junto
 * al formulario.
 *
 * <Alerta tipo="error" titulo="No se pudo registrar la entrada">{error.mensaje}</Alerta>
 *
 * @param tipo 'error' (role="alert": el lector de pantalla lo anuncia de inmediato),
 *        'exito', 'aviso' o 'info'
 * @param accion botón opcional, por ejemplo "Reintentar"
 */
function Alerta({ tipo = 'info', titulo, accion, children }) {
  const { icono: Icono, rol, clases, color } = TIPOS[tipo];

  return (
    <div role={rol} className={`flex flex-wrap items-start gap-3 rounded-xl border p-4 ${clases}`}>
      <Icono aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${color}`} />
      {/* basis-48: si no cabe junto a la acción, la acción baja de línea (en vez de apretar el texto). */}
      <div className="min-w-0 flex-1 basis-48">
        {titulo && <p className={`font-semibold ${color}`}>{titulo}</p>}
        {children && <div className="text-asfalto">{children}</div>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}

export default Alerta;
