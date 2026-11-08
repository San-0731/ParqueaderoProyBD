import { formatearPesos } from '../../utils/formato.js';
import { describirAccion, detalle, formatearValor } from './datosAuditoria.js';
import { AUDITORIA } from './datosPrueba.js';

const [salida, pago, espacio, vehiculo, entrada] = AUDITORIA;

describe('describirAccion', () => {
  it('dice qué hizo cada cambio', () => {
    expect(describirAccion(salida)).toBe('Registró una salida');
    expect(describirAccion(pago)).toBe('Registró un pago');
    expect(describirAccion(espacio)).toBe('Deshabilitó un espacio');
    expect(describirAccion(vehiculo)).toBe('Registró un vehículo');
    expect(describirAccion(entrada)).toBe('Registró una entrada');
    expect(
      describirAccion({ ...espacio, datosDespues: { espacio: 'B2-04', habilitado: true } }),
    ).toBe('Habilitó un espacio');
    expect(describirAccion({ tabla: 'cliente', operacion: 'UPDATE' })).toBe('Editó un propietario');
  });
});

describe('detalle', () => {
  it('al crear muestra los datos que tienen valor', () => {
    expect(detalle(vehiculo).map(({ clave, valor }) => [clave, valor])).toEqual([
      ['placa', 'R48213'],
      ['tipo', 'Camión'],
      ['propietario', '1012'],
      ['color', 'Blanco'],
    ]);
    expect(detalle(vehiculo)[0].esPlaca).toBe(true);
  });

  it('al editar muestra qué fila es y solo lo que cambió', () => {
    expect(
      detalle(salida).map(({ clave, antes, despues, valor }) => [clave, antes, despues, valor]),
    ).toEqual([
      ['placa', undefined, undefined, 'KLM234'],
      ['salida', null, '2026-11-07 10:15:00', undefined],
      ['minutos_totales', null, 95, undefined],
      ['valor_total', null, 10000, undefined],
      ['estado', 'ACTIVO', 'PAGO', undefined],
    ]);
    expect(detalle(espacio).map(({ etiqueta }) => etiqueta)).toEqual(['Espacio', 'En servicio']);
  });
});

describe('formatearValor', () => {
  it('muestra cada dato como en el resto de la app', () => {
    // Mismo formato de pesos que el resto de la app (Intl usa un espacio que no se parte).
    expect(formatearValor('monto', 10000)).toBe(formatearPesos(10000));
    expect(formatearValor('habilitado', false)).toBe('No');
    expect(formatearValor('tipo', 'Camión')).toBe('Camión de carga pesada');
    expect(formatearValor('referencia', null)).toBe('—');
    expect(formatearValor('entrada', '2026-11-07 08:40:00')).toMatch(/^07\/11\/2026 8:40/);
  });
});
