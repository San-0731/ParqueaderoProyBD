import { LoaderCircle } from 'lucide-react';
import { clasesBoton } from './estilos.js';

/**
 * Botón de la app.
 *
 * <Boton variante="primario" icono={LogIn} cargando={enviando} type="submit">
 *   Confirmar entrada
 * </Boton>
 *
 * @param variante 'primario' (azul, la acción principal), 'secundario' o 'peligro'
 * @param tamano 'normal' (44 px de alto) o 'grande' (56 px)
 * @param icono componente de lucide-react que va antes del texto (opcional)
 * @param cargando mientras es true el botón se deshabilita y muestra un spinner, para
 *        evitar que se envíe dos veces
 */
function Boton({
  variante = 'primario',
  tamano = 'normal',
  icono: Icono,
  cargando = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${clasesBoton({ variante, tamano })} ${className}`}
      {...props}
    >
      {cargando ? (
        <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
      ) : (
        Icono && <Icono aria-hidden="true" className="size-5" />
      )}
      {children}
    </button>
  );
}

export default Boton;
