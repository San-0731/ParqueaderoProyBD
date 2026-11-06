import { Construction } from 'lucide-react';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso E del plan de la Fase 3.
function Entrada() {
  return (
    <>
      <EncabezadoPagina
        titulo="Registrar entrada"
        descripcion="Registra el vehículo que llega y asígnale un espacio de su tipo."
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso E."
      />
    </>
  );
}

export default Entrada;
