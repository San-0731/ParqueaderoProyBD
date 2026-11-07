import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App.jsx';
import ProveedorNotificaciones from './context/ProveedorNotificaciones.jsx';

// Ninguna pantalla debe llamar al backend real: las consultas quedan pendientes para siempre
// (el indicador del servidor y cada pantalla se quedan en "cargando").
// vi.hoisted: vi.mock se mueve al inicio del archivo, así que la función también debe ir ahí.
const { pendiente } = vi.hoisted(() => ({ pendiente: () => vi.fn(() => new Promise(() => {})) }));
vi.mock('./api/salud.js', () => ({ consultarSalud: pendiente() }));
vi.mock('./api/espacios.js', () => ({ listarEspacios: pendiente() }));
vi.mock('./api/reportes.js', () => ({ consultarOcupacion: pendiente() }));
vi.mock('./api/registros.js', () => ({
  listarActivos: pendiente(),
  registrarEntrada: pendiente(),
  obtenerRegistro: pendiente(),
  consultarLiquidacion: pendiente(),
  registrarSalida: pendiente(),
}));
vi.mock('./api/catalogos.js', () => ({
  listarTiposVehiculo: pendiente(),
  listarMarcas: pendiente(),
  listarModelos: pendiente(),
  listarMetodosPago: pendiente(),
}));
vi.mock('./api/vehiculos.js', () => ({ listarVehiculos: pendiente(), crearVehiculo: pendiente() }));
vi.mock('./api/clientes.js', () => ({
  obtenerCliente: pendiente(),
  listarClientes: pendiente(),
  crearCliente: pendiente(),
}));

/** Dibuja la app completa empezando en la ruta indicada (MemoryRouter simula la URL). */
function renderizarEn(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorNotificaciones>
        <App />
      </ProveedorNotificaciones>
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

  it('el enlace "Saltar al contenido" apunta al contenido principal', () => {
    renderizarEn('/');

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });
});
