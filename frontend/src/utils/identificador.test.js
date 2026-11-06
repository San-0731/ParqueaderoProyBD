import { formatearPlaca, normalizarIdentificador, validarIdentificador } from './identificador.js';

describe('normalizarIdentificador', () => {
  it.each([
    ['abc-123', 'ABC123'],
    [' abc 123 ', 'ABC123'],
    ['klm-23 4', 'KLM234'],
    ['ABC12D', 'ABC12D'],
    ['', ''],
  ])('"%s" → "%s"', (texto, esperado) => {
    expect(normalizarIdentificador(texto)).toBe(esperado);
  });

  it('devuelve una cadena vacía con null o undefined', () => {
    expect(normalizarIdentificador(null)).toBe('');
    expect(normalizarIdentificador(undefined)).toBe('');
  });
});

describe('validarIdentificador', () => {
  it('acepta letras y números (después de normalizar)', () => {
    expect(validarIdentificador('abc-123')).toBeNull();
  });

  it('exige el identificador', () => {
    expect(validarIdentificador(' - ')).toBe(
      'El identificador (placa o código) del vehículo es obligatorio.',
    );
  });

  it('no acepta más de 40 caracteres', () => {
    expect(validarIdentificador('A'.repeat(41))).toBe(
      'El identificador no puede tener más de 40 caracteres.',
    );
    expect(validarIdentificador('A'.repeat(40))).toBeNull();
  });

  it('no acepta letras fuera de la A a la Z ni símbolos', () => {
    const mensaje = 'La placa o código solo puede tener letras de la A a la Z y números.';
    expect(validarIdentificador('ABÑ123')).toBe(mensaje);
    expect(validarIdentificador('ABC.123')).toBe(mensaje);
  });
});

describe('formatearPlaca', () => {
  it.each([
    ['KLM234', 'KLM 234'],
    ['klm-234', 'KLM 234'],
    ['ABC12D', 'ABC 12D'],
    ['WTU2024A0153', 'WTU2024A0153'],
    ['', ''],
  ])('"%s" se muestra como "%s"', (identificador, esperado) => {
    expect(formatearPlaca(identificador)).toBe(esperado);
  });
});
