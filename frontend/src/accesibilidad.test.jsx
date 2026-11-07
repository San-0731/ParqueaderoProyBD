// Revisión automática de accesibilidad con axe-core (la herramienta de accesibilidad más usada):
// dibuja cada pantalla con la API simulada y comprueba que no haya violaciones (controles sin
// nombre, títulos fuera de orden, roles mal usados, etiquetas faltantes...).
//
// La regla de contraste de color se desactiva aquí porque jsdom (el navegador simulado de las
// pruebas) no calcula colores ni tamaños; el contraste se revisa en un navegador de verdad.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router';
import App from './App.jsx';
import {
  listarMarcas,
  listarMetodosPago,
  listarModelos,
  listarTiposVehiculo,
} from './api/catalogos.js';
import { listarClientes } from './api/clientes.js';
import { listarEspacios } from './api/espacios.js';
import {
  consultarLiquidacion,
  listarActivos,
  listarHistorial,
  obtenerRegistro,
  registrarSalida,
} from './api/registros.js';
import { consultarIngresos, consultarOcupacion } from './api/reportes.js';
import { consultarSalud } from './api/salud.js';
import { guardarSesion } from './api/sesionGuardada.js';
import { iniciarSesion } from './api/autenticacion.js';
import { ErrorApi } from './api/cliente.js';
import { listarVehiculos } from './api/vehiculos.js';
import ProveedorNotificaciones from './context/ProveedorNotificaciones.jsx';
import ProveedorSesion from './context/ProveedorSesion.jsx';
import { USUARIOS_DE_PRUEBA } from './test/usuariosDePrueba.js';
import { HISTORIAL } from './pages/historial/datosPrueba.js';
import { INGRESOS_NOVIEMBRE, OCUPACION } from './pages/reportes/datosPrueba.js';
import {
  ACTIVOS,
  LIQUIDACION_28,
  METODOS,
  REGISTRO_28,
  SALIDA_28_NEQUI,
} from './pages/salida/datosPrueba.js';
import { ESPACIOS } from './pages/tablero/datosPrueba.js';
import { CLIENTES, MARCAS, MODELOS, TIPOS, VEHICULOS } from './pages/vehiculos/datosPrueba.js';

vi.mock('./api/salud.js', () => ({ consultarSalud: vi.fn() }));
vi.mock('./api/espacios.js', () => ({
  listarEspacios: vi.fn(),
  cambiarHabilitadoEspacio: vi.fn(),
}));
vi.mock('./api/reportes.js', () => ({ consultarOcupacion: vi.fn(), consultarIngresos: vi.fn() }));
vi.mock('./api/registros.js', () => ({
  listarActivos: vi.fn(),
  registrarEntrada: vi.fn(),
  obtenerRegistro: vi.fn(),
  consultarLiquidacion: vi.fn(),
  registrarSalida: vi.fn(),
  listarHistorial: vi.fn(),
}));
vi.mock('./api/catalogos.js', () => ({
  listarTiposVehiculo: vi.fn(),
  listarMarcas: vi.fn(),
  listarModelos: vi.fn(),
  listarMetodosPago: vi.fn(),
}));
vi.mock('./api/vehiculos.js', () => ({
  listarVehiculos: vi.fn(),
  crearVehiculo: vi.fn(),
  actualizarVehiculo: vi.fn(),
}));
vi.mock('./api/autenticacion.js', () => ({
  iniciarSesion: vi.fn(),
  cerrarSesion: vi.fn(),
  consultarUsuarioActual: vi.fn(() => new Promise(() => {})),
}));
vi.mock('./api/clientes.js', () => ({
  listarClientes: vi.fn(),
  obtenerCliente: vi.fn(),
  crearCliente: vi.fn(),
  actualizarCliente: vi.fn(),
}));

/** Corre axe sobre toda la página y devuelve las violaciones como textos legibles. */
async function violaciones() {
  const resultado = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return resultado.violations.map(
    (violacion) =>
      `${violacion.id}: ${violacion.help} → ${violacion.nodes.map((nodo) => nodo.target.join(' ')).join(' | ')}`,
  );
}

/** Dibuja la app en la ruta, con la sesión de un rol (null: sin sesión). */
function renderizarEn(ruta, rol = 'DBA') {
  window.sessionStorage.clear();
  if (rol) {
    guardarSesion({ token: 'token-de-prueba', usuario: USUARIOS_DE_PRUEBA[rol] });
  }
  const usuario = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorSesion>
        <ProveedorNotificaciones>
          <App />
        </ProveedorNotificaciones>
      </ProveedorSesion>
    </MemoryRouter>,
  );
  return usuario;
}

