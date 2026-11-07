import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { listarMetodosPago } from '../../api/catalogos.js';
import { ErrorApi } from '../../api/cliente.js';
import { listarHistorial } from '../../api/registros.js';
import { formatearPesos } from '../../utils/formato.js';
import Historial from './Historial.jsx';
import { HISTORIAL, METODOS, VEINTICINCO } from './datosPrueba.js';

vi.mock('../../api/registros.js', () => ({ listarHistorial: vi.fn() }));
vi.mock('../../api/catalogos.js', () => ({ listarMetodosPago: vi.fn() }));

// formatearPesos separa "$" del número con un espacio duro; Testing Library lo lee como espacio.
const pesos = (valor) => formatearPesos(valor).replace(/\s/g, ' ');

/** Muestra la URL actual para comprobar los filtros. */
function UbicacionActual() {
  const { search } = useLocation();
  return <p data-testid="ubicacion">{decodeURIComponent(search)}</p>;
}

function renderizar(ruta = '/historial') {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/historial" element={<Historial />} />
      </Routes>
      <UbicacionActual />
    </MemoryRouter>,
  );
  return usuario;
}

const ubicacion = () => screen.getByTestId('ubicacion').textContent;
const tabla = () => screen.getByRole('table', { name: 'Historial de parqueos' });
/** Filas de datos de la tabla (sin el encabezado ni la fila de total). */
const filasDeDatos = () => within(tabla()).getAllByRole('row').slice(1, -1);
const atajo = (nombre) => screen.getByRole('button', { name: nombre });

describe('Historial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Solo se simula la fecha (6 de noviembre de 2026, 8:30 p. m.); los temporizadores siguen
    // siendo reales para que userEvent funcione.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 20, 30));
    listarMetodosPago.mockResolvedValue(METODOS);
    listarHistorial.mockResolvedValue(HISTORIAL);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('al abrir consulta los últimos 7 días y, si no hay nada, ofrece 30 días y todo', async () => {
    listarHistorial.mockResolvedValue([]);
    const usuario = renderizar();

    expect(
      await screen.findByRole('heading', {
        name: 'No hay parqueos terminados entre el 31/10/2026 y el 06/11/2026',
      }),
    ).toBeInTheDocument();
    expect(listarHistorial).toHaveBeenCalledWith({ desde: '2026-10-31', hasta: '2026-11-06' });
    expect(atajo('7 días')).toHaveAttribute('aria-pressed', 'true');

    await usuario.click(screen.getByRole('button', { name: 'Ver los últimos 30 días' }));
    await waitFor(() =>
      expect(listarHistorial).toHaveBeenLastCalledWith({
        desde: '2026-10-08',
        hasta: '2026-11-06',
      }),
    );
    await waitFor(() => expect(ubicacion()).toBe('?desde=2026-10-08&hasta=2026-11-06'));

    await usuario.click(await screen.findByRole('button', { name: 'Ver todo el historial' }));
    await waitFor(() => expect(listarHistorial).toHaveBeenLastCalledWith({}));
    await waitFor(() => expect(ubicacion()).toBe('?todo=1'));
    expect(atajo('Todo')).toHaveAttribute('aria-pressed', 'true');
  });

  it('muestra 20 filas por página y el total de TODOS los resultados', async () => {
    listarHistorial.mockResolvedValue(VEINTICINCO);
    const usuario = renderizar('/historial?todo=1');

    await screen.findByRole('table', { name: 'Historial de parqueos' });
    expect(filasDeDatos()).toHaveLength(20);
    const pie = within(tabla()).getAllByRole('row').at(-1);
    expect(pie).toHaveTextContent('Total de 25 parqueos');
    expect(pie).toHaveTextContent(pesos(25000));
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(ubicacion()).toBe('?todo=1&pagina=2'));
    expect(filasDeDatos()).toHaveLength(5);
    // El total no cambia al pasar de página, y paginar no vuelve a consultar.
    expect(within(tabla()).getAllByRole('row').at(-1)).toHaveTextContent(pesos(25000));
    expect(listarHistorial).toHaveBeenCalledTimes(1);
  });

  it('los atajos y el método de pago arman la consulta', async () => {
    const usuario = renderizar();
    await screen.findByRole('table', { name: 'Historial de parqueos' });

    await usuario.click(atajo('Hoy'));
    await waitFor(() =>
      expect(listarHistorial).toHaveBeenLastCalledWith({
        desde: '2026-11-06',
        hasta: '2026-11-06',
      }),
    );

    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Método de pago' }), 'Nequi');
    await waitFor(() =>
      expect(listarHistorial).toHaveBeenLastCalledWith({
        desde: '2026-11-06',
        hasta: '2026-11-06',
        idMetodoPago: 2,
      }),
    );
    await waitFor(() => expect(ubicacion()).toBe('?desde=2026-11-06&hasta=2026-11-06&metodo=2'));
  });

  it('un rango al revés muestra el error y no consulta', async () => {
    renderizar();
    await screen.findByRole('table', { name: 'Historial de parqueos' });
    expect(listarHistorial).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-20' } });

    expect(
      await screen.findByText(
        "La fecha 'desde' (20/11/2026) no puede ser posterior a la fecha 'hasta' (06/11/2026).",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(listarHistorial).toHaveBeenCalledTimes(1);
  });

  it('la placa filtra en el navegador, por parte de ella, sin volver a consultar', async () => {
    const usuario = renderizar('/historial?todo=1');
    await screen.findByRole('table', { name: 'Historial de parqueos' });
    expect(filasDeDatos()).toHaveLength(3);

    await usuario.type(screen.getByRole('searchbox', { name: 'Placa o código' }), 'r48');

    await waitFor(() => expect(filasDeDatos()).toHaveLength(1));
    expect(within(tabla()).getByText('R48213')).toBeInTheDocument();
    expect(listarHistorial).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(ubicacion()).toBe('?todo=1&identificador=R48'));
  });

  it('el enlace de la ficha (?identificador=KLM234) consulta sin límite de fechas', async () => {
    renderizar('/historial?identificador=KLM234');

    await screen.findByRole('table', { name: 'Historial de parqueos' });
    expect(listarHistorial).toHaveBeenCalledWith({});
    expect(filasDeDatos()).toHaveLength(1);
    expect(screen.getByText('1 parqueo terminado.')).toBeInTheDocument();
  });

  it('muestra el pago dividido, la salida sin cobro y el nombre visible del camión', async () => {
    renderizar('/historial?todo=1');
    await screen.findByRole('table', { name: 'Historial de parqueos' });

    expect(within(tabla()).getByText('Efectivo + Nequi')).toBeInTheDocument();
    expect(within(tabla()).getByText('Sin cobro')).toBeInTheDocument();
    expect(within(tabla()).getByText('Camión de carga pesada')).toBeInTheDocument();
    expect(within(tabla()).getByText('C2-01, piso 2')).toBeInTheDocument();
  });

  it('si falla la consulta muestra el error y "Reintentar" vuelve a consultar', async () => {
    listarHistorial.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = renderizar('/historial?todo=1');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('table', { name: 'Historial de parqueos' })).toBeInTheDocument();
  });
});
