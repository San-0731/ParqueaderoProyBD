// Datos y reglas de la salida: la lista de vehículos dentro, la cuenta de un parqueo, la
// validación del pago y el recibo. Son funciones sin React, fáciles de probar.
//
// Importante: el frontend NO calcula lo que se cobra. El valor, las horas cobradas y la tarifa
// salen siempre de la liquidación del backend (GET /registros/{id}/liquidacion).

import { listarMetodosPago } from '../../api/catalogos.js';
import { consultarLiquidacion, listarActivos, obtenerRegistro } from '../../api/registros.js';
import { normalizarIdentificador } from '../../utils/identificador.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';

/** Igual que la columna pago.referencia VARCHAR(60) y SalidaService.MAX_REFERENCIA. */
export const MAX_REFERENCIA = 60;

/** Vehículos dentro (los que llevan más tiempo primero) y la hora de la consulta. */
export async function cargarActivos() {
  const activos = await listarActivos();
  return { activos, actualizado: new Date() };
}

/**
 * Filtra por parte de la placa o código: "mvc-0" encuentra MVC054. El backend solo busca la
 * placa exacta; como nunca hay más de unos 20 vehículos dentro, se filtra aquí.
 */
export function filtrarActivos(activos, texto) {
  const buscado = normalizarIdentificador(texto);
  if (buscado === '') {
    return activos;
  }
  return activos.filter((activo) => activo.identificador.includes(buscado));
}

/** 1 → "1 vehículo"; 5 → "5 vehículos". */
export function contarVehiculos(cantidad) {
  return `${cantidad} ${cantidad === 1 ? 'vehículo' : 'vehículos'}`;
}

/**
 * Todo lo que necesita la pantalla de cobro, en paralelo:
 * - el registro (placa, espacio y entrada);
 * - la liquidación (lo que pagaría si saliera ahora; no guarda nada);
 * - los métodos de pago;
 * - los vehículos dentro, solo para mostrar el tipo y el propietario de este registro
 *   (el detalle del registro no los trae). Si no aparece, esas líneas no se muestran.
 */
export async function cargarCobro(idRegistro) {
  const [registro, liquidacion, metodos, activos] = await Promise.all([
    obtenerRegistro(idRegistro),
    consultarLiquidacion(idRegistro),
    listarMetodosPago(),
    listarActivos(),
  ]);
  const activo = activos.find((fila) => fila.idRegistro === registro.idRegistro);
  return {
    registro,
    liquidacion,
    metodos,
    tipoVehiculo: nombreTipoVisible(activo?.tipoVehiculo ?? null),
    propietario: activo?.nombreCliente ?? null,
  };
}

/** true si hay algo que cobrar. Con 0 minutos el valor es $ 0 y el backend no crea pago. */
export function hayCobro(liquidacion) {
  return Number(liquidacion.valorTotal) > 0;
}

/**
 * De dos liquidaciones, la calculada más tarde (la de "salida" mayor). Las fechas llegan
 * siempre como "2026-11-06T18:53:12", así que se pueden comparar como texto.
 */
export function masReciente(a, b) {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return b.salida > a.salida ? b : a;
}

/**
 * Revisa el pago antes de pedir la confirmación, con las mismas reglas y mensajes que el
 * backend (SalidaService.validarReferencia).
 *
 * @param cobra true si la liquidación es mayor que $ 0 (si no, no se pide método)
 * @param metodo el método elegido ({ idMetodo, nombre, requiereReferencia }) o null
 * @returns { metodo?: mensaje, referencia?: mensaje }; vacío si todo está bien
 */
export function validarPago({ cobra, metodo, referencia }) {
  if (!cobra) {
    return {};
  }
  if (!metodo) {
    return { metodo: 'Elige cómo paga el cliente.' };
  }
  if (!metodo.requiereReferencia) {
    return {};
  }
  const limpia = (referencia ?? '').trim();
  if (limpia === '') {
    return {
      referencia: `El pago con ${metodo.nombre} requiere la referencia (código de la transacción).`,
    };
  }
  if (limpia.length > MAX_REFERENCIA) {
    return { referencia: `La referencia no puede tener más de ${MAX_REFERENCIA} caracteres.` };
  }
  return {};
}

/**
 * Cuerpo del POST de salida. Lo que no aplica va en null: sin cobro no hay método ni
 * referencia, y en efectivo no hay referencia.
 */
export function datosParaSalida({ cobra, metodo, referencia }) {
  if (!cobra) {
    return { idMetodoPago: null, referencia: null };
  }
  return {
    idMetodoPago: metodo.idMetodo,
    referencia: metodo.requiereReferencia ? referencia.trim() : null,
  };
}

/** Nombre del método a partir de su id (el pago solo trae idMetodo). */
export function nombreMetodo(idMetodo, metodos) {
  return metodos.find((metodo) => metodo.idMetodo === idMetodo)?.nombre ?? `Método ${idMetodo}`;
}

/**
 * Datos del recibo a partir de lo que devolvió el POST de salida (el registro ya cerrado).
 *
 * El desglose (horas × tarifa) viene de la liquidación que se confirmó en el modal. Solo se
 * muestra si el valor cobrado es el mismo; si el backend cobró otra cosa (porque justo pasó
 * otra hora), se omite en vez de recalcularlo aquí.
 */
export function datosRecibo({ detalle, liquidacion, metodos, tipoVehiculo }) {
  const pago = detalle.pagos[0] ?? null;
  const mismoValor =
    liquidacion !== null && Number(liquidacion.valorTotal) === Number(detalle.valorTotal);
  return {
    idRegistro: detalle.idRegistro,
    identificador: detalle.identificador,
    tipoVehiculo,
    espacio: { piso: detalle.piso, zona: detalle.zona, numero: detalle.numero },
    entrada: detalle.entrada,
    salida: detalle.salida,
    minutosTotales: detalle.minutosTotales,
    valorTotal: detalle.valorTotal,
    desglose:
      mismoValor && pago
        ? { horasCobradas: liquidacion.horasCobradas, valorHora: liquidacion.valorHora }
        : null,
    metodo: pago ? nombreMetodo(pago.idMetodo, metodos) : null,
    referencia: pago?.referencia ?? null,
  };
}
