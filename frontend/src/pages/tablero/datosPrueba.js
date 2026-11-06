// Datos simulados del backend, solo para las pruebas del tablero. Imitan las respuestas de
// GET /espacios, /reportes/ocupacion y /registros/activos con un caso de cada estado.

const espacio = (idEspacio, idTipo, piso, zona, numero, habilitado, ocupado) => ({
  idEspacio,
  idTipo,
  piso,
  zona,
  numero,
  habilitado,
  ocupado,
  disponible: habilitado && !ocupado,
});

// Tipos: 1 = Moto, 2 = Bicicleta (sin espacios), 3 = Carro.
export const ESPACIOS = [
  espacio(1, 3, '1', 'A', '01', true, false), // libre
  espacio(2, 3, '1', 'A', '02', true, true), // ocupado por KLM234
  espacio(3, 3, '1', 'A', '03', false, false), // deshabilitado
  espacio(5, 1, '1', 'M', '01', true, false), // moto libre
  espacio(6, 1, '1', 'M', '02', true, false), // moto libre
  espacio(4, 3, '2', 'B', '01', false, true), // deshabilitado con un vehículo adentro
];

export const OCUPACION = [
  { idTipo: 1, tipoVehiculo: 'Moto', total: 2, ocupados: 0, libres: 2, deshabilitados: 0 },
  { idTipo: 2, tipoVehiculo: 'Bicicleta', total: 0, ocupados: 0, libres: 0, deshabilitados: 0 },
  { idTipo: 3, tipoVehiculo: 'Carro', total: 4, ocupados: 2, libres: 1, deshabilitados: 1 },
];

const activo = (idRegistro, identificador, idEspacio, zona, numero, minutos) => ({
  idRegistro,
  identificador,
  tipoVehiculo: 'Carro',
  documentoCliente: '1012345678',
  nombreCliente: 'Laura Camila Pérez',
  idEspacio,
  piso: '1',
  zona,
  numero,
  entrada: '2026-11-06T08:00:00',
  minutosTranscurridos: minutos,
});

export const ACTIVOS = [
  activo(28, 'KLM234', 2, 'A', '02', 135),
  activo(29, 'ABC123', 4, 'B', '01', 30),
];
