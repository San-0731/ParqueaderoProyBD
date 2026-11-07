import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { listarMarcas, listarModelos, listarTiposVehiculo } from '../../api/catalogos.js';
import { ErrorApi } from '../../api/cliente.js';
import { actualizarCliente, listarClientes } from '../../api/clientes.js';
import { listarActivos } from '../../api/registros.js';
import { actualizarVehiculo, crearVehiculo, listarVehiculos } from '../../api/vehiculos.js';
import ProveedorNotificaciones from '../../context/ProveedorNotificaciones.jsx';
import Vehiculos from './Vehiculos.jsx';
import { ACTIVOS, CLIENTES, JORGE, MARCAS, MODELOS, TIPOS, VEHICULOS } from './datosPrueba.js';

// La API se simula: cada prueba decide qué responde el "backend".
vi.mock('../../api/catalogos.js', () => ({
  listarTiposVehiculo: vi.fn(),
  listarMarcas: vi.fn(),
  listarModelos: vi.fn(),
}));
vi.mock('../../api/clientes.js', () => ({
  listarClientes: vi.fn(),
  crearCliente: vi.fn(),
  actualizarCliente: vi.fn(),
}));
vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn() }));
vi.mock('../../api/vehiculos.js', () => ({
  listarVehiculos: vi.fn(),
  crearVehiculo: vi.fn(),
  actualizarVehiculo: vi.fn(),
}));

/** Muestra la URL actual para comprobar ?id y ?nuevo. */
function UbicacionActual() {
  const { search } = useLocation();
  return <p data-testid="ubicacion">{search}</p>;
}

async function renderizar(ruta = '/vehiculos') {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorNotificaciones>
        <Routes>
          <Route path="/vehiculos" element={<Vehiculos />} />
          <Route path="*" element={<p>Otra pantalla</p>} />
        </Routes>
        <UbicacionActual />
      </ProveedorNotificaciones>
    </MemoryRouter>,
  );
  await screen.findByRole('list', { name: 'Vehículos' });
  return usuario;
}

const ubicacion = () => screen.getByTestId('ubicacion').textContent;
const lista = () => screen.getByRole('list', { name: 'Vehículos' });
const fila = (placa) => within(lista()).getByRole('button', { name: new RegExp(`^${placa}`) });
const ficha = () => screen.getByRole('article', { name: /^Vehículo/ });
const buscador = () => screen.getByRole('searchbox', { name: 'Buscar placa, documento o nombre' });

