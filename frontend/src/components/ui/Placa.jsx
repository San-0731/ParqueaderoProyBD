import { formatearPlaca } from '../../utils/identificador.js';

const TAMANOS = {
  normal: 'px-2 py-0.5 text-xl',
  mediano: 'px-3 py-0.5 text-3xl',
  grande: 'px-4 py-1 text-5xl',
};

/**
 * Identificador del vehículo dibujado como una placa colombiana: fondo amarillo, letras negras
 * condensadas y borde negro. Es el elemento distintivo de la app: toda placa o código que se
 * muestre en pantalla debe usar este componente.
 *
 * <Placa identificador="KLM234" />             →  KLM 234
 * <Placa identificador="ABC12D" tamano="mediano" /> (resúmenes en columnas angostas)
 * <Placa identificador="ABC12D" tamano="grande" /> (liquidación, recibo)
 */
function Placa({ identificador, tamano = 'normal' }) {
  return (
    <span
      translate="no"
      className={`inline-block rounded-[5px] border-2 border-black bg-placa font-condensada leading-tight font-bold tracking-wide whitespace-nowrap text-black ${TAMANOS[tamano]}`}
    >
      {formatearPlaca(identificador)}
    </span>
  );
}

export default Placa;
