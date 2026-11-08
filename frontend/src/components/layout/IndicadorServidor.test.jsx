import { act, render, screen } from '@testing-library/react';
import { ErrorApi } from '../../api/cliente.js';
import { consultarSalud } from '../../api/salud.js';
import IndicadorServidor from './IndicadorServidor.jsx';

// La API de salud se simula: cada prueba decide qué responde el "servidor".
vi.mock('../../api/salud.js', () => ({ consultarSalud: vi.fn() }));

const CONECTANDO = 'Servidor: Conectando con el servidor… puede tardar hasta un minuto';
const SALUD_OK = { estado: 'OK', baseDatos: 'OK' };
const sinRespuesta = () => new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar.');

/** Avanza el reloj simulado y deja que se resuelvan las consultas pendientes. */
async function esperar(milisegundos = 0) {
  await act(() => vi.advanceTimersByTimeAsync(milisegundos));
}

const indicador = () => screen.getByRole('status');

describe('IndicadorServidor', () => {
  beforeEach(() => {
    // Los temporizadores falsos también controlan Date.now(): así se simulan los 90 s.
    vi.useFakeTimers();
    consultarSalud.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('empieza en "Conectando…" (ámbar) y muestra "Conectado" si el servidor responde', async () => {
    consultarSalud.mockResolvedValue(SALUD_OK);
    render(<IndicadorServidor />);

    expect(indicador()).toHaveTextContent(CONECTANDO);
    expect(indicador()).toHaveClass('bg-espera-claro', 'text-espera');
    await esperar();

    expect(indicador()).toHaveTextContent('Servidor: Conectado');
  });

  it('mientras el servidor despierta sigue en "Conectando…" y reintenta cada 5 s', async () => {
    consultarSalud.mockRejectedValue(sinRespuesta());
    render(<IndicadorServidor />);
    await esperar();

    expect(indicador()).toHaveTextContent(CONECTANDO);
    expect(consultarSalud).toHaveBeenCalledTimes(1);

    await esperar(5_000);
    expect(consultarSalud).toHaveBeenCalledTimes(2);

    // A los 60 s todavía no es un error: el arranque en frío tarda cerca de un minuto.
    await esperar(55_000);
    expect(indicador()).toHaveTextContent(CONECTANDO);
    expect(indicador()).not.toHaveTextContent('Sin conexión');
  });

  it('si el servidor despierta durante la espera, pasa a "Conectado"', async () => {
    consultarSalud
      .mockRejectedValueOnce(sinRespuesta())
      .mockRejectedValueOnce(sinRespuesta())
      .mockResolvedValue(SALUD_OK);
    render(<IndicadorServidor />);
    await esperar();
    await esperar(5_000);
    expect(indicador()).toHaveTextContent(CONECTANDO);

    await esperar(5_000);

    expect(consultarSalud).toHaveBeenCalledTimes(3);
    expect(indicador()).toHaveTextContent('Conectado');
  });

  it('pasados 90 s sin respuesta muestra "Sin conexión" y comprueba cada 30 s', async () => {
    consultarSalud.mockRejectedValue(sinRespuesta());
    render(<IndicadorServidor />);
    await esperar();

    await esperar(95_000);
    expect(indicador()).toHaveTextContent('Servidor: Sin conexión');
    expect(indicador()).toHaveClass('bg-ocupado-claro');

    // Se dio por caído en la consulta de los 90 s. Ya no reintenta cada 5 s: la siguiente
    // es 30 s después, a los 120 s.
    const llamadas = consultarSalud.mock.calls.length;
    await esperar(5_000); // 100 s
    expect(consultarSalud).toHaveBeenCalledTimes(llamadas);
    await esperar(20_000); // 120 s
    expect(consultarSalud).toHaveBeenCalledTimes(llamadas + 1);
    expect(indicador()).toHaveTextContent('Sin conexión');
  });

  it('muestra "Sin base de datos" si el backend responde 503', async () => {
    consultarSalud.mockRejectedValue(new ErrorApi(503, 'ERROR_HTTP', 'Error (503).'));
    render(<IndicadorServidor />);
    await esperar();

    expect(indicador()).toHaveTextContent('Sin base de datos');
  });

  it('estando conectado vuelve a comprobar cada 30 segundos', async () => {
    consultarSalud.mockResolvedValue(SALUD_OK);
    render(<IndicadorServidor />);
    await esperar();

    await esperar(29_000);
    expect(consultarSalud).toHaveBeenCalledTimes(1);
    await esperar(1_000);

    expect(consultarSalud).toHaveBeenCalledTimes(2);
    expect(indicador()).toHaveTextContent('Conectado');
  });

  it('si se cae estando conectado, espera en "Conectando…" antes de dar "Sin conexión"', async () => {
    consultarSalud.mockResolvedValueOnce(SALUD_OK).mockRejectedValue(sinRespuesta());
    render(<IndicadorServidor />);
    await esperar();
    expect(indicador()).toHaveTextContent('Conectado');

    await esperar(30_000);
    expect(indicador()).toHaveTextContent(CONECTANDO);

    await esperar(95_000);
    expect(indicador()).toHaveTextContent('Sin conexión');
  });

  it('al salir de la pantalla deja de consultar', async () => {
    consultarSalud.mockResolvedValue(SALUD_OK);
    const { unmount } = render(<IndicadorServidor />);
    await esperar();
    unmount();

    await esperar(120_000);

    expect(consultarSalud).toHaveBeenCalledTimes(1);
  });
});
