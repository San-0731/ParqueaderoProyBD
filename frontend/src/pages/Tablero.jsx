import { Construction } from 'lucide-react';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso D del plan de la Fase 3.
function Tablero() {
  return (
    <>
      <EncabezadoPagina
        titulo="Tablero de espacios"
        descripcion="Espacios libres, ocupados y deshabilitados, por piso y zona."
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso D."
      />
    </>
  );
}

export default Tablero;
