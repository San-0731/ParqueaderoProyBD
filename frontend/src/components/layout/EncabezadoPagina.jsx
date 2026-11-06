/**
 * Encabezado de cada pantalla: título (h1), descripción corta y acciones a la derecha.
 * También pone el título de la pestaña del navegador: en React 19 un <title> dibujado en
 * cualquier componente se mueve solo al <head>.
 *
 * <EncabezadoPagina titulo="Vehículos dentro" descripcion="..."
 *                   acciones={<Boton icono={RefreshCw} onClick={recargar}>Actualizar</Boton>} />
 */
function EncabezadoPagina({ titulo, descripcion, acciones }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <title>{`${titulo} | Parqueadero`}</title>
      <div>
        <h1 className="font-condensada text-3xl leading-tight font-semibold sm:text-4xl">
          {titulo}
        </h1>
        {descripcion && <p className="mt-1.5 max-w-prose text-tenue">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-3">{acciones}</div>}
    </header>
  );
}

export default EncabezadoPagina;
