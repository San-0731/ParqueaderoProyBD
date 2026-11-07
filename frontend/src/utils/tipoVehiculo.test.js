import { idTipoSegunPlaca, nombreTipoVisible, tipoSegunPlaca } from './tipoVehiculo.js';

describe('tipoSegunPlaca', () => {
  // Los mismos casos que TipoPorPlacaTest.java del backend.
  it.each([
    ['KLM234', 'Carro'],
    ['abc-123', 'Carro'],
    ['ABC12D', 'Moto'],
    ['qwe 45f', 'Moto'],
    ['R48213', 'Camión'],
    ['S12345', 'Camión'],
    ['s-00001', 'Camión'],
    ['WTU2024A0153', 'Bicicleta'],
    ['BICI0007', 'Bicicleta'],
    ['R1234', 'Bicicleta'],
    ['S123456', 'Bicicleta'],
    ['T12345', 'Bicicleta'],
    ['R48213X', 'Bicicleta'],
    ['ABC1234', 'Bicicleta'],
    ['AB123', 'Bicicleta'],
    ['ABC12', 'Bicicleta'],
    ['CD1234', 'Bicicleta'],
  ])('%s es %s', (placa, tipo) => {
    expect(tipoSegunPlaca(placa)).toBe(tipo);
  });

  it('sin placa devuelve null', () => {
    expect(tipoSegunPlaca('')).toBeNull();
    expect(tipoSegunPlaca(' - ')).toBeNull();
    expect(tipoSegunPlaca(null)).toBeNull();
  });
});

describe('idTipoSegunPlaca', () => {
  const tipos = [
    { idTipo: 1, nombre: 'Moto' },
    { idTipo: 3, nombre: 'Carro' },
    { idTipo: 4, nombre: 'Camión' },
  ];

  it('busca el id del tipo en el catálogo', () => {
    expect(idTipoSegunPlaca('KLM234', tipos)).toBe(3);
    expect(idTipoSegunPlaca('R48213', tipos)).toBe(4);
  });

  it('devuelve null si el catálogo no tiene ese tipo', () => {
    expect(idTipoSegunPlaca('BICI0007', tipos)).toBeNull();
  });
});

describe('nombreTipoVisible', () => {
  it('muestra el camión como "Camión de carga pesada"', () => {
    expect(nombreTipoVisible('Camión')).toBe('Camión de carga pesada');
  });

  it('deja igual los demás tipos', () => {
    expect(nombreTipoVisible('Carro')).toBe('Carro');
    expect(nombreTipoVisible('Bicicleta')).toBe('Bicicleta');
    expect(nombreTipoVisible(null)).toBeNull();
  });
});
