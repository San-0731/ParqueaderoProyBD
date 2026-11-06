import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorApi } from '../../api/cliente.js';
import { crearCliente, listarClientes } from '../../api/clientes.js';
import { crearVehiculo } from '../../api/vehiculos.js';
import { LAURA, MARCAS, MODELOS, TIPOS } from '../../pages/entrada/datosPrueba.js';
import FormularioVehiculo from './FormularioVehiculo.jsx';

vi.mock('../../api/clientes.js', () => ({ listarClientes: vi.fn(), crearCliente: vi.fn() }));
vi.mock('../../api/vehiculos.js', () => ({ crearVehiculo: vi.fn() }));

function renderizar(props = {}) {
  const onRegistrado = vi.fn();
  const onCorregirPlaca = vi.fn();
  render(
    <FormularioVehiculo
      identificador="KLM999"
      tipos={TIPOS}
      marcas={MARCAS}
      modelos={MODELOS}
      onRegistrado={onRegistrado}
      onCorregirPlaca={onCorregirPlaca}
      {...props}
    />,
  );
  return { onRegistrado, onCorregirPlaca, usuario: userEvent.setup() };
}

const campoDocumento = () => screen.getByRole('textbox', { name: 'Documento del propietario' });

async function buscarPropietario(usuario, documento) {
  await usuario.type(campoDocumento(), documento);
  await usuario.click(screen.getByRole('button', { name: 'Buscar propietario' }));
}

