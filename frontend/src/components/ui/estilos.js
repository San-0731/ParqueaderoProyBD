// Clases de Tailwind compartidas por varios componentes, para que botones, enlaces con
// aspecto de botón, campos y selectores se vean igual en toda la app.

const BASE_BOTON =
  'inline-flex items-center justify-center rounded-lg font-semibold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTES_BOTON = {
  primario: 'bg-senal text-white not-disabled:hover:bg-senal-oscuro',
  secundario: 'border border-borde bg-white text-asfalto not-disabled:hover:bg-concreto',
  peligro: 'bg-ocupado text-white not-disabled:hover:bg-ocupado-oscuro',
};

// Alturas mínimas de 44 px (normal) y 56 px (grande): cómodas para el dedo en una tablet.
const TAMANOS_BOTON = {
  normal: 'min-h-11 gap-2 px-4 text-base',
  grande: 'min-h-14 gap-3 px-6 text-lg',
};

/** Clases de un botón. También sirven para un <Link> que debe verse como botón. */
export function clasesBoton({ variante = 'primario', tamano = 'normal' } = {}) {
  return `${BASE_BOTON} ${VARIANTES_BOTON[variante]} ${TAMANOS_BOTON[tamano]}`;
}

/** Clases de un <input> o <select>; con error, el borde se pone rojo. */
export function clasesControl(conError) {
  return (
    'min-h-11 w-full rounded-lg border bg-white px-3 text-base text-asfalto ' +
    'placeholder:text-tenue disabled:bg-concreto disabled:text-tenue ' +
    (conError ? 'border-ocupado' : 'border-borde')
  );
}