describe('Vehiculos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarVehiculos.mockResolvedValue(VEHICULOS);
    listarClientes.mockResolvedValue(CLIENTES);
    listarTiposVehiculo.mockResolvedValue(TIPOS);
    listarMarcas.mockResolvedValue(MARCAS);
    listarModelos.mockResolvedValue(MODELOS);
    listarActivos.mockResolvedValue(ACTIVOS);
  });

  it('lista los vehículos por placa y, sin elegir ninguno, invita a elegir', async () => {
    await renderizar();

    const nombres = within(lista())
      .getAllByRole('button')
      .map((boton) => boton.getAttribute('aria-label'));
    expect(nombres).toEqual([
      'ABC 12D, Moto, Yamaha NMAX, Laura Camila Pérez',
      'KLM 234, Carro, Mazda 3, Laura Camila Pérez, dentro del parqueadero',
      'R48213, Camión de carga pesada, sin marca ni modelo, Jorge Enrique Torres',
    ]);
    expect(screen.getByRole('heading', { name: 'Elige un vehículo' })).toBeInTheDocument();
    expect(screen.getByText('3 vehículos')).toBeInTheDocument();
  });

  it('con un clic muestra la ficha y la guarda en la URL', async () => {
    const usuario = await renderizar();

    await usuario.click(fila('KLM 234'));

    expect(fila('KLM 234')).toHaveAttribute('aria-current', 'true');
    expect(ubicacion()).toBe('?id=40');
    expect(within(ficha()).getByText('Mazda 3')).toBeInTheDocument();
    expect(within(ficha()).getByText('Dentro del parqueadero')).toBeInTheDocument();
    expect(within(ficha()).getByRole('link', { name: 'Cobrar salida' })).toHaveAttribute(
      'href',
      '/salida/28',
    );
    expect(within(ficha()).getByText('Laura Camila Pérez')).toBeInTheDocument();
    // Su otro vehículo lleva a su ficha.
    await usuario.click(within(ficha()).getByRole('button', { name: 'Ver ABC 12D' }));
    expect(ubicacion()).toBe('?id=41');
  });

  it('las flechas del teclado cambian la selección y el foco', async () => {
    const usuario = await renderizar('/vehiculos?id=41');
    expect(fila('ABC 12D')).toHaveAttribute('tabindex', '0');
    expect(fila('KLM 234')).toHaveAttribute('tabindex', '-1');

    fila('ABC 12D').focus();
    await usuario.keyboard('{ArrowDown}');
    expect(ubicacion()).toBe('?id=40');
    expect(fila('KLM 234')).toHaveFocus();
    expect(fila('KLM 234')).toHaveAttribute('aria-current', 'true');

    await usuario.keyboard('{End}');
    expect(ubicacion()).toBe('?id=42');
    expect(fila('R48213')).toHaveFocus();

    await usuario.keyboard('{ArrowDown}'); // ya es el último: se queda ahí
    expect(ubicacion()).toBe('?id=42');

    await usuario.keyboard('{Home}');
    expect(ubicacion()).toBe('?id=41');
  });

  it('el buscador filtra por placa, documento o nombre, y Enter abre el único resultado', async () => {
    const usuario = await renderizar();

    await usuario.type(buscador(), 'jorge');
    expect(within(lista()).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('1 de 3 vehículos')).toBeInTheDocument();

    await usuario.keyboard('{Enter}');
    expect(ubicacion()).toBe('?id=42');
    expect(within(ficha()).getByText('Camión de carga pesada')).toBeInTheDocument();
  });

  it('si la búsqueda no encuentra una placa válida, ofrece registrarla', async () => {
    const usuario = await renderizar();

    await usuario.type(buscador(), 'klm-999');
    await usuario.click(screen.getByRole('button', { name: 'Registrar KLM 999' }));

    expect(ubicacion()).toBe('?nuevo=KLM999');
    const nuevo = screen.getByRole('region', { name: 'Nuevo vehículo' });
    expect(within(nuevo).getByText(/no está registrado/)).toBeInTheDocument();
    expect(within(nuevo).getByText('Carro')).toBeInTheDocument();
  });

  it('"Nuevo vehículo" con una placa que ya existe ofrece ver su ficha', async () => {
    const usuario = await renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Nuevo vehículo' }));
    const nuevo = screen.getByRole('region', { name: 'Nuevo vehículo' });
    await usuario.type(within(nuevo).getByRole('textbox', { name: 'Placa o código' }), 'klm234');
    await usuario.click(within(nuevo).getByRole('button', { name: 'Continuar' }));

    expect(within(nuevo).getByText('Ya está registrado')).toBeInTheDocument();
    await usuario.click(within(nuevo).getByRole('button', { name: 'Ver su ficha' }));
    expect(ubicacion()).toBe('?id=40');
  });

  it('"Nuevo vehículo" registra uno nuevo y lo muestra en su ficha', async () => {
    listarClientes.mockImplementation(async ({ documento } = {}) =>
      documento ? CLIENTES.filter((cliente) => cliente.documento === documento) : CLIENTES,
    );
    crearVehiculo.mockImplementation(async (datos) => ({ idVehiculo: 43, idTipo: 1, ...datos }));
    const usuario = await renderizar('/vehiculos?nuevo=');
    const nuevo = screen.getByRole('region', { name: 'Nuevo vehículo' });
    await usuario.type(within(nuevo).getByRole('textbox', { name: 'Placa o código' }), 'QWE45F');
    await usuario.click(within(nuevo).getByRole('button', { name: 'Continuar' }));
    expect(within(nuevo).getByText('Moto')).toBeInTheDocument();

    // La recarga después de registrar ya trae el vehículo nuevo.
    listarVehiculos.mockResolvedValue([
      ...VEHICULOS,
      { idVehiculo: 43, identificador: 'QWE45F', idTipo: 1, idModelo: null, idCliente: 8 },
    ]);
    await usuario.type(
      within(nuevo).getByRole('textbox', { name: 'Documento del propietario' }),
      JORGE.documento,
    );
    await usuario.click(within(nuevo).getByRole('button', { name: 'Buscar propietario' }));
    await within(nuevo).findByText(/ya está registrado como propietario/);
    await usuario.click(within(nuevo).getByRole('button', { name: 'Registrar vehículo' }));

    expect(crearVehiculo).toHaveBeenCalledWith(
      expect.not.objectContaining({ idTipo: expect.anything() }),
    );
    expect(await screen.findByText('Vehículo QWE 45F registrado.')).toBeInTheDocument();
    // React Router cambia la URL dentro de una transición: puede llegar un poco después.
    await waitFor(() => expect(ubicacion()).toBe('?id=43'));
    expect(await within(lista()).findByRole('button', { name: /^QWE 45F/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('editar vehículo: la placa y el tipo son fijos y se envía sin ellos', async () => {
    actualizarVehiculo.mockImplementation(async (id, datos) => ({ ...VEHICULOS[0], ...datos }));
    const usuario = await renderizar('/vehiculos?id=40');

    await usuario.click(within(ficha()).getByRole('button', { name: 'Editar vehículo' }));
    const modal = screen.getByRole('dialog', { name: 'Editar vehículo' });
    expect(within(modal).getByText('La placa y el tipo no se pueden cambiar.')).toBeInTheDocument();
    expect(within(modal).queryByRole('textbox', { name: /Placa/ })).not.toBeInTheDocument();
    // Los datos guardados llegan al formulario (la marca se deduce del modelo).
    expect(within(modal).getByRole('combobox', { name: 'Marca (opcional)' })).toHaveValue('3');
    expect(within(modal).getByRole('combobox', { name: 'Modelo (opcional)' })).toHaveValue('10');
    const color = within(modal).getByRole('textbox', { name: 'Color (opcional)' });
    await usuario.clear(color);
    await usuario.type(color, 'Negro');
    await usuario.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizarVehiculo).toHaveBeenCalledWith(40, {
      idCliente: 7,
      idModelo: 10,
      color: 'Negro',
      anio: 2020,
    });
    expect(await screen.findByText('Vehículo KLM 234 actualizado.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listarVehiculos).toHaveBeenCalledTimes(2));
  });

  it('editar vehículo: cambiar el propietario por otro ya registrado', async () => {
    listarClientes.mockImplementation(async ({ documento } = {}) =>
      documento ? CLIENTES.filter((cliente) => cliente.documento === documento) : CLIENTES,
    );
    actualizarVehiculo.mockImplementation(async (id, datos) => ({ ...VEHICULOS[0], ...datos }));
    const usuario = await renderizar('/vehiculos?id=40');

    await usuario.click(within(ficha()).getByRole('button', { name: 'Editar vehículo' }));
    const modal = screen.getByRole('dialog', { name: 'Editar vehículo' });
    await usuario.click(within(modal).getByRole('button', { name: 'Cambiar propietario' }));
    await usuario.type(
      within(modal).getByRole('textbox', { name: 'Documento del propietario' }),
      '80.123.654',
    );
    await usuario.click(within(modal).getByRole('button', { name: 'Buscar propietario' }));
    await within(modal).findByText(/ya está registrado como propietario/);
    await usuario.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizarVehiculo).toHaveBeenCalledWith(40, expect.objectContaining({ idCliente: 8 }));
  });

  it('editar propietario: avisa que tiene varios vehículos y valida los campos', async () => {
    const usuario = await renderizar('/vehiculos?id=40');

    await usuario.click(within(ficha()).getByRole('button', { name: 'Editar propietario' }));
    const modal = screen.getByRole('dialog', { name: 'Editar propietario' });
    expect(within(modal).getByText(/Tiene 2 vehículos a su nombre/)).toBeInTheDocument();

    const nombres = within(modal).getByRole('textbox', { name: 'Nombres' });
    await usuario.clear(nombres);
    await usuario.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    expect(nombres).toHaveAccessibleDescription('Los nombres son obligatorios.');
    expect(actualizarCliente).not.toHaveBeenCalled();
  });

  it('editar propietario: un 409 por documento repetido sale junto al campo Documento', async () => {
    actualizarCliente.mockRejectedValue(
      new ErrorApi(409, 'REGLA_NEGOCIO', "Ya existe un cliente con el documento '80123654'."),
    );
    const usuario = await renderizar('/vehiculos?id=40');

    await usuario.click(within(ficha()).getByRole('button', { name: 'Editar propietario' }));
    const modal = screen.getByRole('dialog', { name: 'Editar propietario' });
    const documento = within(modal).getByRole('textbox', { name: 'Documento' });
    await usuario.clear(documento);
    await usuario.type(documento, '80123654');
    await usuario.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizarCliente).toHaveBeenCalledWith(7, {
      documento: '80123654',
      nombres: 'Laura Camila',
      apellidos: 'Pérez',
      telefono: '3104567890',
    });
    await waitFor(() =>
      expect(documento).toHaveAccessibleDescription(
        expect.stringContaining("Ya existe un cliente con el documento '80123654'."),
      ),
    );
    expect(documento).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Editar propietario' })).toBeInTheDocument();
  });

  it('en celular, la ficha lleva "Volver a la lista"', async () => {
    const usuario = await renderizar('/vehiculos?id=42');

    await usuario.click(screen.getByRole('button', { name: 'Volver a la lista' }));

    expect(ubicacion()).toBe('');
  });

  it('un id que no existe lo dice', async () => {
    await renderizar('/vehiculos?id=999');

    expect(screen.getByText(/No hay un vehículo con el número 999/)).toBeInTheDocument();
  });

  it('si falla la carga, "Reintentar" vuelve a consultar', async () => {
    listarVehiculos.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/vehiculos']}>
        <ProveedorNotificaciones>
          <Vehiculos />
        </ProveedorNotificaciones>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('list', { name: 'Vehículos' })).toBeInTheDocument();
  });
});
