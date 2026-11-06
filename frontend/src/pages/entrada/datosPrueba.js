// Datos simulados del backend, solo para las pruebas de la entrada y del registro rápido.

export const TIPOS = [
  { idTipo: 1, nombre: 'Moto' },
  { idTipo: 3, nombre: 'Carro' },
];

export const MARCAS = [
  { idMarca: 3, nombre: 'Mazda' },
  { idMarca: 6, nombre: 'Yamaha' },
];

export const MODELOS = [
  { idModelo: 10, idMarca: 3, nombre: '3' },
  { idModelo: 11, idMarca: 3, nombre: 'CX-30' },
  { idModelo: 20, idMarca: 6, nombre: 'NMAX' },
];

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

export const ESPACIOS = [
  espacio(1, 3, '1', 'A', '01', true, false), // carro libre
  espacio(2, 3, '1', 'A', '02', true, true), // carro ocupado
  espacio(3, 3, '1', 'A', '03', true, false), // carro libre
  espacio(5, 1, '1', 'M', '01', true, false), // moto libre
  espacio(4, 3, '2', 'B', '04', false, false), // carro deshabilitado
  espacio(6, 3, '2', 'B', '01', true, false), // carro libre en el piso 2
];

export const LAURA = {
  idCliente: 7,
  documento: '1012345678',
  nombres: 'Laura Camila',
  apellidos: 'Pérez',
  telefono: '3104567890',
};

export const KLM234 = {
  idVehiculo: 40,
  identificador: 'KLM234',
  idTipo: 3,
  idModelo: 10,
  idCliente: 7,
  color: 'Gris',
  anio: 2020,
};

export const ABC12D = {
  idVehiculo: 41,
  identificador: 'ABC12D',
  idTipo: 1,
  idModelo: null,
  idCliente: 7,
  color: null,
  anio: null,
};

export const ACTIVO_MVC054 = {
  idRegistro: 28,
  identificador: 'MVC054',
  tipoVehiculo: 'Carro',
  documentoCliente: '1012345678',
  nombreCliente: 'Laura Camila Pérez',
  idEspacio: 2,
  piso: '1',
  zona: 'A',
  numero: '02',
  entrada: '2026-11-06T15:45:00',
  minutosTranscurridos: 30,
};
