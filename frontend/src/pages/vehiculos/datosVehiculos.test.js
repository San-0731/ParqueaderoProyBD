import { listarMarcas, listarModelos, listarTiposVehiculo } from '../../api/catalogos.js';
import { listarClientes } from '../../api/clientes.js';
import { listarActivos } from '../../api/registros.js';
import { listarVehiculos } from '../../api/vehiculos.js';
import {
  armarFilas,
  cargarVehiculos,
  contarVehiculos,
  filtrarFilas,
  nombrePropietario,
  sinTildes,
} from './datosVehiculos.js';
import { ACTIVOS, CLIENTES, LAURA, MARCAS, MODELOS, TIPOS, VEHICULOS } from './datosPrueba.js';

vi.mock('../../api/catalogos.js', () => ({
  listarTiposVehiculo: vi.fn(),
  listarMarcas: vi.fn(),
  listarModelos: vi.fn(),
}));
vi.mock('../../api/clientes.js', () => ({ listarClientes: vi.fn() }));
vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn() }));
vi.mock('../../api/vehiculos.js', () => ({ listarVehiculos: vi.fn() }));

const datos = {
  vehiculos: VEHICULOS,
  clientes: CLIENTES,
  tipos: TIPOS,
  marcas: MARCAS,
  modelos: MODELOS,
  activos: ACTIVOS,
};
const filas = armarFilas(datos);
const placas = (lista) => lista.map((fila) => fila.vehiculo.identificador);

describe('armarFilas', () => {
  it('ordena por placa', () => {
    expect(placas(filas)).toEqual(['ABC12D', 'KLM234', 'R48213']);
  });

  it('cruza el tipo (nombre visible), el modelo, el propietario y si está dentro', () => {
    const klm = filas.find((fila) => fila.vehiculo.identificador === 'KLM234');
    expect(klm).toMatchObject({
      tipo: 'Carro',
      modelo: 'Mazda 3',
      propietario: LAURA,
      activo: expect.objectContaining({ idRegistro: 28 }),
      otrosVehiculos: [{ idVehiculo: 41, identificador: 'ABC12D' }],
    });

    const camion = filas.find((fila) => fila.vehiculo.identificador === 'R48213');
    expect(camion).toMatchObject({
      tipo: 'Camión de carga pesada',
      modelo: null,
      activo: null,
      otrosVehiculos: [],
    });
  });
});

describe('filtrarFilas', () => {
  it('sin texto devuelve todas', () => {
    expect(filtrarFilas(filas, '  ')).toBe(filas);
  });

  it('por parte de la placa, sin importar guiones ni minúsculas', () => {
    expect(placas(filtrarFilas(filas, 'klm-2'))).toEqual(['KLM234']);
  });

  it('por documento, aunque se escriba con puntos', () => {
    expect(placas(filtrarFilas(filas, '1.012.345'))).toEqual(['ABC12D', 'KLM234']);
  });

  it('por nombre, sin importar tildes ni mayúsculas', () => {
    expect(placas(filtrarFilas(filas, 'perez'))).toEqual(['ABC12D', 'KLM234']);
    expect(placas(filtrarFilas(filas, 'JORGE'))).toEqual(['R48213']);
  });

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(filtrarFilas(filas, 'zzz')).toEqual([]);
  });
});

describe('ayudas de texto', () => {
  it('sinTildes', () => {
    expect(sinTildes('Pérez Gómez')).toBe('perez gomez');
  });

  it('contarVehiculos', () => {
    expect(contarVehiculos(1)).toBe('1 vehículo');
    expect(contarVehiculos(3)).toBe('3 vehículos');
  });

  it('nombrePropietario', () => {
    expect(nombrePropietario(LAURA)).toBe('Laura Camila Pérez');
    expect(nombrePropietario(null)).toBeNull();
  });
});

describe('cargarVehiculos', () => {
  it('trae todo en paralelo y arma las filas', async () => {
    listarVehiculos.mockResolvedValue(VEHICULOS);
    listarClientes.mockResolvedValue(CLIENTES);
    listarTiposVehiculo.mockResolvedValue(TIPOS);
    listarMarcas.mockResolvedValue(MARCAS);
    listarModelos.mockResolvedValue(MODELOS);
    listarActivos.mockResolvedValue(ACTIVOS);

    const resultado = await cargarVehiculos();

    expect(placas(resultado.filas)).toEqual(['ABC12D', 'KLM234', 'R48213']);
    expect(resultado.marcas).toBe(MARCAS);
    expect(resultado.modelos).toBe(MODELOS);
  });
});
