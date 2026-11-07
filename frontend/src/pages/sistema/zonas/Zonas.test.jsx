import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { listarTiposVehiculo } from '../../../api/catalogos.js';
import { ErrorApi } from '../../../api/cliente.js';
import { agregarEspaciosAZona, crearZona, listarZonas } from '../../../api/zonas.js';
import ProveedorNotificaciones from '../../../context/ProveedorNotificaciones.jsx';
import SesionDePrueba from '../../../test/SesionDePrueba.jsx';
import Zonas from './Zonas.jsx';

vi.mock('../../../api/zonas.js', () => ({
  listarZonas: vi.fn(),
  crearZona: vi.fn(),
  agregarEspaciosAZona: vi.fn(),
}));
vi.mock('../../../api/catalogos.js', () => ({ listarTiposVehiculo: vi.fn() }));

const ZONAS = [
  {
    idZona: 1,
    piso: '1',
    letra: 'A',
    idTipo: 3,
    tipoVehiculo: 'Carro',
    espacios: 8,
    ultimoNumero: '08',
  },
  {
    idZona: 4,
    piso: '2',
    letra: 'C',
    idTipo: 4,
    tipoVehiculo: 'Camión',
    espacios: 2,
    ultimoNumero: '02',
  },
  {
    idZona: 7,
    piso: '2',
    letra: 'Z',
    idTipo: 1,
    tipoVehiculo: 'Moto',
    espacios: 99,
    ultimoNumero: '99',
  },
];
const TIPOS = [
  { idTipo: 1, nombre: 'Moto' },
  { idTipo: 3, nombre: 'Carro' },
  { idTipo: 4, nombre: 'Camión' },
];

function renderizar() {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <SesionDePrueba rol="DBA">
        <ProveedorNotificaciones>
          <Zonas />
        </ProveedorNotificaciones>
      </SesionDePrueba>
    </MemoryRouter>,
  );
  return usuario;
}

const fila = (nombre) =>
  within(screen.getByRole('table', { name: 'Lista de zonas' }))
    .getByText(nombre)
    .closest('tr');

beforeEach(() => {
  vi.clearAllMocks();
  listarZonas.mockResolvedValue(ZONAS);
  listarTiposVehiculo.mockResolvedValue(TIPOS);
});