describe('FormularioVehiculo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    crearVehiculo.mockImplementation(async (datos) => ({ idVehiculo: 50, ...datos }));
  });

  it('muestra la placa que se buscó y permite corregirla', async () => {
    const { usuario, onCorregirPlaca } = renderizar();

    expect(screen.getByText('KLM 999')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Corregir placa' }));

    expect(onCorregirPlaca).toHaveBeenCalled();
  });

  it('con un propietario existente registra el vehículo con su idCliente', async () => {
    listarClientes.mockResolvedValue([LAURA]);
    const { usuario, onRegistrado } = renderizar({ idTipoInicial: 3 });

    // El tipo viene sugerido (por ejemplo, del espacio elegido en el tablero).
    expect(screen.getByRole('combobox', { name: 'Tipo de vehículo' })).toHaveValue('3');
    await buscarPropietario(usuario, '1.012.345.678');
    expect(screen.getByRole('status')).toHaveTextContent('Laura Camila Pérez ya está registrado');
    expect(listarClientes).toHaveBeenCalledWith({ documento: '1012345678' });

    await usuario.click(screen.getByRole('button', { name: 'Registrar vehículo' }));

    expect(crearCliente).not.toHaveBeenCalled();
    expect(crearVehiculo).toHaveBeenCalledWith({
      identificador: 'KLM999',
      idTipo: 3,
      idCliente: 7,
      idModelo: null,
      color: null,
      anio: null,
    });
    expect(onRegistrado).toHaveBeenCalledWith({
      vehiculo: expect.objectContaining({ idVehiculo: 50, identificador: 'KLM999' }),
      propietario: LAURA,
      registroActivo: null,
    });
  });

  it('con un propietario nuevo lo crea primero y después el vehículo', async () => {
    listarClientes.mockResolvedValue([]);
    crearCliente.mockResolvedValue({ ...LAURA, idCliente: 99, documento: '555' });
    const { usuario, onRegistrado } = renderizar();

    await usuario.selectOptions(
      screen.getByRole('combobox', { name: 'Tipo de vehículo' }),
      'Carro',
    );
    await usuario.selectOptions(
      screen.getByRole('combobox', { name: 'Marca (opcional)' }),
      'Mazda',
    );
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Modelo (opcional)' }), '3');
    await usuario.type(screen.getByRole('textbox', { name: 'Año (opcional)' }), '2020');
    await buscarPropietario(usuario, '555');
    expect(screen.getByText(/No hay un propietario con el documento 555/)).toBeInTheDocument();
    await usuario.type(screen.getByRole('textbox', { name: 'Nombres' }), 'Andrés');
    await usuario.type(screen.getByRole('textbox', { name: 'Apellidos' }), 'Gómez');

    await usuario.click(screen.getByRole('button', { name: 'Registrar vehículo' }));

    expect(crearCliente).toHaveBeenCalledWith({
      documento: '555',
      nombres: 'Andrés',
      apellidos: 'Gómez',
      telefono: null,
    });
    expect(crearVehiculo).toHaveBeenCalledWith(
      expect.objectContaining({ idCliente: 99, idTipo: 3, idModelo: 10, anio: 2020 }),
    );
    expect(onRegistrado).toHaveBeenCalled();
  });

  it('muestra los errores junto a cada campo y no llama a la API', async () => {
    const { usuario } = renderizar();

    await usuario.selectOptions(
      screen.getByRole('combobox', { name: 'Marca (opcional)' }),
      'Mazda',
    );
    await usuario.click(screen.getByRole('button', { name: 'Registrar vehículo' }));

    expect(screen.getByRole('combobox', { name: 'Tipo de vehículo' })).toHaveAccessibleDescription(
      'Elige el tipo de vehículo.',
    );
    expect(screen.getByRole('combobox', { name: 'Modelo (opcional)' })).toHaveAccessibleDescription(
      'Elige también el modelo o deja la marca vacía.',
    );
    expect(campoDocumento()).toHaveAccessibleDescription(
      expect.stringContaining('El documento del cliente es obligatorio.'),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los datos marcados');
    expect(crearVehiculo).not.toHaveBeenCalled();
  });

  it('la marca filtra los modelos', async () => {
    const { usuario } = renderizar();
    const modelo = () => screen.getByRole('combobox', { name: 'Modelo (opcional)' });

    expect(modelo()).toBeDisabled();
    await usuario.selectOptions(
      screen.getByRole('combobox', { name: 'Marca (opcional)' }),
      'Yamaha',
    );

    const opciones = within(modelo())
      .getAllByRole('option')
      .map((opcion) => opcion.textContent);
    expect(opciones).toEqual(['Elige el modelo', 'NMAX']);
  });

  it('un 409 del backend se muestra con su mensaje', async () => {
    listarClientes.mockResolvedValue([LAURA]);
    crearVehiculo.mockRejectedValue(
      new ErrorApi(409, 'CONFLICTO', 'Ya existe un vehículo con esa placa o código.'),
    );
    const { usuario, onRegistrado } = renderizar({ idTipoInicial: 3 });

    await buscarPropietario(usuario, '1012345678');
    await usuario.click(screen.getByRole('button', { name: 'Registrar vehículo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un vehículo con esa placa o código.',
    );
    expect(onRegistrado).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Registrar vehículo' })).toBeEnabled();
  });

  it('si el propietario nuevo se creó pero el vehículo falló, el reintento no lo duplica', async () => {
    listarClientes.mockResolvedValue([]);
    crearCliente.mockResolvedValue({ ...LAURA, idCliente: 99, documento: '555' });
    crearVehiculo.mockRejectedValueOnce(new ErrorApi(0, 'SIN_CONEXION', 'Sin conexión.'));
    const { usuario, onRegistrado } = renderizar({ idTipoInicial: 3 });

    await buscarPropietario(usuario, '555');
    await usuario.type(screen.getByRole('textbox', { name: 'Nombres' }), 'Andrés');
    await usuario.type(screen.getByRole('textbox', { name: 'Apellidos' }), 'Gómez');
    await usuario.click(screen.getByRole('button', { name: 'Registrar vehículo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión.');

    await usuario.click(screen.getByRole('button', { name: 'Registrar vehículo' }));

    expect(crearCliente).toHaveBeenCalledTimes(1);
    expect(crearVehiculo).toHaveBeenLastCalledWith(expect.objectContaining({ idCliente: 99 }));
    expect(onRegistrado).toHaveBeenCalled();
  });
});
