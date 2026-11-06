import { act, renderHook, waitFor } from '@testing-library/react';
import { ErrorApi } from '../api/cliente.js';
import { useConsulta } from './useConsulta.js';

describe('useConsulta', () => {
  it('empieza cargando y luego entrega los datos', async () => {
    const consulta = vi.fn().mockResolvedValue([{ idTipo: 1, nombre: 'Moto' }]);

    const { result } = renderHook(() => useConsulta(consulta));

    expect(result.current).toMatchObject({ cargando: true, datos: null, error: null });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.datos).toEqual([{ idTipo: 1, nombre: 'Moto' }]);
    expect(result.current.error).toBeNull();
    expect(consulta).toHaveBeenCalledTimes(1);
  });

  it('empieza cargando y luego entrega el error', async () => {
    const error = new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.');
    const consulta = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useConsulta(consulta));

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe(error);
    expect(result.current.datos).toBeNull();
  });

  it('recargar vuelve a consultar y conserva los datos mientras carga', async () => {
    // La segunda respuesta queda pendiente hasta que la prueba la resuelva.
    const segunda = Promise.withResolvers();
    const consulta = vi.fn().mockResolvedValueOnce('primera').mockReturnValueOnce(segunda.promise);

    const { result } = renderHook(() => useConsulta(consulta));
    await waitFor(() => expect(result.current.datos).toBe('primera'));

    act(() => result.current.recargar());

    expect(result.current).toMatchObject({ cargando: true, datos: 'primera' });
    await waitFor(() => expect(consulta).toHaveBeenCalledTimes(2));

    await act(async () => segunda.resolve('segunda'));

    expect(result.current).toMatchObject({ cargando: false, datos: 'segunda' });
  });

  it('si cambia la consulta, ignora la respuesta tardía de la anterior', async () => {
    const vieja = Promise.withResolvers();
    const nueva = Promise.withResolvers();
    const consultaVieja = () => vieja.promise;
    const consultaNueva = () => nueva.promise;

    const { result, rerender } = renderHook(({ consulta }) => useConsulta(consulta), {
      initialProps: { consulta: consultaVieja },
    });
    // Cambia el filtro antes de que llegue la primera respuesta.
    rerender({ consulta: consultaNueva });

    await act(async () => nueva.resolve('nueva'));
    await act(async () => vieja.resolve('vieja'));

    expect(result.current).toMatchObject({ cargando: false, datos: 'nueva' });
  });
});
