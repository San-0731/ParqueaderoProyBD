/**
 * Título de un paso del flujo: número en un cuadrito asfalto (como la "P" de la marca) y el
 * nombre. El número es visual; el lector de pantalla oye "Paso 1: Vehículo".
 *
 * <Tarjeta titulo={<TituloPaso numero={1}>Vehículo</TituloPaso>}> ... </Tarjeta>
 */
function TituloPaso({ numero, children }) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-asfalto font-condensada text-lg font-bold text-white"
      >
        {numero}
      </span>
      {/* El espacio va fuera del texto oculto: si queda adentro, se pierde ("Paso 2:Espacio"). */}
      <span>
        <span className="sr-only">Paso {numero}:</span> {children}
      </span>
    </span>
  );
}

export default TituloPaso;
