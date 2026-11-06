import { Construction } from 'lucide-react';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso F del plan de la Fase 3.
function Salida() {
  return (
    <>
      <EncabezadoPagina
        titulo="Vehículos dentro"
        descripcion="Vehículos que están en el parqueadero. Elige uno para cobrar su salida."
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso F."
      />
    </>
  );
}

export default Salida;
