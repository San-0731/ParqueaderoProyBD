import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { ErrorApi } from '../../api/cliente.js';
import { listarActivos } from '../../api/registros.js';
import Salida from './Salida.jsx';
import { ACTIVOS } from './datosPrueba.js';

vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn() }));

/** Marcador de la pantalla de cobro, para comprobar a dónde se navega. */
function CobroSimulado() {
  const { idRegistro } = useParams();
  return <p>Cobro del registro {idRegistro}</p>;
}

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/salida']}>
      <Routes>
        <Route path="/salida" element={<Salida />} />
        <Route path="/salida/:idRegistro" element={<CobroSimulado />} />
        <Route path="/entrada" element={<p>Pantalla de entrada</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const lista = () => screen.getByRole('list', { name: 'Vehículos dentro' });
const buscador = () => screen.getByRole('searchbox', { name: 'Buscar placa o código' });

describe('Salida (vehículos dentro)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarActivos.mockResolvedValue(ACTIVOS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra cada vehículo con su espacio y tiempo, y enlaza a su cobro', async () => {
    renderizar();

    const filas = await screen.findAllByRole('listitem');
    expect(filas).toHaveLength(3);
    const enlace = within(lista()).getByRole('link', { name: /^Cobrar salida de MVC 054/ });
    expect(enlace).toHaveAttribute('href', '/salida/28');
    expect(enlace).toHaveAccessibleName(
      'Cobrar salida de MVC 054, espacio A-02, piso 1, dentro desde 06/11/2026 12:18 p. m., 6 h 35 min',
    );
    expect(within(filas[0]).getByText('6 h 35 min')).toBeInTheDocument();
    expect(within(filas[0]).getByText('Carro, Laura Camila Pérez')).toBeInTheDocument();
    expect(screen.getByText('3 vehículos dentro')).toBeInTheDocument();
  });

  it('filtra por parte de la placa y cuenta los resultados', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await screen.findAllByRole('listitem');

    await usuario.type(buscador(), 'mv');

    expect(buscador()).toHaveValue('MV');
    expect(within(lista()).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('2 de 3 vehículos')).toBeInTheDocument();
  });

  it('con un solo resultado, Enter abre su cobro', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await screen.findAllByRole('listitem');

    await usuario.type(buscador(), 'xyz{Enter}');

    expect(await screen.findByText('Cobro del registro 30')).toBeInTheDocument();
  });

  it('con varios resultados, Enter no navega', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await screen.findAllByRole('listitem');

    await usuario.type(buscador(), 'mv{Enter}');

    expect(lista()).toBeInTheDocument();
    expect(screen.queryByText(/^Cobro del registro/)).not.toBeInTheDocument();
  });

  it('sin coincidencias lo dice y ofrece registrar la entrada', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await screen.findAllByRole('listitem');

    await usuario.type(buscador(), 'qqq');

    expect(
      screen.getByRole('heading', { name: 'Ningún vehículo dentro coincide con QQQ' }),
    ).toBeInTheDocument();
    expect(screen.getByText('0 de 3 vehículos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrar entrada' })).toHaveAttribute(
      'href',
      '/entrada',
    );
  });

  it('si no hay nadie dentro muestra el estado vacío', async () => {
    listarActivos.mockResolvedValue([]);
    renderizar();

    expect(
      await screen.findByRole('heading', { name: 'No hay vehículos dentro' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('si falla la consulta muestra el error y "Reintentar" vuelve a consultar', async () => {
    const usuario = userEvent.setup();
    listarActivos.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
    expect(listarActivos).toHaveBeenCalledTimes(2);
  });

  it('se actualiza sola cada minuto', async () => {
    vi.useFakeTimers();
    renderizar();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(listarActivos).toHaveBeenCalledTimes(1);

    listarActivos.mockResolvedValue(ACTIVOS.slice(1));
    await act(() => vi.advanceTimersByTimeAsync(59_999));
    expect(listarActivos).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(listarActivos).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
