import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { get } from '../api/cliente.js';
import { guardarSesion, leerSesionGuardada } from '../api/sesionGuardada.js';
import ProveedorSesion, { AVISO_SESION_TERMINADA } from './ProveedorSesion.jsx';
import { useSesion } from './SesionContext.js';

// Aquí la API NO se simula por módulo: se usa el cliente real con fetch simulado, para probar
// también el camino 401 → alPerderSesion → sesión cerrada.

const URL_BASE = 'http://api.prueba/api';
const OPERADORA = { idUsuario: 3, nombreUsuario: 'ana', nombreCompleto: 'Ana', rol: 'OPERADOR' };

const respuestaJson = (cuerpo, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

let fetchSimulado;

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
  vi.stubEnv('VITE_API_URL', URL_BASE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.sessionStorage.clear();
});

/** Muestra el estado de la sesión y botones para usarla. */
function Espia() {
  const { estado, usuario, aviso, puede, iniciarSesion, cerrarSesion } = useSesion();
  return (
    <>
      <p data-testid="estado">{estado}</p>
      <p data-testid="rol">{usuario?.rol ?? 'ninguno'}</p>
      <p data-testid="aviso">{aviso ?? ''}</p>
      <p data-testid="admin">{puede('ADMINISTRADOR') ? 'sí' : 'no'}</p>
      <button type="button" onClick={() => iniciarSesion('ana', 'clave-123')}>
        Entrar
      </button>
      <button type="button" onClick={cerrarSesion}>
        Salir
      </button>
    </>
  );
}

function renderizar() {
  return render(
    <ProveedorSesion>
      <Espia />
    </ProveedorSesion>,
  );
}

const texto = (id) => screen.getByTestId(id).textContent;

describe('ProveedorSesion', () => {
  it('sin sesión guardada empieza sin sesión y no consulta al backend', () => {
    renderizar();

    expect(texto('estado')).toBe('sin-sesion');
    expect(texto('admin')).toBe('no');
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('con una sesión guardada la usa de inmediato y la confirma con /auth/yo (y su rol actual)', async () => {
    guardarSesion({ token: 'tok', usuario: OPERADORA });
    fetchSimulado.mockResolvedValue(respuestaJson({ ...OPERADORA, rol: 'ADMINISTRADOR' }));

    renderizar();

    expect(texto('estado')).toBe('con-sesion');
    expect(texto('rol')).toBe('OPERADOR');
    await waitFor(() => expect(texto('rol')).toBe('ADMINISTRADOR'));
    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toBe(`${URL_BASE}/auth/yo`);
    expect(opciones.headers.Authorization).toBe('Bearer tok');
    expect(leerSesionGuardada().usuario.rol).toBe('ADMINISTRADOR');
  });

  it('si el backend ya no reconoce la sesión guardada (401), la cierra con un aviso', async () => {
    guardarSesion({ token: 'vencido', usuario: OPERADORA });
    fetchSimulado.mockResolvedValue(
      respuestaJson({ error: 'NO_AUTENTICADO', mensaje: 'Tu sesión terminó.' }, 401),
    );

    renderizar();

    await waitFor(() => expect(texto('estado')).toBe('sin-sesion'));
    expect(texto('aviso')).toBe(AVISO_SESION_TERMINADA);
    expect(leerSesionGuardada()).toBeNull();
  });

  it('si el backend no responde, conserva la sesión guardada', async () => {
    guardarSesion({ token: 'tok', usuario: OPERADORA });
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    renderizar();

    await waitFor(() => expect(fetchSimulado).toHaveBeenCalled());
    expect(texto('estado')).toBe('con-sesion');
    expect(leerSesionGuardada()).not.toBeNull();
  });

  it('un 401 en cualquier otra petición también cierra la sesión', async () => {
    guardarSesion({ token: 'tok', usuario: OPERADORA });
    fetchSimulado.mockResolvedValueOnce(respuestaJson(OPERADORA));
    renderizar();
    await waitFor(() => expect(fetchSimulado).toHaveBeenCalledTimes(1));

    fetchSimulado.mockResolvedValueOnce(respuestaJson({ error: 'NO_AUTENTICADO' }, 401));
    await act(async () => {
      await get('/vehiculos').catch(() => {});
    });

    expect(texto('estado')).toBe('sin-sesion');
    expect(texto('aviso')).toBe(AVISO_SESION_TERMINADA);
  });

  it('iniciar sesión guarda el token y el usuario; cerrarla los borra', async () => {
    const usuario = userEvent.setup();
    renderizar();
    fetchSimulado.mockResolvedValueOnce(respuestaJson({ token: 'nuevo', usuario: OPERADORA }));

    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(texto('estado')).toBe('con-sesion'));
    expect(leerSesionGuardada()).toEqual({ token: 'nuevo', usuario: OPERADORA });
    const [urlLogin, opcionesLogin] = fetchSimulado.mock.calls[0];
    expect(urlLogin).toBe(`${URL_BASE}/auth/login`);
    expect(JSON.parse(opcionesLogin.body)).toEqual({ nombreUsuario: 'ana', clave: 'clave-123' });

    fetchSimulado.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await usuario.click(screen.getByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(texto('estado')).toBe('sin-sesion'));
    expect(texto('aviso')).toBe('');
    expect(leerSesionGuardada()).toBeNull();
    const [urlLogout, opcionesLogout] = fetchSimulado.mock.calls[1];
    expect(urlLogout).toBe(`${URL_BASE}/auth/logout`);
    expect(opcionesLogout.headers.Authorization).toBe('Bearer nuevo');
  });

  it('cerrar sesión funciona aunque el backend no responda', async () => {
    const usuario = userEvent.setup();
    guardarSesion({ token: 'tok', usuario: OPERADORA });
    fetchSimulado.mockReturnValueOnce(new Promise(() => {})); // /auth/yo queda pendiente
    renderizar();
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await usuario.click(screen.getByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(texto('estado')).toBe('sin-sesion'));
    expect(leerSesionGuardada()).toBeNull();
  });
});
