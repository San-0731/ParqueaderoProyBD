import { renderHook } from '@testing-library/react';
import { useIntervalo } from './useIntervalo.js';

describe('useIntervalo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('llama a la función cada vez que se cumple el tiempo', () => {
    const funcion = vi.fn();
    renderHook(() => useIntervalo(funcion, 1_000));

    vi.advanceTimersByTime(999);
    expect(funcion).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(funcion).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2_000);
    expect(funcion).toHaveBeenCalledTimes(3);
  });

  it('se detiene al desmontar el componente', () => {
    const funcion = vi.fn();
    const { unmount } = renderHook(() => useIntervalo(funcion, 1_000));

    unmount();
    vi.advanceTimersByTime(5_000);

    expect(funcion).not.toHaveBeenCalled();
  });

  it('usa siempre la última función sin reiniciar el reloj', () => {
    const primera = vi.fn();
    const segunda = vi.fn();
    const { rerender } = renderHook(({ funcion }) => useIntervalo(funcion, 1_000), {
      initialProps: { funcion: primera },
    });

    vi.advanceTimersByTime(600);
    rerender({ funcion: segunda });
    vi.advanceTimersByTime(400);

    expect(primera).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledTimes(1);
  });

  it('con null queda en pausa', () => {
    const funcion = vi.fn();
    renderHook(() => useIntervalo(funcion, null));

    vi.advanceTimersByTime(60_000);

    expect(funcion).not.toHaveBeenCalled();
  });
});
