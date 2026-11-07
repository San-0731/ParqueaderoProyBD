import { Ban } from 'lucide-react';
import { Link } from 'react-router';
import Insignia from '../../components/ui/Insignia.jsx';
import Placa from '../../components/ui/Placa.jsx';
import { formatearDuracion } from '../../utils/formato.js';

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
 * El nombre accesible es el mismo texto que se ve, separado con espacios, más el contexto al
 * final solo para el lector de pantalla: "A-02 KLM 234 2 h 15 min (piso 1, ocupado): registrar
 * salida". Así quien usa control por voz puede decir lo que ve ("A-02") y el lector de pantalla
 * oye lo que hace el enlace (regla "etiqueta en el nombre", WCAG 2.5.3).
 *
 * @param espacio un espacio de agruparPorPisoYZona (con codigo, estado y registro)
 */
function TarjetaEspacio({ espacio, onDeshabilitado }) {
  const { idEspacio, codigo, piso, estado, registro, habilitado } = espacio;
  const clases = `${BASE} ${ESTILOS[estado]}`;
  const codigoVisible = (
    <span className="font-condensada text-2xl leading-none font-bold">{codigo}</span>
  );
  // Contexto que no se ve: va al final para no cortar el texto visible en el nombre accesible.
  const contexto = (texto) => (
    <>
      {' '}
      <span className="sr-only">{texto}</span>
    </>
  );

  if (estado === 'libre') {
    return (
      <Link to={`/entrada?idEspacio=${idEspacio}`} className={clases}>
        {codigoVisible} <Insignia estado="libre" />
        {contexto(`(piso ${piso}): registrar entrada`)}
      </Link>
    );
  }

  if (estado === 'deshabilitado') {
    return (
      <button type="button" onClick={() => onDeshabilitado(espacio)} className={clases}>
        {codigoVisible} <Insignia estado="deshabilitado" />
        {contexto(`(piso ${piso})`)}
      </button>
    );
  }

  // Ocupado. Si su registro no llegó (consultas cruzadas), se va a la lista de vehículos dentro.
  const tiempo = registro ? formatearDuracion(registro.minutosTranscurridos) : null;

  return (
    <Link to={registro ? `/salida/${registro.idRegistro}` : '/salida'} className={clases}>
      {codigoVisible}{' '}
      {registro ? (
        <span className="flex flex-col items-start gap-1">
          <Placa identificador={registro.identificador} />{' '}
          <span className="text-sm font-medium text-ocupado-oscuro">{tiempo}</span>
        </span>
      ) : (
        <Insignia estado="ocupado" />
      )}
      {!habilitado && (
        <>
          {' '}
          <span className="inline-flex items-center gap-1 text-sm text-tenue">
            <Ban aria-hidden="true" className="size-4" />
            Deshabilitado
          </span>
        </>
      )}
      {contexto(
        registro
          ? `(piso ${piso}, ocupado): registrar salida`
          : `(piso ${piso}): ver vehículos dentro`,
      )}
    </Link>
  );
}

export default TarjetaEspacio;
