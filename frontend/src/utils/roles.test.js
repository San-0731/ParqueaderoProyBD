import { alcanza, nombreRol } from './roles.js';

describe('alcanza', () => {
  it.each([
    ['OPERADOR', 'OPERADOR', true],
    ['OPERADOR', 'ADMINISTRADOR', false],
    ['OPERADOR', 'DBA', false],
    ['ADMINISTRADOR', 'OPERADOR', true],
    ['ADMINISTRADOR', 'ADMINISTRADOR', true],
    ['ADMINISTRADOR', 'DBA', false],
    ['DBA', 'OPERADOR', true],
    ['DBA', 'ADMINISTRADOR', true],
    ['DBA', 'DBA', true],
  ])('%s alcanza %s: %s', (rol, minimo, esperado) => {
    expect(alcanza(rol, minimo)).toBe(esperado);
  });

  it('sin rol (sin sesión) o con uno desconocido nunca alcanza', () => {
    expect(alcanza(undefined, 'OPERADOR')).toBe(false);
    expect(alcanza('INVITADO', 'OPERADOR')).toBe(false);
  });
});

describe('nombreRol', () => {
  it('da el nombre para mostrar', () => {
    expect(nombreRol('OPERADOR')).toBe('Operador');
    expect(nombreRol('ADMINISTRADOR')).toBe('Administrador');
    expect(nombreRol('DBA')).toBe('DBA');
  });
});
