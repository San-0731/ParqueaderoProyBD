import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App.jsx';
import { cerrarSesion, iniciarSesion } from './api/autenticacion.js';
import { ErrorApi } from './api/cliente.js';
import { guardarSesion, leerSesionGuardada } from './api/sesionGuardada.js';
import ProveedorNotificaciones from './context/ProveedorNotificaciones.jsx';
import ProveedorSesion from './context/ProveedorSesion.jsx';
import { USUARIOS_DE_PRUEBA } from './test/usuariosDePrueba.js';

// Ninguna pantalla debe llamar al backend real: las consultas quedan pendientes para siempre
// (el indicador del servidor y cada pantalla se quedan en "cargando").
// vi.hoisted: vi.mock se mueve al inicio del archivo, así que la función también debe ir ahí.
const { pendiente } = vi.hoisted(() => ({ pendiente: () => vi.fn(() => new Promise(() => {})) }));
vi.mock('./api/salud.js', () => ({ consultarSalud: pendiente() }));
vi.mock('./api/espacios.js', () => ({
  listarEspacios: pendiente(),
  cambiarHabilitadoEspacio: pendiente(),
}));
vi.mock('./api/reportes.js', () => ({
  consultarOcupacion: pendiente(),
  consultarIngresos: pendiente(),
}));
vi.mock('./api/registros.js', () => ({
  listarActivos: pendiente(),
  registrarEntrada: pendiente(),
  obtenerRegistro: pendiente(),
  consultarLiquidacion: pendiente(),
  registrarSalida: pendiente(),
  listarHistorial: pendiente(),
}));
vi.mock('./api/catalogos.js', () => ({
  listarTiposVehiculo: pendiente(),
  listarMarcas: pendiente(),
  listarModelos: pendiente(),
  listarMetodosPago: pendiente(),
}));
vi.mock('./api/vehiculos.js', () => ({
  listarVehiculos: pendiente(),
  crearVehiculo: pendiente(),
  actualizarVehiculo: pendiente(),
}));
vi.mock('./api/clientes.js', () => ({
  obtenerCliente: pendiente(),
  listarClientes: pendiente(),
  crearCliente: pendiente(),
  actualizarCliente: pendiente(),
}));
vi.mock('./api/usuarios.js', () => ({
  listarUsuarios: pendiente(),
  crearUsuario: pendiente(),
  actualizarUsuario: pendiente(),
  cambiarClaveUsuario: pendiente(),
}));
vi.mock('./api/autenticacion.js', () => ({
  iniciarSesion: vi.fn(),
  cerrarSesion: vi.fn(),
  // Confirmar la sesión guardada queda pendiente: se usa la guardada.
  consultarUsuarioActual: pendiente(),
}));

afterEach(() => {
  window.sessionStorage.clear();
});

/**
 * Dibuja la app completa empezando en la ruta indicada (MemoryRouter simula la URL). Con un
 * rol, la pestaña ya tiene una sesión guardada de ese rol; con null, no hay sesión.
 */
function renderizarEn(ruta, rol = 'DBA') {
  if (rol) {
    guardarSesion({ token: 'token-de-prueba', usuario: USUARIOS_DE_PRUEBA[rol] });
  }
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorSesion>
        <ProveedorNotificaciones>
          <App />
        </ProveedorNotificaciones>
      </ProveedorSesion>
    </MemoryRouter>,
  );
}

const titulo = (nombre) => screen.getByRole('heading', { level: 1, name: nombre });

