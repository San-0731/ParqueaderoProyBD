// Datos simulados del backend, solo para las pruebas de la pantalla de vehículos.

export const TIPOS = [
  { idTipo: 1, nombre: 'Moto' },
  { idTipo: 2, nombre: 'Bicicleta' },
  { idTipo: 3, nombre: 'Carro' },
  { idTipo: 4, nombre: 'Camión' },
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

export const LAURA = {
  idCliente: 7,
  documento: '1012345678',
  nombres: 'Laura Camila',
  apellidos: 'Pérez',
  telefono: '3104567890',
};

export const JORGE = {
  idCliente: 8,
  documento: '80123654',
  nombres: 'Jorge Enrique',
  apellidos: 'Torres',
  telefono: null,
};

export const CLIENTES = [LAURA, JORGE];

// En el orden en que los devuelve el backend (por id), no por placa.
export const VEHICULOS = [
  {
    idVehiculo: 40,
    identificador: 'KLM234',
    idTipo: 3,
    idModelo: 10,
    idCliente: 7,
    color: 'Gris',
    anio: 2020,
  },
  {
    idVehiculo: 41,
    identificador: 'ABC12D',
    idTipo: 1,
    idModelo: 20,
    idCliente: 7,
    color: null,
    anio: null,
  },
  {
    idVehiculo: 42,
    identificador: 'R48213',
    idTipo: 4,
    idModelo: null,
    idCliente: 8,
    color: 'Blanco',
    anio: 2017,
  },
];

/** KLM234 está dentro del parqueadero. */
export const ACTIVOS = [
  {
    idRegistro: 28,
    identificador: 'KLM234',
    tipoVehiculo: 'Carro',
    documentoCliente: '1012345678',
    nombreCliente: 'Laura Camila Pérez',
    idEspacio: 2,
    piso: '1',
    zona: 'A',
    numero: '02',
    entrada: '2026-11-06T15:45:00',
    minutosTranscurridos: 30,
  },
];
