// Datos de la pantalla de auditoría: qué hizo cada cambio, en palabras, y qué datos cambiaron.
// Son funciones sin React.

import { SIN_DATO, formatearFechaHora, formatearPesos } from '../../utils/formato.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';

export { paginar } from '../historial/datosHistorial.js';

/** Las tablas auditadas, para el filtro (el valor es el nombre en la base). */
export const TABLAS = [
  { valor: 'registro_parqueo', texto: 'Entradas y salidas' },
  { valor: 'pago', texto: 'Pagos' },
  { valor: 'vehiculo', texto: 'Vehículos' },
  { valor: 'cliente', texto: 'Propietarios' },
  { valor: 'espacio', texto: 'Espacios' },
];

/** Nombre de cada dato guardado en la auditoría (las claves del JSON de los triggers). */
const ETIQUETAS = {
  placa: 'Placa',
  tipo: 'Tipo',
  modelo: 'Marca y modelo',
  propietario: 'Documento del propietario',
  color: 'Color',
  anio: 'Año',
  documento: 'Documento',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  telefono: 'Teléfono',
  espacio: 'Espacio',
  entrada: 'Entrada',
  salida: 'Salida',
  minutos_totales: 'Minutos',
  valor_total: 'Valor',
  estado: 'Estado',
  id_registro: 'Parqueo N.º',
  metodo: 'Método de pago',
  monto: 'Monto',
  referencia: 'Referencia',
  habilitado: 'En servicio',
};

/** Qué hizo, en palabras: "Registró una entrada", "Deshabilitó un espacio"... */
export function describirAccion({ tabla, operacion, datosAntes, datosDespues }) {
  const creado = operacion === 'INSERT';
  switch (tabla) {
    case 'cliente':
      return creado ? 'Registró un propietario' : 'Editó un propietario';
    case 'vehiculo':
      return creado ? 'Registró un vehículo' : 'Editó un vehículo';
    case 'registro_parqueo':
      if (creado) {
        return 'Registró una entrada';
      }
      return datosAntes?.estado === 'ACTIVO' && datosDespues?.estado === 'PAGO'
        ? 'Registró una salida'
        : 'Modificó un parqueo';
    case 'pago':
      return 'Registró un pago';
    case 'espacio':
      return datosDespues?.habilitado ? 'Habilitó un espacio' : 'Deshabilitó un espacio';
    default:
      return `${creado ? 'Creó' : 'Modificó'} en ${tabla}`;
  }
}

/** Un valor guardado, listo para mostrar (pesos, fechas, Sí/No, tipo visible...). */
export function formatearValor(clave, valor) {
  if (valor === null || valor === undefined || valor === '') {
    return SIN_DATO;
  }
  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }
  if (clave === 'valor_total' || clave === 'monto') {
    return formatearPesos(valor);
  }
  if (clave === 'entrada' || clave === 'salida') {
    return formatearFechaHora(String(valor).replace(' ', 'T'));
  }
  if (clave === 'tipo') {
    return nombreTipoVisible(valor);
  }
  return String(valor);
}

/**
 * Los datos que se muestran de un cambio:
 * - al crear: todos los que tienen valor, { clave, etiqueta, valor };
 * - al editar: el que identifica la fila (placa o espacio) y los que cambiaron, con
 *   { antes, despues }.
 * Las placas van aparte (esPlaca) porque se dibujan con <Placa>.
 */
export function detalle({ operacion, datosAntes, datosDespues }) {
  const item = (clave, extra) => ({
    clave,
    etiqueta: ETIQUETAS[clave] ?? clave,
    esPlaca: clave === 'placa',
    ...extra,
  });
  if (operacion === 'INSERT' || !datosAntes) {
    return Object.entries(datosDespues ?? {})
      .filter(([, valor]) => valor !== null && valor !== '')
      .map(([clave, valor]) => item(clave, { valor }));
  }
  const identificador = ['placa', 'espacio'].find((clave) => datosDespues[clave]);
  const cambios = Object.keys(datosDespues)
    .filter((clave) => clave !== identificador)
    .filter((clave) => JSON.stringify(datosAntes[clave]) !== JSON.stringify(datosDespues[clave]))
    .map((clave) => item(clave, { antes: datosAntes[clave], despues: datosDespues[clave] }));
  return identificador
    ? [item(identificador, { valor: datosDespues[identificador] }), ...cambios]
    : cambios;
}
