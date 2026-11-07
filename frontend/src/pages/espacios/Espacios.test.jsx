import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { listarTiposVehiculo } from '../../api/catalogos.js';
import { ErrorApi } from '../../api/cliente.js';
import { cambiarHabilitadoEspacio, listarEspacios } from '../../api/espacios.js';
import { listarActivos } from '../../api/registros.js';
import ProveedorNotificaciones from '../../context/ProveedorNotificaciones.jsx';
import Espacios from './Espacios.jsx';
import { agruparPorPiso, armarFilas, resumirEspacios } from './datosEspacios.js';

vi.mock('../../api/espacios.js', () => ({
  listarEspacios: vi.fn(),
  cambiarHabilitadoEspacio: vi.fn(),
}));
vi.mock('../../api/catalogos.js', () => ({ listarTiposVehiculo: vi.fn() }));
vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn() }));

const espacio = (idEspacio, idTipo, piso, zona, numero, habilitado, ocupado) => ({
  idEspacio,
  idTipo,
  piso,
  zona,
  numero,
  habilitado,
  ocupado,
  disponible: habilitado && !ocupado,
});

const ESPACIOS = [
  espacio(1, 3, '1', 'A', '01', true, false), // libre
  espacio(2, 3, '1', 'A', '02', true, true), // ocupado por MVC054
  espacio(16, 3, '2', 'B', '04', false, false), // deshabilitado
  espacio(18, 4, '2', 'C', '01', true, false), // camión, libre
];
const TIPOS = [
  { idTipo: 3, nombre: 'Carro' },
  { idTipo: 4, nombre: 'Camión' },
];
const ACTIVOS = [{ idRegistro: 28, identificador: 'MVC054', idEspacio: 2 }];

function renderizar() {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <ProveedorNotificaciones>
        <Espacios />
      </ProveedorNotificaciones>
    </MemoryRouter>,
  );
  return usuario;
}

const interruptor = (codigo) => screen.getByRole('switch', { name: `En servicio ${codigo}` });

describe('datosEspacios', () => {
  const filas = armarFilas({ espacios: ESPACIOS, tipos: TIPOS, activos: ACTIVOS });

  it('cruza el tipo (nombre visible), el estado y quién ocupa cada espacio', () => {
    expect(filas.map(({ codigo, tipo, estado }) => [codigo, tipo, estado])).toEqual([
      ['A-01', 'Carro', 'libre'],
      ['A-02', 'Carro', 'ocupado'],
      ['B-04', 'Carro', 'deshabilitado'],
      ['C-01', 'Camión de carga pesada', 'libre'],
    ]);
    expect(filas[1].registro.identificador).toBe('MVC054');
  });

  it('agrupa por piso y resume los estados', () => {
    expect(agruparPorPiso(filas).map(({ piso, filas: delPiso }) => [piso, delPiso.length])).toEqual(
      [
        ['1', 2],
        ['2', 2],
      ],
    );
    expect(resumirEspacios(filas)).toBe('4 espacios: 2 libres, 1 ocupado, 1 deshabilitado');
  });
});

describe('Espacios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarEspacios.mockResolvedValue(ESPACIOS);
    listarTiposVehiculo.mockResolvedValue(TIPOS);
    listarActivos.mockResolvedValue(ACTIVOS);
  });

  it('muestra una tabla por piso con el estado, el vehículo y el interruptor', async () => {
    renderizar();

    const piso1 = await screen.findByRole('table', { name: 'Espacios del piso 1' });
    expect(screen.getByRole('table', { name: 'Espacios del piso 2' })).toBeInTheDocument();
    expect(within(piso1).getByText('MVC 054')).toBeInTheDocument();
    expect(interruptor('A-01')).toHaveAttribute('aria-checked', 'true');
    expect(interruptor('B-04')).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByText('4 espacios: 2 libres, 1 ocupado, 1 deshabilitado.'),
    ).toBeInTheDocument();
  });

  it('deshabilitar un espacio ocupado avisa que el vehículo puede salir y llama al endpoint', async () => {
    cambiarHabilitadoEspacio.mockResolvedValue({ ...ESPACIOS[1], habilitado: false });
    const usuario = renderizar();
    await screen.findByRole('table', { name: 'Espacios del piso 1' });

    await usuario.click(interruptor('A-02'));
    const modal = screen.getByRole('dialog', { name: '¿Deshabilitar el espacio A-02, piso 1?' });
    expect(within(modal).getByText('Ahora está ocupado por MVC 054')).toBeInTheDocument();
    expect(within(modal).getByText(/puede salir normalmente/)).toBeInTheDocument();

    await usuario.click(within(modal).getByRole('button', { name: 'Deshabilitar' }));

    expect(cambiarHabilitadoEspacio).toHaveBeenCalledWith(2, false);
    expect(await screen.findByText('Espacio A-02 deshabilitado.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listarEspacios).toHaveBeenCalledTimes(2));
  });

  it('habilitar un espacio deshabilitado llama al endpoint con true', async () => {
    cambiarHabilitadoEspacio.mockResolvedValue({ ...ESPACIOS[2], habilitado: true });
    const usuario = renderizar();
    await screen.findByRole('table', { name: 'Espacios del piso 2' });

    await usuario.click(interruptor('B-04'));
    const modal = screen.getByRole('dialog', { name: '¿Habilitar el espacio B-04, piso 2?' });
    expect(within(modal).getByText('Volverá a recibir vehículos.')).toBeInTheDocument();
    await usuario.click(within(modal).getByRole('button', { name: 'Habilitar' }));

    expect(cambiarHabilitadoEspacio).toHaveBeenCalledWith(16, true);
    expect(await screen.findByText('Espacio B-04 habilitado.')).toBeInTheDocument();
  });

  it('"Cancelar" no cambia nada', async () => {
    const usuario = renderizar();
    await screen.findByRole('table', { name: 'Espacios del piso 1' });

    await usuario.click(interruptor('A-01'));
    const modal = screen.getByRole('dialog', { name: '¿Deshabilitar el espacio A-01, piso 1?' });
    expect(within(modal).queryByText(/Ahora está ocupado/)).not.toBeInTheDocument();
    await usuario.click(within(modal).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cambiarHabilitadoEspacio).not.toHaveBeenCalled();
  });

  it('un error del backend se muestra dentro del modal', async () => {
    cambiarHabilitadoEspacio.mockRejectedValue(
      new ErrorApi(404, 'NO_ENCONTRADO', 'No existe un espacio con id 1.'),
    );
    const usuario = renderizar();
    await screen.findByRole('table', { name: 'Espacios del piso 1' });

    await usuario.click(interruptor('A-01'));
    const modal = screen.getByRole('dialog');
    await usuario.click(within(modal).getByRole('button', { name: 'Deshabilitar' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent(
      'No existe un espacio con id 1.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('si falla la carga, "Reintentar" vuelve a consultar', async () => {
    listarEspacios.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('table', { name: 'Espacios del piso 1' })).toBeInTheDocument();
  });
});
