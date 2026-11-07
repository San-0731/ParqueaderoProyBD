import { listarMetodosPago } from '../../api/catalogos.js';
import { consultarLiquidacion, listarActivos, obtenerRegistro } from '../../api/registros.js';
import {
  cargarCobro,
  contarVehiculos,
  datosParaSalida,
  datosRecibo,
  filtrarActivos,
  hayCobro,
  masReciente,
  nombreMetodo,
  validarPago,
} from './datosSalida.js';
import {
  ACTIVOS,
  LIQUIDACION_28,
  LIQUIDACION_28_FRESCA,
  LIQUIDACION_SIN_COBRO,
  METODOS,
  REGISTRO_28,
  SALIDA_28_NEQUI,
  SALIDA_28_SIN_COBRO,
} from './datosPrueba.js';

vi.mock('../../api/registros.js', () => ({
  obtenerRegistro: vi.fn(),
  consultarLiquidacion: vi.fn(),
  listarActivos: vi.fn(),
}));
vi.mock('../../api/catalogos.js', () => ({ listarMetodosPago: vi.fn() }));

const [PSE, NEQUI, , EFECTIVO] = METODOS;

describe('filtrarActivos', () => {
  it('sin texto devuelve todos', () => {
    expect(filtrarActivos(ACTIVOS, '')).toEqual(ACTIVOS);
  });

  it('busca por parte de la placa, sin importar guiones ni minúsculas', () => {
    const resultado = filtrarActivos(ACTIVOS, 'mv-');
    expect(resultado.map((activo) => activo.identificador)).toEqual(['MVC054', 'MVA123']);
    expect(filtrarActivos(ACTIVOS, 'c05').map((activo) => activo.idRegistro)).toEqual([28]);
  });

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(filtrarActivos(ACTIVOS, 'ZZZ')).toEqual([]);
  });
});

describe('contarVehiculos', () => {
  it('usa el singular con uno', () => {
    expect(contarVehiculos(1)).toBe('1 vehículo');
    expect(contarVehiculos(5)).toBe('5 vehículos');
  });
});

describe('hayCobro', () => {
  it('es false con $ 0 y true con un valor mayor', () => {
    expect(hayCobro(LIQUIDACION_SIN_COBRO)).toBe(false);
    expect(hayCobro(LIQUIDACION_28)).toBe(true);
  });
});

describe('masReciente', () => {
  it('elige la liquidación calculada más tarde', () => {
    expect(masReciente(LIQUIDACION_28, LIQUIDACION_28_FRESCA)).toBe(LIQUIDACION_28_FRESCA);
    expect(masReciente(LIQUIDACION_28_FRESCA, LIQUIDACION_28)).toBe(LIQUIDACION_28_FRESCA);
  });

  it('si falta una, devuelve la otra', () => {
    expect(masReciente(LIQUIDACION_28, null)).toBe(LIQUIDACION_28);
    expect(masReciente(null, LIQUIDACION_28)).toBe(LIQUIDACION_28);
  });
});

describe('validarPago', () => {
  it('pide el método si hay algo que cobrar', () => {
    expect(validarPago({ cobra: true, metodo: null, referencia: '' })).toEqual({
      metodo: 'Elige cómo paga el cliente.',
    });
  });

  it('con $ 0 no pide método ni referencia', () => {
    expect(validarPago({ cobra: false, metodo: null, referencia: '' })).toEqual({});
  });

  it('PSE sin referencia da el mismo mensaje que el backend', () => {
    expect(validarPago({ cobra: true, metodo: PSE, referencia: '   ' })).toEqual({
      referencia: 'El pago con PSE requiere la referencia (código de la transacción).',
    });
  });

  it('la referencia no puede pasar de 60 caracteres (sin contar los espacios de los extremos)', () => {
    expect(validarPago({ cobra: true, metodo: NEQUI, referencia: 'A'.repeat(61) })).toEqual({
      referencia: 'La referencia no puede tener más de 60 caracteres.',
    });
    expect(validarPago({ cobra: true, metodo: NEQUI, referencia: ` ${'A'.repeat(60)} ` })).toEqual(
      {},
    );
  });

  it('efectivo no necesita referencia', () => {
    expect(validarPago({ cobra: true, metodo: EFECTIVO, referencia: '' })).toEqual({});
  });
});

