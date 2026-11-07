// Datos de la administración de espacios: la carga, las filas por piso y el resumen.
// Son funciones sin React.

import { listarTiposVehiculo } from '../../api/catalogos.js';
import { listarEspacios } from '../../api/espacios.js';
import { listarActivos } from '../../api/registros.js';
import { codigoEspacio, estadoEspacio } from '../../utils/espacio.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';

/** Espacios, tipos y vehículos dentro (para saber quién ocupa cada espacio), en paralelo. */
export async function cargarEspacios() {
  const [espacios, tipos, activos] = await Promise.all([
    listarEspacios(),
    listarTiposVehiculo(),
    listarActivos(),
  ]);
  return armarFilas({ espacios, tipos, activos });
}

/**
 * Una fila por espacio, en el orden del backend (piso, zona, número):
 * { espacio, codigo, tipo, estado, registro }
 * - tipo: nombre visible ("Camión de carga pesada");
 * - estado: 'libre', 'ocupado' o 'deshabilitado' (estadoEspacio de utils/espacio.js);
 * - registro: el parqueo activo de ese espacio (con la placa), o null.
 */
export function armarFilas({ espacios, tipos, activos }) {
  const tipoPorId = new Map(tipos.map((tipo) => [tipo.idTipo, tipo.nombre]));
  const registroPorEspacio = new Map(activos.map((registro) => [registro.idEspacio, registro]));
  return espacios.map((espacio) => {
    const registro = registroPorEspacio.get(espacio.idEspacio) ?? null;
    return {
      espacio,
      codigo: codigoEspacio(espacio),
      tipo: nombreTipoVisible(tipoPorId.get(espacio.idTipo) ?? null),
      estado: estadoEspacio(espacio, registro),
      registro,
    };
  });
}

/** Las filas agrupadas por piso, en orden: [{ piso, filas }]. */
export function agruparPorPiso(filas) {
  const pisos = new Map();
  for (const fila of filas) {
    const { piso } = fila.espacio;
    if (!pisos.has(piso)) {
      pisos.set(piso, []);
    }
    pisos.get(piso).push(fila);
  }
  return [...pisos].map(([piso, filasDelPiso]) => ({ piso, filas: filasDelPiso }));
}

/** "20 espacios: 15 libres, 4 ocupados, 1 deshabilitado" (solo los estados que hay). */
export function resumirEspacios(filas) {
  const cuenta = { libre: 0, ocupado: 0, deshabilitado: 0 };
  for (const fila of filas) {
    cuenta[fila.estado] += 1;
  }
  const partes = [
    cuenta.libre > 0 && `${cuenta.libre} ${cuenta.libre === 1 ? 'libre' : 'libres'}`,
    cuenta.ocupado > 0 && `${cuenta.ocupado} ${cuenta.ocupado === 1 ? 'ocupado' : 'ocupados'}`,
    cuenta.deshabilitado > 0 &&
      `${cuenta.deshabilitado} ${cuenta.deshabilitado === 1 ? 'deshabilitado' : 'deshabilitados'}`,
  ].filter(Boolean);
  const total = `${filas.length} ${filas.length === 1 ? 'espacio' : 'espacios'}`;
  return partes.length > 0 ? `${total}: ${partes.join(', ')}` : total;
}
