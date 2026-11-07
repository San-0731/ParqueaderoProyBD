import { fechaLocalIso, inicioDeMes, sumarDias } from './fechas.js';

describe('fechaLocalIso', () => {
  it('usa la fecha local, también de noche (toISOString daría el día siguiente en UTC)', () => {
    expect(fechaLocalIso(new Date(2026, 10, 6, 23, 30))).toBe('2026-11-06');
    expect(fechaLocalIso(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });
});

describe('sumarDias', () => {
  it('resta días cruzando de mes', () => {
    expect(sumarDias('2026-11-06', -6)).toBe('2026-10-31');
  });

  it('suma días cruzando de año', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('inicioDeMes', () => {
  it('devuelve el primer día del mes', () => {
    expect(inicioDeMes('2026-11-06')).toBe('2026-11-01');
  });
});