describe('datosParaSalida', () => {
  it('envía el método y la referencia sin espacios en los extremos', () => {
    expect(datosParaSalida({ cobra: true, metodo: NEQUI, referencia: '  NEQ-1 ' })).toEqual({
      idMetodoPago: 2,
      referencia: 'NEQ-1',
    });
  });

  it('en efectivo no envía referencia aunque se haya escrito una', () => {
    expect(datosParaSalida({ cobra: true, metodo: EFECTIVO, referencia: 'NEQ-1' })).toEqual({
      idMetodoPago: 4,
      referencia: null,
    });
  });

  it('sin cobro no envía método ni referencia', () => {
    expect(datosParaSalida({ cobra: false, metodo: NEQUI, referencia: 'NEQ-1' })).toEqual({
      idMetodoPago: null,
      referencia: null,
    });
  });
});

describe('nombreMetodo', () => {
  it('busca el nombre en el catálogo', () => {
    expect(nombreMetodo(2, METODOS)).toBe('Nequi');
    expect(nombreMetodo(99, METODOS)).toBe('Método 99');
  });
});

describe('cargarCobro', () => {
  it('junta el registro, la liquidación, los métodos y el tipo y propietario del vehículo', async () => {
    obtenerRegistro.mockResolvedValue(REGISTRO_28);
    consultarLiquidacion.mockResolvedValue(LIQUIDACION_28);
    listarMetodosPago.mockResolvedValue(METODOS);
    listarActivos.mockResolvedValue(ACTIVOS);

    await expect(cargarCobro('28')).resolves.toEqual({
      registro: REGISTRO_28,
      liquidacion: LIQUIDACION_28,
      metodos: METODOS,
      tipoVehiculo: 'Carro',
      propietario: 'Laura Camila Pérez',
    });
    expect(obtenerRegistro).toHaveBeenCalledWith('28');
    expect(consultarLiquidacion).toHaveBeenCalledWith('28');
  });

  it('muestra el camión como "Camión de carga pesada"', async () => {
    obtenerRegistro.mockResolvedValue(REGISTRO_28);
    consultarLiquidacion.mockResolvedValue(LIQUIDACION_28);
    listarMetodosPago.mockResolvedValue(METODOS);
    listarActivos.mockResolvedValue([{ ...ACTIVOS[0], tipoVehiculo: 'Camión' }]);

    expect((await cargarCobro('28')).tipoVehiculo).toBe('Camión de carga pesada');
  });

  it('si el registro no aparece entre los activos, deja el tipo y el propietario en null', async () => {
    obtenerRegistro.mockResolvedValue(REGISTRO_28);
    consultarLiquidacion.mockResolvedValue(LIQUIDACION_28);
    listarMetodosPago.mockResolvedValue(METODOS);
    listarActivos.mockResolvedValue([]);

    const datos = await cargarCobro('28');
    expect(datos.tipoVehiculo).toBeNull();
    expect(datos.propietario).toBeNull();
  });
});

describe('datosRecibo', () => {
  it('usa los datos del registro cerrado, el nombre del método y el desglose confirmado', () => {
    const recibo = datosRecibo({
      detalle: SALIDA_28_NEQUI,
      liquidacion: LIQUIDACION_28_FRESCA,
      metodos: METODOS,
      tipoVehiculo: 'Carro',
    });

    expect(recibo).toEqual({
      idRegistro: 28,
      identificador: 'MVC054',
      tipoVehiculo: 'Carro',
      espacio: { piso: '1', zona: 'A', numero: '02' },
      entrada: '2026-11-06T12:18:00',
      salida: '2026-11-06T18:54:12',
      minutosTotales: 396,
      valorTotal: 34500,
      desglose: { horasCobradas: 7, valorHora: 5000 },
      metodo: 'Nequi',
      referencia: 'NEQ-1',
    });
  });

  it('si el backend cobró otro valor, omite el desglose en vez de recalcularlo', () => {
    const recibo = datosRecibo({
      detalle: { ...SALIDA_28_NEQUI, valorTotal: 39500 },
      liquidacion: LIQUIDACION_28_FRESCA,
      metodos: METODOS,
      tipoVehiculo: 'Carro',
    });

    expect(recibo.valorTotal).toBe(39500);
    expect(recibo.desglose).toBeNull();
  });

  it('sin pago: no hay método, referencia ni desglose', () => {
    const recibo = datosRecibo({
      detalle: SALIDA_28_SIN_COBRO,
      liquidacion: LIQUIDACION_SIN_COBRO,
      metodos: METODOS,
      tipoVehiculo: null,
    });

    expect(recibo).toMatchObject({ metodo: null, referencia: null, desglose: null, valorTotal: 0 });
  });
});
