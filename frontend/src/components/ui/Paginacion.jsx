import { ChevronLeft, ChevronRight } from 'lucide-react';
import Boton from './Boton.jsx';

/**
 * Botones para pasar de página en una lista larga. Con una sola página no muestra nada.
 *
 * <Paginacion etiqueta="Páginas del historial" pagina={2} totalPaginas={3}
 *             onCambiar={(nueva) => ...} />
 *
 * @param etiqueta nombre del <nav> para el lector de pantalla
 */
function Paginacion({ etiqueta, pagina, totalPaginas, onCambiar }) {
  if (totalPaginas <= 1) {
    return null;
  }
  return (
    <nav aria-label={etiqueta} className="mt-4 flex items-center justify-center gap-3">
      <Boton
        variante="secundario"
        icono={ChevronLeft}
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        Anterior
      </Boton>
      <p aria-live="polite" className="text-sm text-tenue tabular-nums">
        Página {pagina} de {totalPaginas}
      </p>
      <Boton
        variante="secundario"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente
        <ChevronRight aria-hidden="true" className="size-5" />
      </Boton>
    </nav>
  );
}

export default Paginacion;
