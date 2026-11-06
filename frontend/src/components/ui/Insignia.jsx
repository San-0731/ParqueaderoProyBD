// Colores de estado de toda la app: verde = libre, rojo = ocupado, gris = deshabilitado.
// Siempre llevan texto, para no depender solo del color.
const ESTADOS = {
  libre: { texto: 'Libre', clases: 'bg-libre-claro text-libre', punto: 'bg-libre' },
  ocupado: { texto: 'Ocupado', clases: 'bg-ocupado-claro text-ocupado', punto: 'bg-ocupado' },
  deshabilitado: {
    texto: 'Deshabilitado',
    clases: 'bg-deshabilitado-claro text-deshabilitado',
    punto: 'bg-deshabilitado',
  },
};

/**
 * Píldora con el estado de un espacio.
 * <Insignia estado="ocupado" />  →  ● Ocupado
 * <Insignia estado="libre">3 libres</Insignia>  (texto propio con el color del estado)
 */
function Insignia({ estado, children }) {
  const { texto, clases, punto } = ESTADOS[estado];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${clases}`}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${punto}`} />
      {children ?? texto}
    </span>
  );
}

export default Insignia;
