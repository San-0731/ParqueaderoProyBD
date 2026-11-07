import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ErrorApi } from '../../api/cliente.js';
import { listarEspacios } from '../../api/espacios.js';
import { listarActivos } from '../../api/registros.js';
import { consultarOcupacion } from '../../api/reportes.js';
import SesionDePrueba from '../../test/SesionDePrueba.jsx';
import { ACTIVOS, ESPACIOS, OCUPACION } from './datosPrueba.js';
import Tablero from './Tablero.jsx';

// La API se simula: cada prueba decide qué responde el "backend".
vi.mock('../../api/espacios.js', () => ({ listarEspacios: vi.fn() }));
vi.mock('../../api/reportes.js', () => ({ consultarOcupacion: vi.fn() }));
vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn() }));

/** Muestra la URL actual para comprobar a dónde navega el tablero. */
function UbicacionActual() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

function renderizar(ruta = '/', rol = 'ADMINISTRADOR') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <SesionDePrueba rol={rol}>
        <Routes>
          <Route path="/" element={<Tablero />} />
          <Route path="*" element={<p>Otra pantalla</p>} />
        </Routes>
        <UbicacionActual />
      </SesionDePrueba>
    </MemoryRouter>,
  );
}

const ubicacion = () => screen.getByTestId('ubicacion').textContent;
const letrero = () => screen.getByRole('region', { name: 'Cupos libres' });

function responderConDatos() {
  listarEspacios.mockResolvedValue(ESPACIOS);
  consultarOcupacion.mockResolvedValue(OCUPACION);
  listarActivos.mockResolvedValue(ACTIVOS);
}

