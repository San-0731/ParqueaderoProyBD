import { codigoEspacio, estadoEspacio, nombreEspacio } from './espacio.js';

describe('codigoEspacio', () => {
  it('une la zona y el número', () => {
    expect(codigoEspacio({ zona: 'A', numero: '01' })).toBe('A-01');
  });
});

describe('nombreEspacio', () => {
  it('agrega el piso', () => {
    expect(nombreEspacio({ piso: '2', zona: 'B', numero: '04' })).toBe('B-04, piso 2');
  });
});

describe('estadoEspacio', () => {
  const registro = { idRegistro: 28 };

  it.each([
    ['libre', { habilitado: true, ocupado: false }, null],
    ['ocupado', { habilitado: true, ocupado: true }, registro],
    ['deshabilitado', { habilitado: false, ocupado: false }, null],
    // Igual que el reporte de ocupación: el vehículo que sigue adentro manda.
    ['ocupado', { habilitado: false, ocupado: true }, registro],
    // Las consultas se pueden cruzar por milisegundos: basta una de las dos señales.
    ['ocupado', { habilitado: true, ocupado: true }, null],
    ['ocupado', { habilitado: true, ocupado: false }, registro],
  ])('%s con %o', (esperado, espacio, registroActivo) => {
    expect(estadoEspacio(espacio, registroActivo)).toBe(esperado);
  });
});
