import { Navigate, Outlet, useLocation } from 'react-router';
import { useSesion } from '../../context/SesionContext.js';

/**
 * Envuelve todas las rutas de la app: sin sesión lleva a /login y recuerda a dónde se quería
 * ir, para volver ahí después de iniciar sesión.
 */
function RutaProtegida() {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  if (!usuario) {
    return (
      <Navigate to="/login" replace state={{ desde: `${ubicacion.pathname}${ubicacion.search}` }} />
    );
  }
  return <Outlet />;
}

export default RutaProtegida;
