import { CircleAlert } from 'lucide-react';

/**
 * Ayuda y mensaje de error debajo de un campo (lo usan Campo y Selector). Los ids permiten
 * que el campo los anuncie con aria-describedby.
 */
function MensajeCampo({ idAyuda, ayuda, idError, error }) {
  return (
    <>
      {ayuda && (
        <p id={idAyuda} className="text-sm text-tenue">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="flex items-start gap-1.5 text-sm font-medium text-ocupado">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </>
  );
}

export default MensajeCampo;
