import {
  alturaRelativa,
  diasDelRango,
  ingresosPorMetodo,
  maximoDeSerie,
  partesOcupacion,
  porcentaje,
  serieDiaria,
} from './datosReportes.js';
import { INGRESOS_1_AL_5_OCTUBRE, METODOS, OCUPACION } from './datosPrueba.js';

describe('ingresosPorMetodo', () => {
  const tarjetas = ingresosPorMetodo(
    METODOS,
    INGRESOS_1_AL_5_OCTUBRE.porMetodo,
    INGRESOS_1_AL_5_OCTUBRE.totalGeneral,
  );

  it('los totales por método suman el total general', () => {
    const suma = tarjetas.reduce((total, tarjeta) => total + tarjeta.total, 0);
    expect(suma).toBe(INGRESOS_1_AL_5_OCTUBRE.totalGeneral);
  });

  it('trae todos los métodos del catálogo, en su orden; los que no tuvieron pagos en $ 0', () => {
    expect(tarjetas).toEqual([
      { nombre: 'PSE', total: 145000, cantidad: 2, porcentaje: 80 },
      { nombre: 'Nequi', total: 10000, cantidad: 1, porcentaje: 6 },
      { nombre: 'Daviplata', total: 26000, cantidad: 2, porcentaje: 14 },
      { nombre: 'Efectivo', total: 0, cantidad: 0, porcentaje: 0 },
    ]);
  });

  it('un método que no está en el catálogo se agrega al final', () => {
    const resultado = ingresosPorMetodo(
      METODOS.slice(0, 1),
      [{ metodoPago: 'Bono', cantidadPagos: 1, totalRecaudado: 5000 }],
      5000,
    );
    expect(resultado.map((tarjeta) => tarjeta.nombre)).toEqual(['PSE', 'Bono']);
  });
});

describe('porcentaje', () => {
  it('redondea y no divide por cero', () => {
    expect(porcentaje(4000, 15000)).toBe(27);
    expect(porcentaje(0, 0)).toBe(0);
  });
});

describe('serieDiaria', () => {
  it('con un rango corto dibuja todos los días; los que no tuvieron pagos en cero', () => {
    const serie = serieDiaria(INGRESOS_1_AL_5_OCTUBRE.porDia, '2026-10-01', '2026-10-05');
    expect(serie).toEqual([
      { fecha: '2026-10-01', total: 130000, cantidad: 2 },
      { fecha: '2026-10-02', total: 6000, cantidad: 1 },
      { fecha: '2026-10-03', total: 0, cantidad: 0 },
      { fecha: '2026-10-04', total: 0, cantidad: 0 },
      { fecha: '2026-10-05', total: 45000, cantidad: 2 },
    ]);
  });

  it('cruza de mes sin saltarse días', () => {
    expect(serieDiaria([], '2026-10-30', '2026-11-02').map((dia) => dia.fecha)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
  });

  it('sin fechas o con más de 62 días, solo los días con pagos', () => {
    expect(serieDiaria(INGRESOS_1_AL_5_OCTUBRE.porDia, '', '')).toHaveLength(3);
    expect(serieDiaria(INGRESOS_1_AL_5_OCTUBRE.porDia, '2026-01-01', '2026-12-31')).toHaveLength(3);
  });

  it('diasDelRango cuenta ambos extremos', () => {
    expect(diasDelRango('2026-10-01', '2026-10-31')).toBe(31);
    expect(diasDelRango('2026-11-06', '2026-11-06')).toBe(1);
  });
});

describe('alturaRelativa', () => {
  it('es proporcional al día más alto', () => {
    expect(alturaRelativa(130000, 130000)).toBe(100);
    expect(alturaRelativa(65000, 130000)).toBe(50);
    expect(alturaRelativa(0, 130000)).toBe(0);
  });

  it('con el máximo en 0 todas miden 0', () => {
    expect(alturaRelativa(0, 0)).toBe(0);
  });

  it('maximoDeSerie', () => {
    expect(maximoDeSerie(serieDiaria(INGRESOS_1_AL_5_OCTUBRE.porDia, '', ''))).toBe(130000);
    expect(maximoDeSerie([])).toBe(0);
  });
});

describe('partesOcupacion', () => {
  it('reparte el ancho de la barra según la cantidad de cada estado', () => {
    const carro = OCUPACION.find((tipo) => tipo.tipoVehiculo === 'Carro');
    const partes = partesOcupacion(carro);
    expect(partes.ocupados).toBeCloseTo(16.67, 1);
    expect(partes.libres).toBe(75);
    expect(partes.deshabilitados).toBeCloseTo(8.33, 1);
    expect(partes.ocupados + partes.libres + partes.deshabilitados).toBeCloseTo(100);
  });
});