describe('navegación', () => {
  it('la raíz muestra el tablero de espacios', () => {
    renderizarEn('/');

    expect(titulo('Tablero de espacios')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tablero' })).toHaveAttribute('aria-current', 'page');
  });

  it('al hacer clic en un enlace del menú se muestra su pantalla', async () => {
    const usuario = userEvent.setup();
    renderizarEn('/');

    await usuario.click(screen.getByRole('link', { name: 'Historial' }));

    expect(titulo('Historial de parqueos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Tablero' })).not.toHaveAttribute('aria-current');
    expect(document.title).toBe('Historial de parqueos | Parqueadero');
  });

  it('el cobro recibe el número de registro y deja activo "Salida"', () => {
    renderizarEn('/salida/28');

    expect(titulo('Cobrar salida')).toBeInTheDocument();
    expect(screen.getByText(/^Parqueo N\.º 28:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Salida' })).toHaveAttribute('aria-current', 'page');
  });

  it('una ruta que no existe muestra la página 404 con enlace al tablero', async () => {
    const usuario = userEvent.setup();
    renderizarEn('/no-existe');

    expect(titulo('Página no encontrada')).toBeInTheDocument();
    await usuario.click(screen.getByRole('link', { name: 'Ir al tablero' }));
    expect(titulo('Tablero de espacios')).toBeInTheDocument();
  });

  it('el botón "Menú" abre el menú y se cierra al navegar', async () => {
    const usuario = userEvent.setup();
    renderizarEn('/');
    const botonMenu = screen.getByRole('button', { name: 'Menú' });
    expect(botonMenu).toHaveAttribute('aria-expanded', 'false');

    await usuario.click(botonMenu);
    expect(botonMenu).toHaveAttribute('aria-expanded', 'true');

    await usuario.click(screen.getByRole('link', { name: 'Entrada' }));
    expect(titulo('Registrar entrada')).toBeInTheDocument();
    expect(botonMenu).toHaveAttribute('aria-expanded', 'false');
  });

  // Cada pantalla pone su título en la pestaña del navegador (EncabezadoPagina usa <title>).
  it.each([
    ['/', 'Tablero de espacios'],
    ['/entrada', 'Registrar entrada'],
    ['/salida', 'Vehículos dentro'],
    ['/salida/28', 'Cobrar salida'],
    ['/vehiculos', 'Vehículos y propietarios'],
    ['/historial', 'Historial de parqueos'],
    ['/reportes', 'Reportes'],
    ['/espacios', 'Administración de espacios'],
    ['/sistema/usuarios', 'Sistema'],
    ['/no-existe', 'Página no encontrada'],
  ])('%s pone el título de la pestaña "%s | Parqueadero"', (ruta, nombre) => {
    renderizarEn(ruta);

    expect(titulo(nombre)).toBeInTheDocument();
    expect(document.title).toBe(`${nombre} | Parqueadero`);
  });

  it('el enlace "Saltar al contenido" apunta al contenido principal', () => {
    renderizarEn('/');

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });
});

describe('sesión y roles', () => {
  const enlaceMenu = (nombre) => screen.queryByRole('link', { name: nombre });

  it('sin sesión, cualquier pantalla lleva al inicio de sesión y después vuelve a ella', async () => {
    const usuario = userEvent.setup();
    iniciarSesion.mockResolvedValue({ token: 'nuevo', usuario: USUARIOS_DE_PRUEBA.DBA });
    renderizarEn('/historial', null);

    expect(titulo('Iniciar sesión')).toBeInTheDocument();
    expect(document.title).toBe('Iniciar sesión | Parqueadero');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Usuario'), '  dba ');
    await usuario.type(screen.getByLabelText('Contraseña'), 'clave-secreta');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Historial de parqueos' }),
    ).toBeInTheDocument();
    expect(iniciarSesion).toHaveBeenCalledWith('dba', 'clave-secreta');
    expect(leerSesionGuardada()).toEqual({ token: 'nuevo', usuario: USUARIOS_DE_PRUEBA.DBA });
  });

  it('con usuario o contraseña incorrectos muestra el mensaje del backend', async () => {
    const usuario = userEvent.setup();
    iniciarSesion.mockRejectedValue(
      new ErrorApi(401, 'NO_AUTENTICADO', 'Usuario o contraseña incorrectos.'),
    );
    renderizarEn('/', null);

    await usuario.type(screen.getByLabelText('Usuario'), 'dba');
    await usuario.type(screen.getByLabelText('Contraseña'), 'equivocada');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.');
    expect(titulo('Iniciar sesión')).toBeInTheDocument();
    expect(leerSesionGuardada()).toBeNull();
  });

  it('sin usuario ni contraseña avisa en cada campo y no llama al backend', async () => {
    const usuario = userEvent.setup();
    renderizarEn('/', null);

    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.getByLabelText('Usuario')).toHaveAccessibleDescription('Escribe tu usuario.');
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      'Escribe tu contraseña.',
    );
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  it('con la sesión abierta, /login lleva al tablero', () => {
    renderizarEn('/login');

    expect(titulo('Tablero de espacios')).toBeInTheDocument();
  });

  it('la barra muestra quién inició sesión y "Cerrar sesión" vuelve al inicio', async () => {
    const usuario = userEvent.setup();
    cerrarSesion.mockResolvedValue(null);
    renderizarEn('/', 'ADMINISTRADOR');

    expect(screen.getByText('Beto Administrador')).toBeInTheDocument();
    expect(screen.getByText('Administrador · beto')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' }),
    ).toBeInTheDocument();
    expect(cerrarSesion).toHaveBeenCalled();
    expect(leerSesionGuardada()).toBeNull();
  });

  it('al operador no le aparece Reportes en el menú, pero sí lo demás', () => {
    renderizarEn('/', 'OPERADOR');

    for (const nombre of ['Tablero', 'Entrada', 'Salida', 'Vehículos', 'Historial', 'Espacios']) {
      expect(enlaceMenu(nombre)).toBeInTheDocument();
    }
    expect(enlaceMenu('Reportes')).not.toBeInTheDocument();
  });

  it.each(['ADMINISTRADOR', 'DBA'])('al %s sí le aparece Reportes', (rol) => {
    renderizarEn('/', rol);

    expect(enlaceMenu('Reportes')).toHaveAttribute('href', '/reportes');
  });

  it('solo el DBA ve la pestaña Sistema en el menú', () => {
    renderizarEn('/', 'DBA');
    expect(enlaceMenu('Sistema')).toHaveAttribute('href', '/sistema');
  });

  it.each(['OPERADOR', 'ADMINISTRADOR'])('al %s no le aparece Sistema', (rol) => {
    renderizarEn('/', rol);
    expect(enlaceMenu('Sistema')).not.toBeInTheDocument();
  });

  it('/sistema lleva a la sección Usuarios', () => {
    renderizarEn('/sistema', 'DBA');

    expect(titulo('Sistema')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page');
  });

  it('si un administrador escribe /sistema, ve que es solo para el DBA', () => {
    renderizarEn('/sistema/usuarios', 'ADMINISTRADOR');

    expect(titulo('Sin permiso')).toBeInTheDocument();
    expect(screen.getByText('Solo el DBA puede administrar el sistema.')).toBeInTheDocument();
  });

  it('si el operador escribe /reportes, ve que es solo para administradores', async () => {
    const usuario = userEvent.setup();
    renderizarEn('/reportes', 'OPERADOR');

    expect(titulo('Sin permiso')).toBeInTheDocument();
    expect(document.title).toBe('Sin permiso | Parqueadero');
    expect(
      screen.getByText('Solo los administradores pueden ver los reportes.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('link', { name: 'Ir al tablero' }));
    expect(titulo('Tablero de espacios')).toBeInTheDocument();
  });
});
