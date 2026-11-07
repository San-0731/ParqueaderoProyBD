import Campo from '../ui/Campo.jsx';

/**
 * Los campos "Desde" y "Hasta" de un rango de fechas (historial y reportes). Van sueltos (un
 * fragmento) para que la pantalla los acomode en su propia grilla.
 *
 * <CamposFechas desde="2026-10-01" hasta="2026-10-31" error={errorRango}
 *               onCambiar={(cambios) => ...} />
 *
 * @param error mensaje si "desde" es posterior a "hasta" (se muestra bajo "Hasta")
 * @param onCambiar recibe solo lo que cambió: { desde } o { hasta }
 */
function CamposFechas({ desde, hasta, error, onCambiar }) {
  return (
    <>
      <Campo
        etiqueta="Desde"
        type="date"
        value={desde}
        onChange={(evento) => onCambiar({ desde: evento.target.value })}
        aria-invalid={error ? true : undefined}
      />
      <Campo
        etiqueta="Hasta"
        type="date"
        value={hasta}
        onChange={(evento) => onCambiar({ hasta: evento.target.value })}
        error={error}
      />
    </>
  );
}

export default CamposFechas;
