import { useSesion } from '../../context/SesionContext.js';
import SinPermiso from '../../pages/SinPermiso.jsx';

/**
 * Muestra la pantalla solo si el rol del usuario alcanza `minimo`; si no, explica quién puede
 * usarla. Sirve para quien llega escribiendo la dirección: el menú ya no le muestra la opción.
 *
 * <RequiereRol minimo="ADMINISTRADOR" mensaje="Solo los administradores pueden ver los reportes.">
 *   <Reportes />
 * </RequiereRol>
 */
function RequiereRol({ minimo, mensaje, children }) {
  const { puede } = useSesion();
  return puede(minimo) ? children : <SinPermiso mensaje={mensaje} />;
}

export default RequiereRol;
