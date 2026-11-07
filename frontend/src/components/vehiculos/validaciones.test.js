import {
  clienteParaApi,
  normalizarDocumento,
  validarDocumento,
  PROPIETARIO_VACIO,
  validarPropietario,
  validarPropietarioNuevo,
  validarVehiculo,
  vehiculoParaApi,
} from './validaciones.js';

describe('normalizarDocumento y validarDocumento', () => {
  it('quita puntos, espacios y guiones y pasa a mayúsculas', () => {
    expect(normalizarDocumento(' 1.012.345-678 ')).toBe('1012345678');
    expect(normalizarDocumento('pa 123')).toBe('PA123');
  });

  it.each([
    ['', 'El documento del cliente es obligatorio.'],
    ['12#45', 'El documento solo puede tener letras (A-Z) y números.'],
    ['1'.repeat(21), 'El documento no puede tener más de 20 caracteres.'],
    ['1.012.345.678', null],
  ])('"%s" → %s', (documento, esperado) => {
    expect(validarDocumento(documento)).toBe(esperado);
  });
});

describe('validarPropietarioNuevo', () => {
  const valido = {
    documento: '1012345678',
    nombres: 'Laura Camila',
    apellidos: 'Pérez',
    telefono: '',
  };

  it('sin errores devuelve un objeto vacío (el teléfono es opcional)', () => {
    expect(validarPropietarioNuevo(valido)).toEqual({});
  });

  it('nombres y apellidos son obligatorios', () => {
    expect(validarPropietarioNuevo({ ...valido, nombres: '  ', apellidos: '' })).toEqual({
      nombres: 'Los nombres son obligatorios.',
      apellidos: 'Los apellidos son obligatorios.',
    });
  });

  it('nombres de más de 80 caracteres', () => {
    expect(validarPropietarioNuevo({ ...valido, nombres: 'a'.repeat(81) })).toEqual({
      nombres: 'Los nombres no pueden tener más de 80 caracteres.',
    });
  });

  it.each([
    ['310 456-7890', undefined],
    ['+573104567890', undefined],
    ['310abc', 'El teléfono solo puede tener números (y un + al inicio).'],
    ['1'.repeat(16), 'El teléfono no puede tener más de 15 caracteres.'],
  ])('teléfono "%s" → %s', (telefono, esperado) => {
    expect(validarPropietarioNuevo({ ...valido, telefono }).telefono).toBe(esperado);
  });
});

describe('validarPropietario', () => {
  it('pide buscar el documento antes de continuar', () => {
    expect(validarPropietario({ ...PROPIETARIO_VACIO, documento: '1012345678' })).toEqual({
      documento: 'Busca el documento para saber si el propietario ya está registrado.',
    });
    expect(validarPropietario(PROPIETARIO_VACIO)).toEqual({
      documento: 'El documento del cliente es obligatorio.',
    });
  });

  it('si el propietario existe no revisa nada más', () => {
    const encontrado = {
      ...PROPIETARIO_VACIO,
      documento: '1012345678',
      buscado: '1012345678',
      cliente: { idCliente: 7 },
    };
    expect(validarPropietario(encontrado)).toEqual({});
  });

  it('si es nuevo valida sus datos', () => {
    const nuevo = { ...PROPIETARIO_VACIO, documento: '555', buscado: '555' };
    expect(validarPropietario(nuevo)).toEqual({
      nombres: 'Los nombres son obligatorios.',
      apellidos: 'Los apellidos son obligatorios.',
    });
  });
});

describe('validarVehiculo', () => {
  const valido = { idMarca: '', idModelo: '', color: '', anio: '' };

  it('todos los datos son opcionales (el tipo sale de la placa)', () => {
    expect(validarVehiculo(valido)).toEqual({});
  });

  it('una marca sin modelo pide el modelo', () => {
    expect(validarVehiculo({ ...valido, idMarca: '3' })).toEqual({
      idModelo: 'Elige también el modelo o deja la marca vacía.',
    });
    expect(validarVehiculo({ ...valido, idMarca: '3', idModelo: '10' })).toEqual({});
  });

  it('color de más de 30 caracteres', () => {
    expect(validarVehiculo({ ...valido, color: 'x'.repeat(31) }).color).toBe(
      'El color no puede tener más de 30 caracteres.',
    );
  });

  it.each(['1899', '2101', '20.5', 'abc'])('año "%s" fuera de rango', (anio) => {
    expect(validarVehiculo({ ...valido, anio }).anio).toBe(
      'El año del vehículo debe estar entre 1900 y 2100.',
    );
  });
});

describe('cuerpos para la API', () => {
  it('cliente: documento y teléfono normalizados; teléfono vacío → null', () => {
    expect(
      clienteParaApi({
        documento: '1.012.345.678',
        nombres: ' Laura ',
        apellidos: ' Pérez ',
        telefono: '',
      }),
    ).toEqual({ documento: '1012345678', nombres: 'Laura', apellidos: 'Pérez', telefono: null });
  });

  it('vehículo: números y null en los opcionales vacíos', () => {
    expect(
      vehiculoParaApi({ identificador: 'KLM999', idModelo: '', color: ' ', anio: '' }, 7),
    ).toEqual({
      identificador: 'KLM999',
      idCliente: 7,
      idModelo: null,
      color: null,
      anio: null,
    });
    expect(
      vehiculoParaApi({ identificador: 'KLM999', idModelo: '10', color: 'Gris', anio: '2020' }, 7),
    ).toMatchObject({ idModelo: 10, color: 'Gris', anio: 2020 });
  });
});
