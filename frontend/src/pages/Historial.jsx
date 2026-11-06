import { Construction } from 'lucide-react';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso H del plan de la Fase 3.
function Historial() {
  return (
    <>
      <EncabezadoPagina
        titulo="Historial de parqueos"
        descripcion="Parqueos terminados, con su duración, valor y método de pago."
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso H."
      />
    </>
  );
}

export default Historial;