describe('Zonas', () => {
  it('lista las zonas con su nombre, tipo visible y espacios', async () => {
    renderizar();

    await screen.findByRole('table', { name: 'Lista de zonas' });
    expect(within(fila('A1')).getByText('8 (01 a 08)')).toBeInTheDocument();
    expect(within(fila('C2')).getByText('Camión de carga pesada')).toBeInTheDocument();
    // Una zona llena no admite más espacios.
    expect(screen.getByRole('button', { name: 'Agregar espacios a la zona Z2' })).toBeDisabled();
  });

  it('crea una zona en un piso nuevo y avisa que aparece el piso', async () => {
    crearZona.mockResolvedValue({
      idZona: 9,
      piso: '3',
      letra: 'D',
      idTipo: 1,
      tipoVehiculo: 'Moto',
      espacios: 0,
      ultimoNumero: null,
    });
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nueva zona' }));
    const modal = screen.getByRole('dialog', { name: 'Nueva zona' });

    await usuario.type(within(modal).getByLabelText('Piso'), '03');
    await usuario.type(within(modal).getByLabelText('Letra'), 'd');
    await usuario.selectOptions(within(modal).getByLabelText('Tipo de vehículo'), '1');
    expect(within(modal).getByRole('status')).toHaveTextContent(
      'Se creará la zona D3, sin espacios. El piso 3 todavía no existe: aparecerá con esta zona.',
    );
    await usuario.click(within(modal).getByRole('button', { name: 'Crear zona' }));

    expect(crearZona).toHaveBeenCalledWith({ piso: '3', letra: 'D', idTipo: 1 });
    expect(
      await screen.findByText('Zona D3 creada: es la primera del piso 3. Ahora agrégale espacios.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(listarZonas).toHaveBeenCalledTimes(2));
  });

  it('en un piso que ya existe no habla de piso nuevo, y valida los campos', async () => {
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nueva zona' }));
    const modal = screen.getByRole('dialog', { name: 'Nueva zona' });

    await usuario.click(within(modal).getByRole('button', { name: 'Crear zona' }));
    expect(within(modal).getByLabelText('Piso')).toHaveAccessibleDescription(/del 1 al 99/);
    expect(within(modal).getByLabelText('Letra')).toHaveAccessibleDescription(/sin Ñ/);
    expect(crearZona).not.toHaveBeenCalled();

    await usuario.type(within(modal).getByLabelText('Piso'), '2');
    await usuario.type(within(modal).getByLabelText('Letra'), 'B');
    expect(within(modal).getByRole('status')).toHaveTextContent('Se creará la zona B2');
    expect(within(modal).getByRole('status')).not.toHaveTextContent('todavía no existe');
  });

  it('una zona repetida muestra el mensaje del backend en el modal', async () => {
    crearZona.mockRejectedValue(
      new ErrorApi(409, 'REGLA_NEGOCIO', 'Ya existe una zona con esa letra en ese piso.'),
    );
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nueva zona' }));
    const modal = screen.getByRole('dialog', { name: 'Nueva zona' });

    await usuario.type(within(modal).getByLabelText('Piso'), '1');
    await usuario.type(within(modal).getByLabelText('Letra'), 'A');
    await usuario.selectOptions(within(modal).getByLabelText('Tipo de vehículo'), '3');
    await usuario.click(within(modal).getByRole('button', { name: 'Crear zona' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent(
      'Ya existe una zona con esa letra en ese piso.',
    );
  });

  it('agrega espacios con los números siguientes y muestra cuáles se crearon', async () => {
    agregarEspaciosAZona.mockResolvedValue([
      { idEspacio: 30, piso: '1', zona: 'A', numero: '09' },
      { idEspacio: 31, piso: '1', zona: 'A', numero: '10' },
      { idEspacio: 32, piso: '1', zona: 'A', numero: '11' },
    ]);
    const usuario = renderizar();
    await usuario.click(
      await screen.findByRole('button', { name: 'Agregar espacios a la zona A1' }),
    );
    const modal = screen.getByRole('dialog', { name: 'Agregar espacios a la zona A1' });
    expect(within(modal).getByText(/Tiene 8 espacios \(01 a 08\)\./)).toBeInTheDocument();

    const cantidad = within(modal).getByLabelText('Cantidad de espacios');
    await usuario.clear(cantidad);
    await usuario.type(cantidad, '3');
    expect(within(modal).getByRole('status')).toHaveTextContent('A1-09 a A1-11');
    await usuario.click(within(modal).getByRole('button', { name: 'Agregar espacios' }));

    expect(agregarEspaciosAZona).toHaveBeenCalledWith(1, 3);
    expect(
      await screen.findByText('Se agregaron 3 espacios a la zona A1: A1-09 a A1-11.'),
    ).toBeInTheDocument();
  });

  it('no deja pedir más espacios de los que caben', async () => {
    const usuario = renderizar();
    await usuario.click(
      await screen.findByRole('button', { name: 'Agregar espacios a la zona C2' }),
    );
    const modal = screen.getByRole('dialog', { name: 'Agregar espacios a la zona C2' });
    const cantidad = within(modal).getByLabelText('Cantidad de espacios');

    await usuario.clear(cantidad);
    await usuario.type(cantidad, '98');
    await usuario.click(within(modal).getByRole('button', { name: 'Agregar espacios' }));

    expect(cantidad).toHaveAccessibleDescription(/solo le caben 97 espacios más/);
    expect(agregarEspaciosAZona).not.toHaveBeenCalled();
  });
});
