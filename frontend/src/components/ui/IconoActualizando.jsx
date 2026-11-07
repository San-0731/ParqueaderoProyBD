import { RefreshCw } from 'lucide-react';

/**
 * Ícono de "Actualizar" que gira mientras llega la respuesta. Se usa en lugar de deshabilitar
 * el botón (así no pierde el foco): <Boton icono={cargando ? IconoActualizando : RefreshCw}>.
 */
function IconoActualizando({ className = '', ...props }) {
  return <RefreshCw {...props} className={`${className} motion-safe:animate-spin`} />;
}

export default IconoActualizando;
