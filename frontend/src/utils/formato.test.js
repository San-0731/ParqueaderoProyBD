import {
  formatearDuracion,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  formatearPesos,
  minutosEntre,
  SIN_DATO,
} from './formato.js';

// Intl separa "$" y "p. m." con espacios especiales (no separables) que cambian según la
// versión del navegador. Para comparar, todos se convierten en espacios normales.
const espacios = (texto) => texto.replace(/\s/g, ' ');

describe('formatearPesos', () => {
  it.each([
    [0, '$ 0'],
    [12500, '$ 12.500'],
    [1500000, '$ 1.500.000'],
    ['5000.00', '$ 5.000'],
  ])('%s → %s', (valor, esperado) => {
    expect(espacios(formatearPesos(valor))).toBe(esperado);
  });

  it('muestra un guion cuando no hay valor', () => {
    expect(formatearPesos(null)).toBe(SIN_DATO);
    expect(formatearPesos(undefined)).toBe(SIN_DATO);
    expect(formatearPesos('abc')).toBe(SIN_DATO);
  });
});

describe('formatearFechaHora', () => {
  it('muestra la fecha y la hora en formato colombiano', () => {
    expect(espacios(formatearFechaHora('2026-11-03T14:30:00'))).toBe('03/11/2026 2:30 p. m.');
  });

  it('muestra la medianoche como 12 a. m.', () => {
    expect(espacios(formatearFechaHora('2026-11-03T00:05:00'))).toBe('03/11/2026 12:05 a. m.');
  });

  it('muestra un guion cuando no hay fecha (parqueo activo sin salida)', () => {
    expect(formatearFechaHora(null)).toBe(SIN_DATO);
    expect(formatearFechaHora('no es una fecha')).toBe(SIN_DATO);
  });
});

describe('formatearHora', () => {
  it('acepta el texto del backend', () => {
    expect(espacios(formatearHora('2026-11-03T15:45:00'))).toBe('3:45 p. m.');
  });

  it('acepta un Date', () => {
    expect(espacios(formatearHora(new Date(2026, 10, 3, 9, 5)))).toBe('9:05 a. m.');
  });

  it('muestra un guion cuando la hora no es válida', () => {
    expect(formatearHora(null)).toBe(SIN_DATO);
    expect(formatearHora(new Date('no es una fecha'))).toBe(SIN_DATO);
  });
});

describe('formatearFecha', () => {
  it('no corre un día las fechas sin hora (trampa de new Date con UTC)', () => {
    expect(formatearFecha('2026-10-01')).toBe('01/10/2026');
  });

  it('acepta también una fecha con hora', () => {
    expect(formatearFecha('2026-11-03T23:59:59')).toBe('03/11/2026');
  });

  it('muestra un guion cuando no hay fecha', () => {
    expect(formatearFecha(undefined)).toBe(SIN_DATO);
  });
});

describe('formatearDuracion', () => {
  it.each([
    [0, '0 min'],
    [59, '59 min'],
    [60, '1 h'],
    [61, '1 h 1 min'],
    [135, '2 h 15 min'],
  ])('%i minutos → %s', (minutos, esperado) => {
    expect(formatearDuracion(minutos)).toBe(esperado);
  });

  it('muestra un guion cuando no hay minutos', () => {
    expect(formatearDuracion(null)).toBe(SIN_DATO);
  });
});

describe('minutosEntre', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cuenta los minutos entre dos horas del mismo día', () => {
    expect(minutosEntre('2026-11-03T10:00:00', '2026-11-03T12:15:00')).toBe(135);
  });

  it('cruza la medianoche', () => {
    expect(minutosEntre('2026-11-03T23:50:00', '2026-11-04T00:10:00')).toBe(20);
  });

  it('descarta los segundos sobrantes, como TIMESTAMPDIFF', () => {
    expect(minutosEntre('2026-11-03T10:00:00', '2026-11-03T10:00:59')).toBe(0);
    expect(minutosEntre('2026-11-03T10:00:30', '2026-11-03T10:02:10')).toBe(1);
  });

  it('nunca devuelve minutos negativos', () => {
    expect(minutosEntre('2026-11-03T10:05:00', '2026-11-03T10:00:00')).toBe(0);
  });

  it('usa la hora actual cuando no se indica el fin', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0, 0));

    expect(minutosEntre('2026-11-03T11:30:00')).toBe(30);
  });

  it('devuelve null si una fecha no es válida', () => {
    expect(minutosEntre(null, '2026-11-03T10:00:00')).toBeNull();
    expect(minutosEntre('2026-11-03T10:00:00', 'mañana')).toBeNull();
  });
});