describe('accesibilidad (axe-core)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consultarSalud.mockResolvedValue({ estado: 'OK', baseDatos: 'OK' });
    listarEspacios.mockResolvedValue(ESPACIOS);
    consultarOcupacion.mockResolvedValue(OCUPACION);
    consultarIngresos.mockResolvedValue(INGRESOS_NOVIEMBRE);
    listarActivos.mockResolvedValue(ACTIVOS);
    obtenerRegistro.mockResolvedValue(REGISTRO_28);
    consultarLiquidacion.mockResolvedValue(LIQUIDACION_28);
    registrarSalida.mockResolvedValue(SALIDA_28_NEQUI);
    listarHistorial.mockResolvedValue(HISTORIAL);
    listarTiposVehiculo.mockResolvedValue(TIPOS);
    listarMarcas.mockResolvedValue(MARCAS);
    listarModelos.mockResolvedValue(MODELOS);
    listarMetodosPago.mockResolvedValue(METODOS);
    listarVehiculos.mockResolvedValue(VEHICULOS);
    listarClientes.mockResolvedValue(CLIENTES);
  });

  it('tablero', async () => {
    renderizarEn('/');
    await screen.findByRole('region', { name: 'Cupos libres' });
    expect(await violaciones()).toEqual([]);
  });

  it('entrada, con el registro rápido de un vehículo nuevo', async () => {
    listarVehiculos.mockResolvedValue([]);
    const usuario = renderizarEn('/entrada');
    await usuario.type(await screen.findByRole('textbox', { name: 'Placa o código' }), 'KLM999');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    await screen.findByText(/no está registrado/);
    expect(await violaciones()).toEqual([]);
  });

  it('salida (vehículos dentro)', async () => {
    renderizarEn('/salida');
    await screen.findByRole('list', { name: 'Vehículos dentro' });
    expect(await violaciones()).toEqual([]);
  });

  it('cobro con el modal de confirmación y el recibo', async () => {
    const usuario = renderizarEn('/salida/28');
    await usuario.click(await screen.findByRole('radio', { name: 'Nequi' }));
    await usuario.type(screen.getByRole('textbox', { name: 'Número de referencia' }), 'NEQ-1');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar pago y salida' }));
    const modal = await screen.findByRole('dialog');
    expect(await violaciones()).toEqual([]);

    await usuario.click(within(modal).getByRole('button', { name: 'Confirmar pago y salida' }));
    await screen.findByRole('heading', { name: 'Recibo de salida' });
    expect(await violaciones()).toEqual([]);
  });

  it('vehículos con ficha y el modal de edición', async () => {
    const usuario = renderizarEn('/vehiculos?id=40');
    await screen.findByRole('list', { name: 'Vehículos' });
    expect(await violaciones()).toEqual([]);

    await usuario.click(screen.getByRole('button', { name: 'Editar vehículo' }));
    await screen.findByRole('dialog', { name: 'Editar vehículo' });
    expect(await violaciones()).toEqual([]);
  });

  it('historial', async () => {
    renderizarEn('/historial?todo=1');
    await screen.findByRole('table', { name: 'Historial de parqueos' });
    expect(await violaciones()).toEqual([]);
  });

  it('reportes', async () => {
    renderizarEn('/reportes');
    await screen.findByText('Total recaudado');
    await screen.findAllByText(/libres/);
    expect(await violaciones()).toEqual([]);
  });

  it('espacios con el modal de confirmación', async () => {
    const usuario = renderizarEn('/espacios');
    await screen.findByRole('table', { name: 'Espacios del piso 1' });
    expect(await violaciones()).toEqual([]);

    await usuario.click(screen.getAllByRole('switch')[0]);
    await screen.findByRole('dialog');
    expect(await violaciones()).toEqual([]);
  });

  it('inicio de sesión, con el error de usuario o contraseña', async () => {
    iniciarSesion.mockRejectedValue(
      new ErrorApi(401, 'NO_AUTENTICADO', 'Usuario o contraseña incorrectos.'),
    );
    const usuario = renderizarEn('/', null);
    await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' });
    expect(await violaciones()).toEqual([]);

    // Los avisos de los campos vacíos.
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await violaciones()).toEqual([]);

    await usuario.type(screen.getByLabelText('Usuario'), 'dba');
    await usuario.type(screen.getByLabelText('Contraseña'), 'equivocada');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByRole('alert');
    expect(await violaciones()).toEqual([]);
  });

  it('sin permiso (operador en reportes)', async () => {
    renderizarEn('/reportes', 'OPERADOR');
    await screen.findByRole('heading', { level: 1, name: 'Sin permiso' });
    expect(await violaciones()).toEqual([]);
  });

  it('espacios en solo lectura (operador)', async () => {
    renderizarEn('/espacios', 'OPERADOR');
    await screen.findByRole('table', { name: 'Espacios del piso 1' });
    expect(await violaciones()).toEqual([]);
  });

  it('página no encontrada', async () => {
    renderizarEn('/no-existe');
    await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' });
    expect(await violaciones()).toEqual([]);
  });
});
