import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router';
import EncabezadoPagina from '../components/layout/EncabezadoPagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';
import { clasesBoton } from '../components/ui/estilos.js';

// Se muestra cuando la dirección no coincide con ninguna ruta (ruta "*" en App.jsx).
function NoEncontrada() {
  return (
    <>
      <EncabezadoPagina titulo="Página no encontrada" />
      <EstadoVacio
        icono={MapPinOff}
        titulo="Esta dirección no existe"
        descripcion="Revisa la dirección o vuelve al tablero de espacios."
        accion={
          <Link to="/" className={clasesBoton()}>
            Ir al tablero
          </Link>
        }
      />
    </>
  );
}

export default NoEncontrada;