describe('Tablero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    responderConDatos();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra "Cargando" mientras llega la primera respuesta', () => {
    renderizar();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando espacios…');
  });

  it('pinta cada espacio según su estado y con su destino', async () => {
    renderizar();

    const libre = await screen.findByRole('link', {
      name: 'A1-01 Libre (piso 1): registrar entrada',
    });
    expect(libre).toHaveAttribute('href', '/entrada?idEspacio=1');
    expect(within(libre).getByText('Libre')).toBeInTheDocument();
    // La zona se nombra con la letra y el piso (V006): la A del piso 1 es la A1.
    expect(screen.getByRole('heading', { level: 3, name: 'Zona A1' })).toBeInTheDocument();

    const ocupado = screen.getByRole('link', {
      name: 'A1-02 KLM 234 2 h 15 min (piso 1, ocupado): registrar salida',
    });
    expect(ocupado).toHaveAttribute('href', '/salida/28');
    expect(within(ocupado).getByText('KLM 234')).toBeInTheDocument();
    expect(within(ocupado).getByText('2 h 15 min')).toBeInTheDocument();

    const deshabilitado = screen.getByRole('button', {
      name: 'A1-03 Deshabilitado (piso 1)',
    });
    expect(within(deshabilitado).getByText('Deshabilitado')).toBeInTheDocument();
  });

  it('un espacio deshabilitado con un vehículo adentro se muestra ocupado', async () => {
    renderizar();

    const espacio = await screen.findByRole('link', { name: /^B2-01 / });
    expect(espacio).toHaveAttribute('href', '/salida/29');
    expect(espacio).toHaveAccessibleName(/Deshabilitado \(piso 2, ocupado\): registrar salida$/);
    expect(within(espacio).getByText('Deshabilitado')).toBeInTheDocument();
  });

  it('el letrero muestra los cupos libres por tipo y el total', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Cupos libres' });

    const todos = within(letrero()).getByRole('button', { name: /^Todos/ });
    expect(todos).toHaveAccessibleName('Todos 3 libres de 6 2 ocupados 1 deshabilitado');
    expect(todos).toHaveAttribute('aria-pressed', 'true');
    expect(within(letrero()).getByRole('button', { name: /^Moto/ })).toHaveAccessibleName(
      'Moto 2 libres de 2',
    );
    // La bicicleta no tiene espacios: no aparece en el letrero.
    expect(within(letrero()).queryByRole('button', { name: /^Bicicleta/ })).not.toBeInTheDocument();
  });

  it('al elegir un tipo solo quedan sus espacios y el filtro pasa a la URL', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await screen.findByRole('region', { name: 'Cupos libres' });

    await usuario.click(within(letrero()).getByRole('button', { name: /^Moto/ }));

    expect(within(letrero()).getByRole('button', { name: /^Moto/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('link', { name: /^M1-01 / })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^A1-01 / })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Piso 2' })).not.toBeInTheDocument();
    expect(ubicacion()).toBe('/?tipo=1');

    await usuario.click(within(letrero()).getByRole('button', { name: /^Todos/ }));
    expect(screen.getByRole('link', { name: /^A1-01 / })).toBeInTheDocument();
    expect(ubicacion()).toBe('/');
  });

  it('si la URL trae ?tipo= el tablero llega ya filtrado', async () => {
    renderizar('/?tipo=3');

    await screen.findByRole('link', { name: /^A1-01 / });
    expect(within(letrero()).getByRole('button', { name: /^Carro/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('link', { name: /^M1-01 / })).not.toBeInTheDocument();
  });

  it('un ?tipo= inválido muestra todos los espacios', async () => {
    renderizar('/?tipo=abc');

    await screen.findByRole('link', { name: /^M1-01 / });
    expect(within(letrero()).getByRole('button', { name: /^Todos/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('al tocar un espacio libre va a registrar la entrada con ese espacio', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('link', { name: /^A1-01 / }));

    expect(ubicacion()).toBe('/entrada?idEspacio=1');
  });

  it('al tocar un espacio deshabilitado avisa en un modal que se cierra con Escape', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: /^A1-03 / }));

    const aviso = screen.getByRole('dialog', { name: 'Espacio A1-03 deshabilitado' });
    expect(aviso).toHaveTextContent('Está fuera de servicio y no recibe vehículos.');
    expect(
      within(aviso).getByRole('link', { name: 'Ir a administración de espacios' }),
    ).toHaveAttribute('href', '/espacios');

    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(ubicacion()).toBe('/');
  });

  it('al operador el aviso de un espacio deshabilitado le dice que solo un administrador lo habilita', async () => {
    const usuario = userEvent.setup();
    renderizar('/', 'OPERADOR');

    await usuario.click(await screen.findByRole('button', { name: /^A1-03 / }));

    const aviso = screen.getByRole('dialog', { name: 'Espacio A1-03 deshabilitado' });
    expect(aviso).toHaveTextContent('Solo un administrador puede volver a habilitarlo.');
    expect(aviso).not.toHaveTextContent('habilítalo en Administración de espacios');
  });

  it('si la API falla muestra el error y "Reintentar" vuelve a consultar', async () => {
    const usuario = userEvent.setup();
    listarEspacios.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    renderizar();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo cargar el tablero');
    expect(alerta).toHaveTextContent('No se pudo conectar con el servidor.');

    await usuario.click(within(alerta).getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: /^A1-01 / })).toBeInTheDocument();
    expect(listarEspacios).toHaveBeenCalledTimes(2);
  });

  it('sin espacios muestra un estado vacío en lugar del letrero', async () => {
    listarEspacios.mockResolvedValue([]);
    renderizar();

    expect(
      await screen.findByRole('heading', { name: 'Todavía no hay espacios registrados' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Cupos libres' })).not.toBeInTheDocument();
  });

  it('el botón "Actualizar" vuelve a consultar y muestra los datos nuevos', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await screen.findByRole('link', { name: /^A1-01 Libre/ });

    // Mientras tanto, entró un vehículo al A1-01.
    listarEspacios.mockResolvedValue(
      ESPACIOS.map((espacio) =>
        espacio.idEspacio === 1 ? { ...espacio, ocupado: true } : espacio,
      ),
    );
    await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(
      await screen.findByRole('link', { name: 'A1-01 Ocupado (piso 1): ver vehículos dentro' }),
    ).toHaveAttribute('href', '/salida');
    expect(listarEspacios).toHaveBeenCalledTimes(2);
  });

  it('se actualiza solo cada 30 segundos', async () => {
    // Temporizadores falsos: se adelanta el reloj sin esperar 30 s de verdad.
    vi.useFakeTimers();
    renderizar();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('link', { name: /^A1-01 / })).toBeInTheDocument();
    expect(listarEspacios).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(29_999));
    expect(listarEspacios).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(listarEspacios).toHaveBeenCalledTimes(2);
    expect(consultarOcupacion).toHaveBeenCalledTimes(2);
    expect(listarActivos).toHaveBeenCalledTimes(2);
  });

  it('muestra el camión como "Camión de carga pesada" en el letrero y en la cuadrícula', async () => {
    consultarOcupacion.mockResolvedValue([
      ...OCUPACION,
      { idTipo: 4, tipoVehiculo: 'Camión', total: 1, ocupados: 0, libres: 1, deshabilitados: 0 },
    ]);
    listarEspacios.mockResolvedValue([
      ...ESPACIOS,
      {
        idEspacio: 9,
        idTipo: 4,
        piso: '2',
        zona: 'C',
        numero: '01',
        habilitado: true,
        ocupado: false,
        disponible: true,
      },
    ]);
    renderizar();

    expect(
      await within(await screen.findByRole('region', { name: 'Cupos libres' })).findByRole(
        'button',
        { name: 'Camión de carga pesada 1 libre de 1' },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Camión de carga pesada, 1 libre de/)).toBeInTheDocument();
    expect(screen.queryByText(/^Camión$/)).not.toBeInTheDocument();
  });
});
