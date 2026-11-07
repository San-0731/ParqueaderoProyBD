import { Construction } from 'lucide-react';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso I del plan de la Fase 3.
function Espacios() {
  return (
    <>
      <EncabezadoPagina
        titulo="Administración de espacios"
        descripcion="Habilita o deshabilita los espacios del parqueadero."
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso I."
      />
    </>
  );
}

export default Espacios;
