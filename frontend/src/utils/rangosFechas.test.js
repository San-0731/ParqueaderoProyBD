import {
  describirRango,
  esAtajoActivo,
  rangoDeAtajo,
  rangoDesdeUrl,
  rangoParaUrl,
  validarRango,
} from './rangosFechas.js';

const HOY = '2026-11-06';
const url = (texto) => new URLSearchParams(texto);

describe('rangoDeAtajo', () => {
  it.each([
    ['hoy', '2026-11-06', '2026-11-06'],
    ['7', '2026-10-31', '2026-11-06'],
    ['30', '2026-10-08', '2026-11-06'],
    ['mes', '2026-11-01', '2026-11-06'],
    ['mesAnterior', '2026-10-01', '2026-10-31'],
    ['todo', '', ''],
  ])('%s va de "%s" a "%s"', (clave, desde, hasta) => {
    expect(rangoDeAtajo(clave, HOY)).toEqual({ desde, hasta });
  });

  it('el mes anterior de enero es diciembre del año pasado', () => {
    expect(rangoDeAtajo('mesAnterior', '2027-01-15')).toEqual({
      desde: '2026-12-01',
      hasta: '2026-12-31',
    });
  });

  it('el mes anterior sabe cuántos días tiene febrero', () => {
    expect(rangoDeAtajo('mesAnterior', '2028-03-10').hasta).toBe('2028-02-29');
  });
});

describe('esAtajoActivo', () => {
  it('el atajo activo es el que coincide con las fechas', () => {
    const filtros = { desde: '2026-10-31', hasta: '2026-11-06' };
    expect(esAtajoActivo('7', filtros, HOY)).toBe(true);
    expect(esAtajoActivo('30', filtros, HOY)).toBe(false);
  });
});

describe('validarRango', () => {
  it('"desde" posterior a "hasta" da el mismo mensaje que el backend', () => {
    expect(validarRango('2026-10-31', '2026-10-01')).toBe(
      "La fecha 'desde' (31/10/2026) no puede ser posterior a la fecha 'hasta' (01/10/2026).",
    );
  });

  it('el mismo día, una sola fecha o ninguna son válidos', () => {
    expect(validarRango('2026-10-01', '2026-10-01')).toBeNull();
    expect(validarRango('2026-10-01', '')).toBeNull();
    expect(validarRango('', '')).toBeNull();
  });
});

describe('describirRango', () => {
  it('describe el rango con fechas en formato colombiano', () => {
    expect(describirRango({ desde: '2026-10-31', hasta: '2026-11-06' })).toBe(
      'entre el 31/10/2026 y el 06/11/2026',
    );
    expect(describirRango({ desde: '2026-10-31', hasta: '' })).toBe('desde el 31/10/2026');
    expect(describirRango({ desde: '', hasta: '2026-11-06' })).toBe('hasta el 06/11/2026');
    expect(describirRango({ desde: '', hasta: '' })).toBe('');
  });
});

describe('rango en la URL', () => {
  const porDefecto = { desde: '2026-11-01', hasta: '2026-11-06' };

  it('la URL vacía usa el rango por defecto', () => {
    expect(rangoDesdeUrl(url(''), porDefecto)).toEqual(porDefecto);
  });

  it('todo=1 u otro filtro de la pantalla quitan el rango por defecto', () => {
    expect(rangoDesdeUrl(url('todo=1'), porDefecto)).toEqual({ desde: '', hasta: '' });
    expect(rangoDesdeUrl(url('metodo=2'), porDefecto, ['metodo'])).toEqual({
      desde: '',
      hasta: '',
    });
  });

  it('rangoParaUrl escribe las fechas, o todo=1 si no hay ninguna', () => {
    expect(rangoParaUrl({ desde: '2026-10-01', hasta: '2026-10-31' })).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-31',
    });
    expect(rangoParaUrl({ desde: '', hasta: '' })).toEqual({ todo: '1' });
  });
});
