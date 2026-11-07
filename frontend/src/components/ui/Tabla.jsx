/**
 * Tabla de datos. En pantallas pequeñas se desplaza horizontalmente; el contenedor es
 * enfocable para poder desplazarlo también con las flechas del teclado.
 *
 * <Tabla etiqueta="Historial de parqueos" filas={registros} claveFila="idRegistro"
 *        columnas={[
 *          { clave: 'identificador', titulo: 'Placa', render: (r) => <Placa identificador={r.identificador} /> },
 *          { clave: 'valorTotal', titulo: 'Valor', alinear: 'derecha', render: (r) => formatearPesos(r.valorTotal) },
 *        ]}
 *        pie={{ identificador: 'Total', valorTotal: formatearPesos(total) }} />
 *
 * @param columnas [{ clave, titulo, alinear?: 'derecha', fija?: true, render?: (fila) => contenido }]
 *        fija: la columna queda quieta a la izquierda al desplazar la tabla de lado (celular),
 *        para no perder de vista a qué fila pertenece cada dato (por ejemplo, la placa)
 * @param pie fila final opcional (por ejemplo, totales), con el contenido de cada columna por clave
 */
function Tabla({ etiqueta, columnas, filas, claveFila, pie }) {
  const alineacion = (columna) => (columna.alinear === 'derecha' ? 'text-right tabular-nums' : '');
  // La columna fija necesita fondo opaco: si no, al desplazar se vería el texto por detrás.
  // El encabezado usa el mismo gris de la fila (concreto al 50 % sobre blanco), pero sólido.
  const fija = (columna, fondo) =>
    columna.fija ? `sticky left-0 z-10 border-r border-borde ${fondo}` : '';
  const FONDO_ENCABEZADO = 'bg-[color-mix(in_oklab,var(--color-concreto)_50%,white)]';

  return (
    <div
      role="region"
      aria-label={etiqueta}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-borde bg-white"
    >
      <table className="w-full min-w-max border-collapse text-left">
        <caption className="sr-only">{etiqueta}</caption>
        <thead>
          <tr className="border-b border-borde bg-concreto/50">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={`px-4 py-3 text-sm font-semibold text-tenue ${alineacion(columna)} ${fija(columna, FONDO_ENCABEZADO)}`}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila[claveFila]} className="border-b border-borde last:border-b-0">
              {columnas.map((columna) => (
                <td
                  key={columna.clave}
                  className={`px-4 py-3 align-middle ${alineacion(columna)} ${fija(columna, 'bg-white')}`}
                >
                  {columna.render ? columna.render(fila) : fila[columna.clave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {pie && (
          <tfoot>
            <tr className="border-t-2 border-asfalto/20 font-semibold">
              {columnas.map((columna) => (
                <td
                  key={columna.clave}
                  className={`px-4 py-3 ${alineacion(columna)} ${fija(columna, 'bg-white')}`}
                >
                  {pie[columna.clave]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default Tabla;
