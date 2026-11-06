import { Construction } from 'lucide-react';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso G del plan de la Fase 3.
function Vehiculos() {
  return (
    <>
      <EncabezadoPagina
        titulo="Vehículos y propietarios"
        descripcion="Busca, registra y corrige los datos de los vehículos y sus propietarios."
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso G."
      />
    </>
  );
}

export default Vehiculos;
