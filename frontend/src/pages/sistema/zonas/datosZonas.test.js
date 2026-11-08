import {
  errorCantidad,
  espaciosDisponibles,
  nombreDeZona,
  normalizarPiso,
  rangoActual,
  rangoNuevos,
  validarZonaNueva,
} from './datosZonas.js';

const A1 = { idZona: 1, piso: '1', letra: 'A', espacios: 8, ultimoNumero: '08' };
const VACIA = { idZona: 9, piso: '3', letra: 'D', espacios: 0, ultimoNumero: null };

describe('datosZonas', () => {
  it('nombra la zona con la letra y el piso', () => {
    expect(nombreDeZona(A1)).toBe('A1');
    expect(nombreDeZona(VACIA)).toBe('D3');
  });

  it('normaliza el piso como el backend', () => {
    expect(normalizarPiso('3')).toBe('3');
    expect(normalizarPiso(' 03 ')).toBe('3');
    expect(normalizarPiso('99')).toBe('99');
    for (const invalido of ['', '0', '100', '-1', 'P9', '1.5']) {
      expect(normalizarPiso(invalido)).toBeNull();
    }
  });

  it('valida la zona nueva campo por campo', () => {
    expect(validarZonaNueva({ piso: '3', letra: 'd', idTipo: '1' })).toEqual({});
    expect(validarZonaNueva({ piso: '0', letra: 'Ñ', idTipo: '' })).toEqual({
      piso: 'Escribe un número del 1 al 99.',
      letra: 'Una sola letra de la A a la Z (sin Ñ).',
      idTipo: 'Elige el tipo de vehículo.',
    });
  });

  it('sigue la numeración de la zona', () => {
    expect(rangoActual(A1)).toBe('01 a 08');
    expect(rangoActual(VACIA)).toBeNull();
    expect(rangoNuevos(A1, 3)).toBe('A1-09 a A1-11');
    expect(rangoNuevos(VACIA, 1)).toBe('D3-01');
    expect(espaciosDisponibles(A1)).toBe(91);
  });

  it('la cantidad va de 1 a lo que le cabe a la zona', () => {
    expect(errorCantidad('3', A1)).toBeUndefined();
    expect(errorCantidad('91', A1)).toBeUndefined();
    expect(errorCantidad('92', A1)).toMatch(/solo le caben 91 espacios más/);
    expect(errorCantidad('0', A1)).toMatch(/1 o más/);
    expect(errorCantidad('dos', A1)).toMatch(/1 o más/);
  });
});
