import {
  consultaParaApi,
  contarParqueos,
  filtrarPorPlaca,
  filtrosDesdeUrl,
  filtrosParaUrl,
  paginar,
  totalValor,
} from './datosHistorial.js';
import { HISTORIAL, VEINTICINCO } from './datosPrueba.js';

const HOY = '2026-11-06';
const url = (texto) => new URLSearchParams(texto);

describe('filtrosDesdeUrl', () => {
  it('con la URL vacía usa los últimos 7 días', () => {
    expect(filtrosDesdeUrl(url(''), HOY)).toEqual({
      desde: '2026-10-31',
      hasta: '2026-11-06',
      identificador: '',
      idMetodo: '',
      pagina: 1,
    });
  });

  it('con solo la placa (enlace de la ficha) no limita las fechas', () => {
    expect(filtrosDesdeUrl(url('identificador=KLM234'), HOY)).toMatchObject({
      desde: '',
      hasta: '',
      identificador: 'KLM234',
    });
  });

  it('todo=1 es sin fechas', () => {
    expect(filtrosDesdeUrl(url('todo=1'), HOY)).toMatchObject({ desde: '', hasta: '' });
  });

  it('lee las fechas, el método y la página', () => {
    expect(
      filtrosDesdeUrl(url('desde=2026-10-01&hasta=2026-10-31&metodo=2&pagina=3'), HOY),
    ).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-31',
      identificador: '',
      idMetodo: '2',
      pagina: 3,
    });
  });

  it('una página inválida queda en 1', () => {
    expect(filtrosDesdeUrl(url('todo=1&pagina=abc'), HOY).pagina).toBe(1);
    expect(filtrosDesdeUrl(url('todo=1&pagina=-2'), HOY).pagina).toBe(1);
  });
});

describe('filtrosParaUrl', () => {
  it('escribe solo lo que tiene valor', () => {
    expect(
      filtrosParaUrl({
        desde: '2026-10-01',
        hasta: '',
        identificador: '',
        idMetodo: '1',
        pagina: 1,
      }),
    ).toEqual({ desde: '2026-10-01', metodo: '1' });
  });

  it('sin fechas escribe todo=1 (la URL vacía significa "últimos 7 días")', () => {
    expect(filtrosParaUrl({ desde: '', hasta: '', identificador: 'KLM', idMetodo: '' })).toEqual({
      todo: '1',
      identificador: 'KLM',
    });
  });

  it('la página 1 no se escribe; las demás sí', () => {
    expect(filtrosParaUrl({ desde: '', hasta: '', pagina: 2 })).toEqual({ todo: '1', pagina: '2' });
  });
});

describe('consultaParaApi', () => {
  it('envía fechas y método (como número) y omite los vacíos', () => {
    expect(consultaParaApi({ desde: '2026-10-01', hasta: '2026-10-31', idMetodo: '2' })).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-31',
      idMetodoPago: 2,
    });
    expect(consultaParaApi({ desde: '', hasta: '', idMetodo: '' })).toEqual({});
  });

  it('no envía la placa: se filtra en el navegador', () => {
    expect(consultaParaApi({ desde: '', hasta: '', identificador: 'KLM234' })).toEqual({});
  });
});

describe('filtrarPorPlaca', () => {
  it('busca por parte de la placa, sin importar guiones ni minúsculas', () => {
    expect(filtrarPorPlaca(HISTORIAL, 'r48-').map((fila) => fila.idRegistro)).toEqual([9]);
    expect(filtrarPorPlaca(HISTORIAL, '')).toBe(HISTORIAL);
  });
});

describe('totalValor', () => {
  it('suma el valor de todas las filas (los sin cobro suman 0)', () => {
    expect(totalValor(HISTORIAL)).toBe(42000);
    expect(totalValor(VEINTICINCO)).toBe(25000);
    expect(totalValor([])).toBe(0);
  });
});

describe('paginar', () => {
  it('parte en páginas de 20', () => {
    expect(paginar(VEINTICINCO, 1)).toMatchObject({ pagina: 1, totalPaginas: 2 });
    expect(paginar(VEINTICINCO, 1).filas).toHaveLength(20);
    expect(paginar(VEINTICINCO, 2).filas).toHaveLength(5);
  });

  it('una página que no existe se ajusta a la última', () => {
    expect(paginar(VEINTICINCO, 9)).toMatchObject({ pagina: 2, totalPaginas: 2 });
  });

  it('sin filas hay una sola página vacía', () => {
    expect(paginar([], 1)).toEqual({ filas: [], pagina: 1, totalPaginas: 1 });
  });
});

describe('textos', () => {
  it('contarParqueos', () => {
    expect(contarParqueos(1)).toBe('1 parqueo terminado');
    expect(contarParqueos(27)).toBe('27 parqueos terminados');
  });
});
