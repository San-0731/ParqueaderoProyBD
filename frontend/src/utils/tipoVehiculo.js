// Tipo del vehículo: sale de la forma de su placa colombiana. Es la MISMA regla del backend
// (backend/.../util/TipoPorPlaca.java), que es quien la aplica al guardar; aquí se repite para
// mostrar el tipo mientras se escribe la placa. Si se cambia una, hay que cambiar la otra.
//
//   ABC123 (3 letras y 3 números)            → Carro
//   ABC12D (3 letras, 2 números y 1 letra)   → Moto
//   R12345 o S12345 (remolque/semirremolque) → Camión
//   cualquier otra placa o código            → Bicicleta

import { normalizarIdentificador } from './identificador.js';

/** Nombres de los tipos tal como están en la base (tabla tipo_vehiculo). */
export const TIPOS = {
  CARRO: 'Carro',
  MOTO: 'Moto',
  CAMION: 'Camión',
  BICICLETA: 'Bicicleta',
};

const PLACA_CARRO = /^[A-Z]{3}[0-9]{3}$/;
const PLACA_MOTO = /^[A-Z]{3}[0-9]{2}[A-Z]$/;
const PLACA_CAMION = /^[RS][0-9]{5}$/;

/**
 * Nombre del tipo (el de la base) según la placa: "klm-234" → "Carro".
 *
 * @returns el nombre, o null si la placa está vacía
 */
export function tipoSegunPlaca(identificador) {
  const placa = normalizarIdentificador(identificador);
  if (placa === '') {
    return null;
  }
  if (PLACA_CARRO.test(placa)) {
    return TIPOS.CARRO;
  }
  if (PLACA_MOTO.test(placa)) {
    return TIPOS.MOTO;
  }
  if (PLACA_CAMION.test(placa)) {
    return TIPOS.CAMION;
  }
  return TIPOS.BICICLETA;
}

// Nombres que en pantalla se muestran distinto que en la base. Solo cambia lo visual: la
// base y el backend siguen usando "Camión".
const NOMBRES_VISIBLES = {
  [TIPOS.CAMION]: 'Camión de carga pesada',
};

/**
 * Nombre de un tipo para mostrar en pantalla: "Camión" → "Camión de carga pesada"; los demás
 * quedan igual. TODO tipo que se muestre en la app debe pasar por aquí.
 */
export function nombreTipoVisible(nombre) {
  return NOMBRES_VISIBLES[nombre] ?? nombre;
}
