// Datos simulados del backend, solo para las pruebas del historial (GET /registros).

/** Un parqueo terminado. Los demás datos se pueden cambiar con el segundo parámetro. */
export function parqueo(idRegistro, cambios = {}) {
  return {
    idRegistro,
    identificador: 'KLM234',
    tipoVehiculo: 'Carro',
    piso: '1',
    zona: 'A',
    numero: '03',
    entrada: '2026-10-29T07:20:00',
    salida: '2026-10-29T10:05:00',
    minutosTotales: 165,
    valorTotal: 15000,
    metodosPago: 'Nequi',
    referencias: 'NEQ-0001',
    ...cambios,
  };
}

export const HISTORIAL = [
  parqueo(10),
  parqueo(9, {
    identificador: 'R48213',
    tipoVehiculo: 'Camión',
    zona: 'C',
    numero: '01',
    piso: '2',
    valorTotal: 27000,
    metodosPago: 'Efectivo + Nequi',
    referencias: 'NEQ-0002',
  }),
  parqueo(8, {
    identificador: 'ABC12D',
    tipoVehiculo: 'Moto',
    zona: 'M',
    numero: '01',
    minutosTotales: 0,
    valorTotal: 0,
    metodosPago: null,
    referencias: null,
  }),
];

/** 25 parqueos de $ 1.000 cada uno, para probar la paginación y el total. */
export const VEINTICINCO = Array.from({ length: 25 }, (_, indice) =>
  parqueo(100 + indice, { identificador: `AAA${String(100 + indice)}`, valorTotal: 1000 }),
);

export const METODOS = [
  { idMetodo: 1, nombre: 'PSE', requiereReferencia: true },
  { idMetodo: 2, nombre: 'Nequi', requiereReferencia: true },
  { idMetodo: 4, nombre: 'Efectivo', requiereReferencia: false },
];
