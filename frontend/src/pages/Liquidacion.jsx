import { Construction } from 'lucide-react';
import { useParams } from 'react-router';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';

// Pantalla provisional: se completa en el Paso F del plan de la Fase 3.
// La ruta es /salida/:idRegistro; useParams entrega el número del registro.
function Liquidacion() {
  const { idRegistro } = useParams();

  return (
    <>
      <EncabezadoPagina
        titulo="Liquidación y pago"
        descripcion={`Cobro de la salida del registro ${idRegistro}.`}
      />
      <EstadoVacio
        icono={Construction}
        titulo="En construcción"
        descripcion="Esta pantalla se completa en el Paso F."
      />
    </>
  );
}

export default Liquidacion;
