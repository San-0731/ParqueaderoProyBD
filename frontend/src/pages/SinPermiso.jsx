import { Link } from 'react-router';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import { clasesBoton } from '../components/ui/estilos.js';

/**
 * Pantalla para quien entra (escribiendo la dirección) a una sección que su rol no permite.
 *
 * @param mensaje quién puede usarla, por ejemplo "Solo los administradores pueden ver los
 *        reportes."
 */
function SinPermiso({ mensaje }) {
  return (
    <>
      <EncabezadoPagina titulo="Sin permiso" />
      <div className="flex max-w-prose flex-col items-start gap-6">
        <Alerta tipo="info" titulo="Esta sección no está disponible para tu usuario">
          {mensaje}
        </Alerta>
        <Link to="/" className={clasesBoton()}>
          Ir al tablero
        </Link>
      </div>
    </>
  );
}

export default SinPermiso;
