import { Ban } from 'lucide-react';
import { Link } from 'react-router';
import Insignia from '../../components/ui/Insignia.jsx';
import Placa from '../../components/ui/Placa.jsx';
import { formatearDuracion } from '../../utils/formato.js';
import { formatearPlaca } from '../../utils/identificador.js';

// "Pintura de piso": cada estado se parece a cómo se ve el cajón en el parqueadero.
const BASE =
  'flex h-full min-h-28 w-full flex-col items-start justify-between gap-2 rounded-xl border-2 ' +
  'p-3 text-left transition-colors';

const ESTILOS = {
  // Cajón vacío: solo la línea pintada (punteada, como en EstadoVacio).
  libre: 'border-dashed border-libre bg-white hover:bg-libre-claro',
  // Cajón con un vehículo: fondo rojo claro y la placa.
  ocupado: 'border-ocupado/35 bg-ocupado-claro hover:border-ocupado',
  // Zona de "no parquear": rayas diagonales grises.
  deshabilitado: 'rayado-deshabilitado border-borde bg-white hover:border-deshabilitado',
};

/**
 * Un espacio del tablero. Según su estado es:
 * - libre: enlace a "Registrar entrada" con el espacio ya elegido (/entrada?idEspacio=1);
 * - ocupado: enlace a la liquidación de su registro activo (/salida/28);
 * - deshabilitado: botón que avisa por qué no se puede usar (onDeshabilitado).
 *
 * El nombre accesible (aria-label) dice todo en una frase para el lector de pantalla:
 * "Espacio A-02, piso 1, ocupado por KLM 234 hace 2 h 15 min: registrar salida".
 *
 * @param espacio un espacio de agruparPorPisoYZona (con codigo, estado y registro)
 */
function TarjetaEspacio({ espacio, onDeshabilitado }) {
  const { idEspacio, codigo, piso, estado, registro, habilitado } = espacio;
  const nombre = `Espacio ${codigo}, piso ${piso}`;
  const clases = `${BASE} ${ESTILOS[estado]}`;
  const codigoVisible = (
    <span className="font-condensada text-2xl leading-none font-bold">{codigo}</span>
  );

  if (estado === 'libre') {
    return (
      <Link
        to={`/entrada?idEspacio=${idEspacio}`}
        aria-label={`${nombre}, libre: registrar entrada`}
        className={clases}
      >
        {codigoVisible}
        <Insignia estado="libre" />
      </Link>
    );
  }

  if (estado === 'deshabilitado') {
    return (
      <button
        type="button"
        onClick={() => onDeshabilitado(espacio)}
        aria-label={`${nombre}, deshabilitado`}
        className={clases}
      >
        {codigoVisible}
        <Insignia estado="deshabilitado" />
      </button>
    );
  }

  // Ocupado. Si su registro no llegó (consultas cruzadas), se va a la lista de vehículos dentro.
  const tiempo = registro ? formatearDuracion(registro.minutosTranscurridos) : null;
  const notaDeshabilitado = habilitado ? '' : ', deshabilitado';
  const etiqueta = registro
    ? `${nombre}, ocupado por ${formatearPlaca(registro.identificador)} hace ${tiempo}` +
      `${notaDeshabilitado}: registrar salida`
    : `${nombre}, ocupado${notaDeshabilitado}: ver vehículos dentro`;

  return (
    <Link
      to={registro ? `/salida/${registro.idRegistro}` : '/salida'}
      aria-label={etiqueta}
      className={clases}
    >
      {codigoVisible}
      {registro ? (
        <span className="flex flex-col items-start gap-1">
          <Placa identificador={registro.identificador} />
          <span className="text-sm font-medium text-ocupado-oscuro">{tiempo}</span>
        </span>
      ) : (
        <Insignia estado="ocupado" />
      )}
      {!habilitado && (
        <span className="inline-flex items-center gap-1 text-sm text-tenue">
          <Ban aria-hidden="true" className="size-4" />
          Deshabilitado
        </span>
      )}
    </Link>
  );
}

export default TarjetaEspacio;
