import { obtenerCliente } from '../../api/clientes.js';
import { listarActivos } from '../../api/registros.js';
import { listarVehiculos } from '../../api/vehiculos.js';
import {
  agruparPorPiso,
  buscarVehiculo,
  calcularVista,
  describirModelo,
  espaciosParaTipo,
  mensajePreseleccion,
  nombreTipo,
  revisarPreseleccion,
} from './datosEntrada.js';
import {
  ABC12D,
  ACTIVO_MVC054,
  ESPACIOS,
  KLM234,
  LAURA,
  MARCAS,
  MODELOS,
  TIPOS,
} from './datosPrueba.js';

vi.mock('../../api/vehiculos.js', () => ({ listarVehiculos: vi.fn() }));
vi.mock('../../api/clientes.js', () => ({ obtenerCliente: vi.fn() }));
vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn() }));

describe('buscarVehiculo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerCliente.mockResolvedValue(LAURA);
  });

  it('si no está registrado devuelve null sin más consultas', async () => {
    listarVehiculos.mockResolvedValue([]);

    expect(await buscarVehiculo('KLM999')).toBeNull();
    expect(listarVehiculos).toHaveBeenCalledWith({ identificador: 'KLM999' });
    expect(obtenerCliente).not.toHaveBeenCalled();
  });

  it('si existe trae su propietario y si no está adentro registroActivo es null', async () => {
    listarVehiculos.mockResolvedValue([KLM234]);
    listarActivos.mockResolvedValue([]);

    expect(await buscarVehiculo('KLM234')).toEqual({
      vehiculo: KLM234,
      propietario: LAURA,
      registroActivo: null,
    });
    expect(obtenerCliente).toHaveBeenCalledWith(7);
  });

  it('si ya está adentro trae su registro activo', async () => {
    listarVehiculos.mockResolvedValue([{ ...KLM234, identificador: 'MVC054' }]);
    listarActivos.mockResolvedValue([ACTIVO_MVC054]);

    const ficha = await buscarVehiculo('MVC054');

    expect(ficha.registroActivo).toEqual(ACTIVO_MVC054);
    expect(listarActivos).toHaveBeenCalledWith({ identificador: 'MVC054' });
  });
});

describe('espaciosParaTipo', () => {
  it('solo los disponibles del tipo pedido', () => {
    expect(espaciosParaTipo(ESPACIOS, 3).map((espacio) => espacio.idEspacio)).toEqual([1, 3, 6]);
    expect(espaciosParaTipo(ESPACIOS, 1).map((espacio) => espacio.idEspacio)).toEqual([5]);
  });
});

describe('revisarPreseleccion', () => {
  it.each([
    [1, 3, 'valida'],
    [1, null, 'valida'], // antes de buscar el vehículo solo se revisa que esté libre
    [5, 3, 'otroTipo'],
    [2, 3, 'noDisponible'], // ocupado
    [4, 3, 'noDisponible'], // deshabilitado
    [999, 3, 'noExiste'],
    [Number.NaN, 3, 'noExiste'], // ?idEspacio=abc
  ])('espacio %s con tipo %s → %s', (idEspacio, idTipo, esperado) => {
    expect(revisarPreseleccion(ESPACIOS, idEspacio, idTipo).estado).toBe(esperado);
  });
});

describe('mensajePreseleccion', () => {
  const revisar = (idEspacio, idTipo) => revisarPreseleccion(ESPACIOS, idEspacio, idTipo);

  it('sin preselección o si es válida no hay aviso', () => {
    expect(mensajePreseleccion(null, TIPOS, 'Carro')).toBeNull();
    expect(mensajePreseleccion(revisar(1, 3), TIPOS, 'Carro')).toBeNull();
  });

  it('explica por qué no se puede usar', () => {
    expect(mensajePreseleccion(revisar(5, 3), TIPOS, 'Carro')).toBe(
      'El espacio M-01 que elegiste en el tablero es para Moto y este vehículo es Carro. ' +
        'Elige uno de estos.',
    );
    expect(mensajePreseleccion(revisar(2, 3), TIPOS, 'Carro')).toBe(
      'El espacio A-02 que elegiste en el tablero ya no está libre. Elige otro.',
    );
    expect(mensajePreseleccion(revisar(999, 3), TIPOS, 'Carro')).toBe(
      'El espacio que llegó en el enlace no existe. Elige uno de la lista.',
    );
  });
});

