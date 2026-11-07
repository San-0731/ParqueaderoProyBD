import { LoaderCircle } from 'lucide-react';

/**
 * Indicador de carga para cuando una pantalla todavía no tiene datos.
 * <Cargando /> o <Cargando texto="Cargando espacios…" />
 */
function Cargando({ texto = 'Cargando…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-tenue">
      <LoaderCircle aria-hidden="true" className="size-6 motion-safe:animate-spin" />
      <span>{texto}</span>
    </div>
  );
}

export default Cargando;
