import { act, render, screen } from '@testing-library/react';
import { ErrorApi } from '../../api/cliente.js';
import { consultarSalud } from '../../api/salud.js';
import IndicadorServidor from './IndicadorServidor.jsx';

// La API de salud se simula: cada prueba decide qué responde el "servidor".
vi.mock('../../api/salud.js', () => ({ consultarSalud: vi.fn() }));

/** Deja que se resuelvan las promesas pendientes (la consulta simulada). */
async function esperarConsulta(milisegundos = 0) {
  await act(() => vi.advanceTimersByTimeAsync(milisegundos));
}

describe('IndicadorServidor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    consultarSalud.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('empieza comprobando y muestra "Conectado" si el servidor responde', async () => {
    consultarSalud.mockResolvedValue({ estado: 'OK', baseDatos: 'OK' });
    render(<IndicadorServidor />);

    expect(screen.getByRole('status')).toHaveTextContent('Servidor: Comprobando…');
    await esperarConsulta();

    expect(screen.getByRole('status')).toHaveTextContent('Servidor: Conectado');
  });

  it('muestra "Sin conexión" si el backend no responde', async () => {
    consultarSalud.mockRejectedValue(new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar.'));
    render(<IndicadorServidor />);
    await esperarConsulta();

    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión');
  });

  it('muestra "Sin base de datos" si el backend responde 503', async () => {
    consultarSalud.mockRejectedValue(new ErrorApi(503, 'ERROR_HTTP', 'Error (503).'));
    render(<IndicadorServidor />);
    await esperarConsulta();

    expect(screen.getByRole('status')).toHaveTextContent('Sin base de datos');
  });

  it('vuelve a comprobar cada 30 segundos', async () => {
    consultarSalud
      .mockResolvedValueOnce({ estado: 'OK', baseDatos: 'OK' })
      .mockRejectedValueOnce(new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar.'));
    render(<IndicadorServidor />);
    await esperarConsulta();
    expect(screen.getByRole('status')).toHaveTextContent('Conectado');

    await esperarConsulta(30_000);

    expect(consultarSalud).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión');
  });
});
