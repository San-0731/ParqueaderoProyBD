import { codigoEspacio, nombreEspacio } from './espacio.js';

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