describe('agruparPorPiso', () => {
  it('respeta el orden en que llegan', () => {
    const pisos = agruparPorPiso(espaciosParaTipo(ESPACIOS, 3));

    expect(pisos.map(({ piso }) => piso)).toEqual(['1', '2']);
    expect(pisos[0].espacios.map((espacio) => espacio.idEspacio)).toEqual([1, 3]);
  });
});

describe('nombreTipo y describirModelo', () => {
  it('nombre del tipo', () => {
    expect(nombreTipo(3, TIPOS)).toBe('Carro');
    expect(nombreTipo(99, TIPOS)).toBeNull();
    // El camión se muestra con su nombre largo (solo en pantalla).
    expect(nombreTipo(4, [{ idTipo: 4, nombre: 'Camión' }])).toBe('Camión de carga pesada');
  });

  it('marca y modelo juntos, o null sin modelo', () => {
    expect(describirModelo(10, MODELOS, MARCAS)).toBe('Mazda 3');
    expect(describirModelo(null, MODELOS, MARCAS)).toBeNull();
  });
});

describe('calcularVista', () => {
  const datos = { tipos: TIPOS, marcas: MARCAS, modelos: MODELOS, espacios: ESPACIOS };
  const encontrado = (vehiculo, registroActivo = null) => ({
    identificador: vehiculo.identificador,
    ficha: { vehiculo, propietario: LAURA, registroActivo },
  });
  const vista = (cambios) =>
    calcularVista({ datos, resultado: null, eleccion: null, textoPreseleccion: null, ...cambios });

  it('sin buscar: falta todo y el paso 2 explica por qué está inactivo', () => {
    const { listo, faltantes, motivoInactivo, espacioResumen } = vista({});

    expect(listo).toBe(false);
    expect(faltantes).toEqual(['buscar el vehículo', 'elegir un espacio']);
    expect(motivoInactivo).toMatch(/^Primero busca el vehículo/);
    expect(espacioResumen).toBeNull();
  });

  it('antes de buscar, el resumen ya muestra el espacio del tablero', () => {
    expect(vista({ textoPreseleccion: '3' }).espacioResumen).toMatchObject({ idEspacio: 3 });
  });

  it('con el vehículo encontrado, el espacio del tablero queda elegido', () => {
    const resultado = vista({ resultado: encontrado(KLM234), textoPreseleccion: '3' });

    expect(resultado.listo).toBe(true);
    expect(resultado.tipoVehiculo).toBe('Carro');
    expect(resultado.espacioElegido).toMatchObject({ idEspacio: 3 });
    expect(resultado.faltantes).toEqual([]);
  });

  it('el espacio tocado gana al del tablero', () => {
    const resultado = vista({ resultado: encontrado(KLM234), textoPreseleccion: '3', eleccion: 6 });

    expect(resultado.espacioElegido).toMatchObject({ idEspacio: 6 });
  });

  it('un espacio del tablero de otro tipo no se elige y se avisa', () => {
    const resultado = vista({ resultado: encontrado(ABC12D), textoPreseleccion: '3' });

    expect(resultado.espaciosLibres.map((espacio) => espacio.idEspacio)).toEqual([5]);
    expect(resultado.espacioElegido).toBeNull();
    expect(resultado.aviso).toMatch(/es para Carro y este vehículo es Moto/);
  });

  it('no registrado: falta registrarlo', () => {
    const resultado = vista({ resultado: { identificador: 'KLM999', ficha: null } });

    expect(resultado.faltantes).toEqual(['registrar el vehículo', 'elegir un espacio']);
    expect(resultado.motivoInactivo).toMatch(/^Registra el vehículo/);
  });

  it('ya dentro: no se puede elegir espacio', () => {
    const resultado = vista({
      resultado: encontrado(KLM234, ACTIVO_MVC054),
      eleccion: 1,
      textoPreseleccion: '3',
    });

    expect(resultado.listo).toBe(false);
    expect(resultado.espacioElegido).toBeNull();
    expect(resultado.espacioResumen).toBeNull();
    expect(resultado.faltantes).toEqual([]);
    expect(resultado.motivoInactivo).toMatch(/ya está dentro/);
  });
});
