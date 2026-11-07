// Datos del tablero de espacios: la consulta a la API y las funciones que los preparan para
// dibujarlos. Son funciones puras (sin React), así se prueban y se explican por separado.
import { listarEspacios } from '../../api/espacios.js';
import { listarActivos } from '../../api/registros.js';
import { consultarOcupacion } from '../../api/reportes.js';
import { codigoEspacio, estadoEspacio } from '../../utils/espacio.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';

/**
 * Hace las 3 consultas del tablero en paralelo (Promise.all: el tiempo total es el de la más
 * lenta, no la suma). Si alguna falla, falla todo y la pantalla muestra el error.
 *
 * @returns { espacios, ocupacion, activos, actualizado } donde actualizado es la hora de la
 *          consulta, para mostrar "Actualizado a las ..."
 */
export async function cargarTablero() {
  const [espacios, ocupacion, activos] = await Promise.all([
    listarEspacios(),
    consultarOcupacion(),
    listarActivos(),
  ]);
  return { espacios, ocupacion, activos, actualizado: new Date() };
}

/** Suma la ocupación de todos los tipos para la celda "Todos" del letrero. */
export function totalGeneral(ocupacion) {
  return ocupacion.reduce(
    (suma, tipo) => ({
      total: suma.total + tipo.total,
      libres: suma.libres + tipo.libres,
      ocupados: suma.ocupados + tipo.ocupados,
      deshabilitados: suma.deshabilitados + tipo.deshabilitados,
    }),
    { total: 0, libres: 0, ocupados: 0, deshabilitados: 0 },
  );
}

/**
 * Convierte el ?tipo= de la URL en el id del tipo elegido. Devuelve null ("Todos") si no hay
 * filtro o si el valor no corresponde a un tipo con espacios (por ejemplo, ?tipo=abc).
 */
export function tipoElegido(valorUrl, ocupacion) {
  const idTipo = Number(valorUrl);
  const existe = ocupacion.some((tipo) => tipo.idTipo === idTipo && tipo.total > 0);
  return valorUrl && existe ? idTipo : null;
}

/**
 * Agrupa los espacios por piso y, dentro de cada piso, por zona, para dibujar la cuadrícula.
 * Respeta el orden en que llegan del backend (ORDER BY piso, zona, numero): un Map recuerda el
 * orden en que se agregó cada llave.
 *
 * @param idTipo si no es null, solo se incluyen los espacios de ese tipo (los pisos y zonas
 *        que quedan vacíos no aparecen)
 * @returns [{ piso, zonas: [{ zona, tipos, libres, espacios: [{ ...espacio, codigo, estado,
 *          registro }] }] }], donde tipos son los nombres de los tipos de la zona ("Carro")
 */
export function agruparPorPisoYZona({ espacios, activos, ocupacion, idTipo = null }) {
  const registroPorEspacio = new Map(activos.map((registro) => [registro.idEspacio, registro]));
  const nombreTipo = new Map(
    ocupacion.map((tipo) => [tipo.idTipo, nombreTipoVisible(tipo.tipoVehiculo)]),
  );
  const pisos = new Map();

  for (const espacio of espacios) {
    if (idTipo !== null && espacio.idTipo !== idTipo) {
      continue;
    }
    if (!pisos.has(espacio.piso)) {
      pisos.set(espacio.piso, new Map());
    }
    const zonas = pisos.get(espacio.piso);
    if (!zonas.has(espacio.zona)) {
      zonas.set(espacio.zona, { zona: espacio.zona, tipos: [], libres: 0, espacios: [] });
    }
    const zona = zonas.get(espacio.zona);

    const registro = registroPorEspacio.get(espacio.idEspacio) ?? null;
    const estado = estadoEspacio(espacio, registro);
    const tipo = nombreTipo.get(espacio.idTipo) ?? 'Otro tipo';
    if (!zona.tipos.includes(tipo)) {
      zona.tipos.push(tipo);
    }
    if (estado === 'libre') {
      zona.libres += 1;
    }
    zona.espacios.push({ ...espacio, codigo: codigoEspacio(espacio), estado, registro });
  }

  return [...pisos].map(([piso, zonas]) => ({ piso, zonas: [...zonas.values()] }));
}
