import { ErrorApi, alPerderSesion, get, patch, post, put } from './cliente.js';
import { guardarSesion } from './sesionGuardada.js';

const URL_BASE = 'http://api.prueba/api';

/** Respuesta de fetch con un cuerpo JSON, como las que envía el backend. */
function respuestaJson(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Devuelve el error con el que falla la promesa (o falla la prueba si no falla). */
async function capturarError(promesa) {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba que la petición fallara');
}

let fetchSimulado;

beforeEach(() => {
  // fetch y VITE_API_URL simulados: las pruebas no necesitan el backend encendido.
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
  vi.stubEnv('VITE_API_URL', URL_BASE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe('respuestas correctas', () => {
  it('devuelve el JSON de una respuesta 200; el GET va sin cuerpo ni Content-Type', async () => {
    fetchSimulado.mockResolvedValue(respuestaJson([{ idEspacio: 1, disponible: true }]));

    await expect(get('/espacios')).resolves.toEqual([{ idEspacio: 1, disponible: true }]);

    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${URL_BASE}/espacios`);
    expect(opciones.method).toBe('GET');
    expect(opciones.headers).not.toHaveProperty('Content-Type');
    expect(opciones.body).toBeUndefined();
  });

  it('arma el query string sin los parámetros vacíos, pero conserva false y 0', async () => {
    // Una respuesta nueva por llamada: el cuerpo de un Response solo se puede leer una vez.
    fetchSimulado.mockImplementation(async () => respuestaJson([]));

    await get('/registros', {
      desde: '2026-10-01',
      hasta: '',
      identificador: null,
      idMetodoPago: undefined,
    });
    await get('/espacios', { disponible: false, cantidad: 0 });

    expect(fetchSimulado.mock.calls[0][0]).toBe(`${URL_BASE}/registros?desde=2026-10-01`);
    expect(fetchSimulado.mock.calls[1][0]).toBe(`${URL_BASE}/espacios?disponible=false&cantidad=0`);
  });

  it('quita la barra final de VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', `${URL_BASE}/`);
    fetchSimulado.mockResolvedValue(respuestaJson({ estado: 'OK' }));

    await get('/salud');

    expect(fetchSimulado.mock.calls[0][0]).toBe(`${URL_BASE}/salud`);
  });

  it('el POST envía el cuerpo como JSON con su Content-Type', async () => {
    fetchSimulado.mockResolvedValue(respuestaJson({ idRegistro: 32, estado: 'ACTIVO' }, 201));

    const datos = await post('/registros/entrada', { identificador: 'KLM234', idEspacio: 3 });

    expect(datos).toEqual({ idRegistro: 32, estado: 'ACTIVO' });
    const [, opciones] = fetchSimulado.mock.calls[0];
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opciones.body)).toEqual({ identificador: 'KLM234', idEspacio: 3 });
  });

  it.each([
    ['PUT', put],
    ['PATCH', patch],
  ])('%s usa su método HTTP', async (metodo, funcion) => {
    fetchSimulado.mockResolvedValue(respuestaJson({}));

    await funcion('/espacios/1/habilitado', { habilitado: false });

    expect(fetchSimulado.mock.calls[0][1].method).toBe(metodo);
  });

  it('devuelve null cuando la respuesta no tiene cuerpo (204)', async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(get('/algo')).resolves.toBeNull();
  });
});

describe('errores', () => {
  it('un 409 se convierte en ErrorApi con el código y el mensaje del backend', async () => {
    const mensaje = 'El espacio ya está ocupado por otro vehículo.';
    fetchSimulado.mockResolvedValue(respuestaJson({ error: 'REGLA_NEGOCIO', mensaje }, 409));

    const error = await capturarError(
      post('/registros/entrada', { identificador: 'BCD567', idEspacio: 2 }),
    );

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 409, codigo: 'REGLA_NEGOCIO', mensaje });
    expect(error.message).toBe(mensaje);
  });

  it('un error sin JSON (por ejemplo, un 502 en HTML) usa un mensaje genérico', async () => {
    fetchSimulado.mockResolvedValue(new Response('<h1>Bad Gateway</h1>', { status: 502 }));

    const error = await capturarError(get('/espacios'));

    expect(error).toMatchObject({
      estado: 502,
      codigo: 'ERROR_HTTP',
      mensaje: 'El servidor respondió con un error (502).',
    });
  });

  it('el 503 de /salud (base de datos caída) conserva el estado HTTP', async () => {
    fetchSimulado.mockResolvedValue(respuestaJson({ estado: 'OK', baseDatos: 'ERROR' }, 503));

    const error = await capturarError(get('/salud'));

    expect(error).toMatchObject({ estado: 503, codigo: 'ERROR_HTTP' });
  });

  it('si el servidor no responde (backend apagado), lanza SIN_CONEXION', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await capturarError(get('/espacios'));

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 0, codigo: 'SIN_CONEXION' });
    expect(error.mensaje).toMatch(/No se pudo conectar con el servidor/);
  });

  it('cancela la petición después de 15 s y lanza TIEMPO_AGOTADO', async () => {
    vi.useFakeTimers();
    // fetch que nunca responde: solo termina cuando se cancela con el AbortController.
    fetchSimulado.mockImplementation(
      (url, { signal }) =>
        new Promise((resolver, rechazar) => {
          signal.addEventListener('abort', () =>
            rechazar(new DOMException('Cancelada', 'AbortError')),
          );
        }),
    );

    const resultado = capturarError(get('/espacios'));
    await vi.advanceTimersByTimeAsync(15_000);
    const error = await resultado;

    expect(error).toMatchObject({ estado: 0, codigo: 'TIEMPO_AGOTADO' });
  });

  it('si falta VITE_API_URL, lanza SIN_CONFIGURACION sin llamar a fetch', async () => {
    vi.stubEnv('VITE_API_URL', '');

    const error = await capturarError(get('/espacios'));

    expect(error).toMatchObject({ codigo: 'SIN_CONFIGURACION' });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});

describe('sesión', () => {
  it('sin sesión guardada no envía Authorization', async () => {
    fetchSimulado.mockResolvedValue(respuestaJson([]));

    await get('/espacios');

    expect(fetchSimulado.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('con sesión guardada envía el token en Authorization: Bearer', async () => {
    guardarSesion({ token: 'abc123', usuario: { rol: 'OPERADOR' } });
    fetchSimulado.mockResolvedValue(respuestaJson([]));

    await get('/espacios');

    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
  });

  it('un 401 a una petición con token avisa que se perdió la sesión', async () => {
    guardarSesion({ token: 'vencido', usuario: { rol: 'OPERADOR' } });
    const oyente = vi.fn();
    const dejarDeEscuchar = alPerderSesion(oyente);
    fetchSimulado.mockImplementation(async () =>
      respuestaJson({ error: 'NO_AUTENTICADO', mensaje: 'Tu sesión terminó.' }, 401),
    );

    const error = await capturarError(get('/vehiculos'));

    expect(error).toMatchObject({ estado: 401, codigo: 'NO_AUTENTICADO' });
    expect(oyente).toHaveBeenCalledTimes(1);

    dejarDeEscuchar();
    await capturarError(get('/vehiculos'));
    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it('un 401 sin token (por ejemplo, contraseña incorrecta en el login) no es una sesión perdida', async () => {
    const oyente = vi.fn();
    const dejarDeEscuchar = alPerderSesion(oyente);
    fetchSimulado.mockResolvedValue(
      respuestaJson({ error: 'NO_AUTENTICADO', mensaje: 'Usuario o contraseña incorrectos.' }, 401),
    );

    const error = await capturarError(post('/auth/login', { nombreUsuario: 'x', clave: 'y' }));

    expect(error.mensaje).toBe('Usuario o contraseña incorrectos.');
    expect(oyente).not.toHaveBeenCalled();
    dejarDeEscuchar();
  });

  it('un 403 no cierra la sesión', async () => {
    guardarSesion({ token: 'tok', usuario: { rol: 'OPERADOR' } });
    const oyente = vi.fn();
    const dejarDeEscuchar = alPerderSesion(oyente);
    fetchSimulado.mockResolvedValue(
      respuestaJson(
        { error: 'SIN_PERMISO', mensaje: 'Solo un usuario Administrador o DBA puede hacer esto.' },
        403,
      ),
    );

    const error = await capturarError(get('/reportes/ingresos'));

    expect(error).toMatchObject({ estado: 403, codigo: 'SIN_PERMISO' });
    expect(oyente).not.toHaveBeenCalled();
    dejarDeEscuchar();
  });
});
