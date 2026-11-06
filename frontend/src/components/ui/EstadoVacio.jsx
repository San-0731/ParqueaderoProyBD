import { Inbox } from 'lucide-react';

/**
 * Lo que se muestra cuando una consulta no trae datos, en lugar de una tabla vacía. El borde
 * punteado recuerda un espacio de parqueo vacío pintado en el piso.
 *
 * <EstadoVacio icono={CarFront} titulo="No hay vehículos dentro"
 *              descripcion="Cuando registres una entrada, aparecerá aquí."
 *              accion={<Link to="/entrada" className={clasesBoton()}>Registrar entrada</Link>} />
 */
function EstadoVacio({ icono: Icono = Inbox, titulo, descripcion, accion }) {
  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-borde bg-white px-6 py-12 text-center">
      <Icono aria-hidden="true" strokeWidth={1.5} className="size-10 text-tenue" />
      <h2 className="mt-4 text-lg font-semibold">{titulo}</h2>
      {descripcion && <p className="mt-1 max-w-prose text-tenue">{descripcion}</p>}
      {accion && <div className="mt-6">{accion}</div>}
    </div>
  );
}

export default EstadoVacio;
