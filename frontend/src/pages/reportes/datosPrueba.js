// Datos simulados del backend, solo para las pruebas de los reportes.

export const METODOS = [
  { idMetodo: 1, nombre: 'PSE', requiereReferencia: true },
  { idMetodo: 2, nombre: 'Nequi', requiereReferencia: true },
  { idMetodo: 3, nombre: 'Daviplata', requiereReferencia: true },
  { idMetodo: 4, nombre: 'Efectivo', requiereReferencia: false },
];

/** GET /reportes/ingresos?desde=2026-10-01&hasta=2026-10-05 (las cifras del seed). */
export const INGRESOS_1_AL_5_OCTUBRE = {
  desde: '2026-10-01',
  hasta: '2026-10-05',
  cantidadPagos: 5,
  totalGeneral: 181000,
  porMetodo: [
    { metodoPago: 'Daviplata', cantidadPagos: 2, totalRecaudado: 26000 },
    { metodoPago: 'Nequi', cantidadPagos: 1, totalRecaudado: 10000 },
    { metodoPago: 'PSE', cantidadPagos: 2, totalRecaudado: 145000 },
  ],
  porDia: [
    { fecha: '2026-10-01', cantidadPagos: 2, totalRecaudado: 130000 },
    { fecha: '2026-10-02', cantidadPagos: 1, totalRecaudado: 6000 },
    { fecha: '2026-10-05', cantidadPagos: 2, totalRecaudado: 45000 },
  ],
  detalle: [],
};

/** Noviembre hasta el 6: tres pagos el día 6. */
export const INGRESOS_NOVIEMBRE = {
  desde: '2026-11-01',
  hasta: '2026-11-06',
  cantidadPagos: 3,
  totalGeneral: 15000,
  porMetodo: [
    { metodoPago: 'Daviplata', cantidadPagos: 1, totalRecaudado: 4000 },
    { metodoPago: 'Efectivo', cantidadPagos: 2, totalRecaudado: 11000 },
  ],
  porDia: [{ fecha: '2026-11-06', cantidadPagos: 3, totalRecaudado: 15000 }],
  detalle: [],
};

export const SIN_PAGOS = {
  desde: '2027-01-01',
  hasta: '2027-01-31',
  cantidadPagos: 0,
  totalGeneral: 0,
  porMetodo: [],
  porDia: [],
  detalle: [],
};

export const OCUPACION = [
  { idTipo: 1, tipoVehiculo: 'Moto', total: 4, ocupados: 1, libres: 3, deshabilitados: 0 },
  { idTipo: 2, tipoVehiculo: 'Bicicleta', total: 2, ocupados: 1, libres: 1, deshabilitados: 0 },
  { idTipo: 3, tipoVehiculo: 'Carro', total: 12, ocupados: 2, libres: 9, deshabilitados: 1 },
  { idTipo: 4, tipoVehiculo: 'Camión', total: 2, ocupados: 0, libres: 2, deshabilitados: 0 },
];
