import { MARCAS, MODELOS } from '../../pages/entrada/datosPrueba.js';
import { describirModelo, idMarcaDeModelo } from './modelos.js';

describe('describirModelo', () => {
  it('une la marca y el modelo', () => {
    expect(describirModelo(10, MODELOS, MARCAS)).toBe('Mazda 3');
  });

  it('sin modelo devuelve null', () => {
    expect(describirModelo(null, MODELOS, MARCAS)).toBeNull();
  });
});

describe('idMarcaDeModelo', () => {
  it('busca la marca del modelo', () => {
    expect(idMarcaDeModelo(20, MODELOS)).toBe(6);
    expect(idMarcaDeModelo(null, MODELOS)).toBeNull();
  });
});
