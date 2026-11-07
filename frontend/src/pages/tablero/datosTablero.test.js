import { listarEspacios } from '../../api/espacios.js';
import { listarActivos } from '../../api/registros.js';
import { consultarOcupacion } from '../../api/reportes.js';
import { agruparPorPisoYZona, cargarTablero, tipoElegido, totalGeneral } from './datosTablero.js';
import { ACTIVOS, ESPACIOS, OCUPACION } from './datosPrueba.js';

vi.mock('../../api/espacios.js', () => ({ listarEspacios: vi.fn() }));
vi.mock('../../api/reportes.js', () => ({ consultarOcupacion: vi.fn() }));
vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn() }));

describe('cargarTablero', () => {
  it('junta las 3 consultas y la hora en que se hicieron', async () => {
    listarEspacios.mockResolvedValue(ESPACIOS);
    consultarOcupacion.mockResolvedValue(OCUPACION);
    listarActivos.mockResolvedValue(ACTIVOS);

    const datos = await cargarTablero();

    expect(datos).toMatchObject({ espacios: ESPACIOS, ocupacion: OCUPACION, activos: ACTIVOS });
    expect(datos.actualizado).toBeInstanceOf(Date);
  });

  it('si una consulta falla, falla todo', async () => {
    listarEspacios.mockResolvedValue(ESPACIOS);
    consultarOcupacion.mockRejectedValue(new Error('sin conexión'));
    listarActivos.mockResolvedValue(ACTIVOS);

    await expect(cargarTablero()).rejects.toThrow('sin conexión');
  });
});

describe('totalGeneral', () => {
  it('suma todos los tipos', () => {
    expect(totalGeneral(OCUPACION)).toEqual({
      total: 6,
      libres: 3,
      ocupados: 2,
      deshabilitados: 1,
    });
  });

  it('sin tipos, todo en cero', () => {
    expect(totalGeneral([])).toEqual({ total: 0, libres: 0, ocupados: 0, deshabilitados: 0 });
  });
});

describe('tipoElegido', () => {
  it.each([
    ['3', 3],
    [null, null],
    ['', null],
    ['abc', null],
    ['99', null], // no existe
    ['2', null], // existe pero no tiene espacios
  ])('?tipo=%s → %s', (valor, esperado) => {
    expect(tipoElegido(valor, OCUPACION)).toBe(esperado);
  });
});

describe('agruparPorPisoYZona', () => {
  const datos = { espacios: ESPACIOS, activos: ACTIVOS, ocupacion: OCUPACION };

  it('agrupa por piso y zona respetando el orden del backend', () => {
    const pisos = agruparPorPisoYZona(datos);

    expect(pisos.map((piso) => piso.piso)).toEqual(['1', '2']);
    expect(pisos[0].zonas.map((zona) => zona.zona)).toEqual(['A', 'M']);
    expect(pisos[0].zonas.map((zona) => zona.nombre)).toEqual(['A1', 'M1']);
    expect(pisos[0].zonas[0].espacios.map((espacio) => espacio.codigo)).toEqual([
      'A1-01',
      'A1-02',
      'A1-03',
    ]);
  });

  it('cada zona trae el nombre del tipo y cuántos espacios libres tiene', () => {
    const [zonaA, zonaM] = agruparPorPisoYZona(datos)[0].zonas;

    expect(zonaA).toMatchObject({ tipos: ['Carro'], libres: 1 });
    expect(zonaM).toMatchObject({ tipos: ['Moto'], libres: 2 });
  });

  it('cada espacio trae su estado y su registro activo', () => {
    const [libre, ocupado, deshabilitado] = agruparPorPisoYZona(datos)[0].zonas[0].espacios;

    expect(libre).toMatchObject({ estado: 'libre', registro: null });
    expect(ocupado).toMatchObject({ estado: 'ocupado', registro: { idRegistro: 28 } });
    expect(deshabilitado).toMatchObject({ estado: 'deshabilitado', registro: null });
  });

  it('con un tipo elegido quita los pisos y zonas que quedan vacíos', () => {
    const pisos = agruparPorPisoYZona({ ...datos, idTipo: 1 });

    expect(pisos).toHaveLength(1);
    expect(pisos[0].zonas.map((zona) => zona.zona)).toEqual(['M']);
  });
});
