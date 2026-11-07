import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { listarMetodosPago } from '../../api/catalogos.js';
import { ErrorApi } from '../../api/cliente.js';
import { consultarIngresos, consultarOcupacion } from '../../api/reportes.js';
import { formatearPesos } from '../../utils/formato.js';
import Reportes from './Reportes.jsx';
import {
  INGRESOS_1_AL_5_OCTUBRE,
  INGRESOS_NOVIEMBRE,
  METODOS,
  OCUPACION,
  SIN_PAGOS,
} from './datosPrueba.js';

vi.mock('../../api/reportes.js', () => ({
  consultarIngresos: vi.fn(),
  consultarOcupacion: vi.fn(),
}));
vi.mock('../../api/catalogos.js', () => ({ listarMetodosPago: vi.fn() }));

// formatearPesos separa "$" del número con un espacio duro; Testing Library lo lee como espacio.
const pesos = (valor) => formatearPesos(valor).replace(/\s/g, ' ');

function UbicacionActual() {
  const { search } = useLocation();
  return <p data-testid="ubicacion">{search}</p>;
}

function renderizar(ruta = '/reportes') {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/reportes" element={<Reportes />} />
      </Routes>
      <UbicacionActual />
    </MemoryRouter>,
  );
  return usuario;
}

const ubicacion = () => screen.getByTestId('ubicacion').textContent;
const grafico = () => screen.getByRole('list', { name: 'Gráfico de ingresos por día' });

describe('Reportes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Solo se simula la fecha (6 de noviembre de 2026); los temporizadores siguen siendo reales.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 20, 30));
    consultarIngresos.mockResolvedValue(INGRESOS_NOVIEMBRE);
    consultarOcupacion.mockResolvedValue(OCUPACION);
    listarMetodosPago.mockResolvedValue(METODOS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('al abrir consulta el mes actual y muestra el total y una tarjeta por método', async () => {
    renderizar();

    expect(await screen.findByText('Total recaudado')).toBeInTheDocument();
    expect(consultarIngresos).toHaveBeenCalledWith({ desde: '2026-11-01', hasta: '2026-11-06' });
    expect(screen.getByRole('button', { name: 'Este mes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const tarjetas = screen
      .getAllByRole('listitem')
      .filter((item) =>
        ['PSE', 'Nequi', 'Daviplata', 'Efectivo'].some((nombre) =>
          item.textContent.startsWith(nombre),
        ),
      );
    // textContent no normaliza el espacio duro de los pesos: se reemplaza para comparar.
    expect(tarjetas.map((tarjeta) => tarjeta.textContent.replace(/\s/g, ' '))).toEqual([
      `PSE${pesos(0)}0 pagos, 0 % del total`,
      `Nequi${pesos(0)}0 pagos, 0 % del total`,
      `Daviplata${pesos(4000)}1 pago, 27 % del total`,
      `Efectivo${pesos(11000)}2 pagos, 73 % del total`,
    ]);
  });

  it('dibuja una barra por día del rango (con ceros) y muestra su valor al enfocarla', async () => {
    renderizar();
    await screen.findByText('Total recaudado');

    const barras = within(grafico()).getAllByRole('img');
    expect(barras).toHaveLength(6); // del 1 al 6 de noviembre
    expect(barras[0]).toHaveAccessibleName('01/11/2026: sin pagos');
    // El nombre accesible conserva el espacio duro de formatearPesos (no se normaliza).
    expect(barras[5]).toHaveAccessibleName(`06/11/2026: ${formatearPesos(15000)} en 3 pagos`);

    // La barra del día 6 mide el 100 % (es el día más alto); las demás, 0 %.
    expect(barras[5].firstChild).toHaveStyle({ height: '100%' });
    expect(barras[0].firstChild).toHaveStyle({ height: '0%' });

    barras[5].focus();
    expect(barras[5]).toHaveFocus();
    expect(
      within(barras[5]).getByText(`06/11/2026: ${pesos(15000)} en 3 pagos`),
    ).toBeInTheDocument();
  });

  it('la altura de las barras es proporcional al día más alto', async () => {
    consultarIngresos.mockResolvedValue(INGRESOS_1_AL_5_OCTUBRE);
    renderizar('/reportes?desde=2026-10-01&hasta=2026-10-05');
    await screen.findByText('Total recaudado');

    const alturas = within(grafico())
      .getAllByRole('img')
      .map((barra) => Number.parseFloat(barra.firstChild.style.height));
    // 130.000 es el máximo: 6.000 mide 4,6 % y 45.000 mide 34,6 %.
    expect(alturas[0]).toBe(100);
    expect(alturas[1]).toBeCloseTo((6000 / 130000) * 100, 5);
    expect(alturas[2]).toBe(0);
    expect(alturas[4]).toBeCloseTo((45000 / 130000) * 100, 5);
  });

  it('"Mes anterior" consulta octubre y lo guarda en la URL', async () => {
    const usuario = renderizar();
    await screen.findByText('Total recaudado');

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));

    await waitFor(() =>
      expect(consultarIngresos).toHaveBeenLastCalledWith({
        desde: '2026-10-01',
        hasta: '2026-10-31',
      }),
    );
    await waitFor(() => expect(ubicacion()).toBe('?desde=2026-10-01&hasta=2026-10-31'));
  });

  it('un rango al revés muestra el error y no consulta', async () => {
    renderizar();
    await screen.findByText('Total recaudado');
    expect(consultarIngresos).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-20' } });

    expect(
      await screen.findByText(
        "La fecha 'desde' (20/11/2026) no puede ser posterior a la fecha 'hasta' (06/11/2026).",
      ),
    ).toBeInTheDocument();
    expect(consultarIngresos).toHaveBeenCalledTimes(1);
  });

  it('sin pagos en el rango lo dice', async () => {
    consultarIngresos.mockResolvedValue(SIN_PAGOS);
    renderizar('/reportes?desde=2027-01-01&hasta=2027-01-31');

    expect(
      await screen.findByRole('heading', {
        name: 'No hubo pagos entre el 01/01/2027 y el 31/01/2027',
      }),
    ).toBeInTheDocument();
  });

  it('la ocupación actual muestra cada tipo con sus cifras y el camión con su nombre visible', async () => {
    renderizar();

    expect(await screen.findByText('2 ocupados, 9 libres, 1 deshabilitado')).toBeInTheDocument();
    expect(screen.getByText(/^Camión de carga pesada/)).toBeInTheDocument();
    expect(screen.getByText('2 libres')).toBeInTheDocument();
  });

  it('si falla la consulta de ingresos muestra "Reintentar"', async () => {
    consultarIngresos.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Total recaudado')).toBeInTheDocument();
  });
});
