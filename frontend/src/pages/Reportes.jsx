import { Construction } from 'lucide-react';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso I del plan de la Fase 3.
function Reportes() {
  return (
    <>
      <EncabezadoPagina
        titulo="Reportes"
        descripcion="Ingresos por método de pago y por día, y ocupación actual."
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso I."
      />
    </>
  );
}

export default Reportes;
