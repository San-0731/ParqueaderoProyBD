// Datos simulados del backend, solo para las pruebas de la salida y el cobro.

export const METODOS = [
  { idMetodo: 1, nombre: 'PSE', requiereReferencia: true },
  { idMetodo: 2, nombre: 'Nequi', requiereReferencia: true },
  { idMetodo: 3, nombre: 'Daviplata', requiereReferencia: true },
  { idMetodo: 4, nombre: 'Efectivo', requiereReferencia: false },
];

const activo = (
  idRegistro,
  identificador,
  tipoVehiculo,
  nombreCliente,
  espacio,
  entrada,
  minutos,
) => ({
  idRegistro,
  identificador,
  tipoVehiculo,
  documentoCliente: '1012345678',
  nombreCliente,
  idEspacio: idRegistro,
  ...espacio,
  entrada,
  minutosTranscurridos: minutos,
});

export const ACTIVOS = [
  activo(
    28,
    'MVC054',
    'Carro',
    'Laura Camila Pérez',
    { piso: '1', zona: 'A', numero: '02' },
    '2026-11-06T12:18:00',
    395,
  ),
  activo(
    30,
    'XYZ78G',
    'Moto',
    'Andrés Moreno',
    { piso: '1', zona: 'M', numero: '02' },
    '2026-11-06T13:13:00',
    340,
  ),
  activo(
    29,
    'MVA123',
    'Carro',
    'María Rincón',
    { piso: '2', zona: 'B', numero: '02' },
    '2026-11-06T14:03:00',
    290,
  ),
];

/** Detalle del registro 28 mientras sigue dentro (GET /registros/28). */
export const REGISTRO_28 = {
  idRegistro: 28,
  idVehiculo: 12,
  identificador: 'MVC054',
  idEspacio: 2,
  piso: '1',
  zona: 'A',
  numero: '02',
  entrada: '2026-11-06T12:18:00',
  salida: null,
  minutosTotales: null,
  valorTotal: null,
  estado: 'ACTIVO',
  pagos: [],
};

/**
 * Liquidación del registro 28. El valor NO cuadra a propósito con horas × tarifa
 * (7 × 5.000 = 35.000): así las pruebas comprueban que la pantalla muestra el del backend.
 */
export const LIQUIDACION_28 = {
  idRegistro: 28,
  entrada: '2026-11-06T12:18:00',
  salida: '2026-11-06T18:53:00',
  minutosTotales: 395,
  horasCobradas: 7,
  valorHora: 5000,
  valorTotal: 34500,
};

/** La misma liquidación pedida un poco después (al pulsar "Confirmar pago y salida"). */
export const LIQUIDACION_28_FRESCA = {
  ...LIQUIDACION_28,
  salida: '2026-11-06T18:54:10',
  minutosTotales: 396,
};

/** Un vehículo que acaba de entrar: menos de un minuto, no se cobra. */
export const LIQUIDACION_SIN_COBRO = {
  ...LIQUIDACION_28,
  salida: '2026-11-06T12:18:40',
  minutosTotales: 0,
  horasCobradas: 0,
  valorTotal: 0,
};

/** Lo que devuelve POST /registros/28/salida pagando con Nequi. */
export const SALIDA_28_NEQUI = {
  ...REGISTRO_28,
  salida: '2026-11-06T18:54:12',
  minutosTotales: 396,
  valorTotal: 34500,
  estado: 'PAGO',
  pagos: [
    {
      idPago: 90,
      idRegistro: 28,
      idMetodo: 2,
      monto: 34500,
      fechaPago: '2026-11-06T18:54:12',
      referencia: 'NEQ-1',
    },
  ],
};

/** Lo que devuelve la salida sin cobro: el registro cerrado y sin pagos. */
export const SALIDA_28_SIN_COBRO = {
  ...REGISTRO_28,
  salida: '2026-11-06T12:18:45',
  minutosTotales: 0,
  valorTotal: 0,
  estado: 'PAGO',
  pagos: [],
};
