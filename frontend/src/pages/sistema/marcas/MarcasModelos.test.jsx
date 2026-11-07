import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { crearMarca, crearModelo, listarMarcas, listarModelos } from '../../../api/catalogos.js';
import { ErrorApi } from '../../../api/cliente.js';
import ProveedorNotificaciones from '../../../context/ProveedorNotificaciones.jsx';
import SesionDePrueba from '../../../test/SesionDePrueba.jsx';
import MarcasModelos from './MarcasModelos.jsx';

vi.mock('../../../api/catalogos.js', () => ({
  listarMarcas: vi.fn(),
  listarModelos: vi.fn(),
  crearMarca: vi.fn(),
  crearModelo: vi.fn(),
}));

const MARCAS = [
  { idMarca: 1, nombre: 'Chevrolet' },
  { idMarca: 2, nombre: 'Kia' },
];
const MODELOS = [
  { idModelo: 10, idMarca: 1, nombre: 'Spark' },
  { idModelo: 11, idMarca: 1, nombre: 'Onix' },
];

function renderizar() {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <SesionDePrueba rol="DBA">
        <ProveedorNotificaciones>
          <MarcasModelos />
        </ProveedorNotificaciones>
      </SesionDePrueba>
    </MemoryRouter>,
  );
  return usuario;
}

beforeEach(() => {
  vi.clearAllMocks();
  listarMarcas.mockResolvedValue(MARCAS);
  listarModelos.mockResolvedValue(MODELOS);
});

describe('MarcasModelos', () => {
  it('muestra cada marca con sus modelos', async () => {
    renderizar();

    const tabla = await screen.findByRole('table', { name: 'Lista de marcas' });
    expect(within(tabla).getByText('Spark, Onix')).toBeInTheDocument();
    expect(within(within(tabla).getByText('Kia').closest('tr')).getByText('—')).toBeInTheDocument();
  });

  it('crea una marca, avisa y vuelve a cargar', async () => {
    crearMarca.mockResolvedValue({ idMarca: 3, nombre: 'Renault' });
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nueva marca' }));
    const modal = screen.getByRole('dialog', { name: 'Nueva marca' });

    await usuario.type(within(modal).getByLabelText('Nombre'), '  Renault ');
    await usuario.click(within(modal).getByRole('button', { name: 'Crear marca' }));

    expect(crearMarca).toHaveBeenCalledWith('Renault');
    expect(await screen.findByText('Marca Renault creada.')).toBeInTheDocument();
    await waitFor(() => expect(listarMarcas).toHaveBeenCalledTimes(2));
  });

  it('una marca repetida (409) se muestra junto al nombre', async () => {
    crearMarca.mockRejectedValue(
      new ErrorApi(409, 'REGLA_NEGOCIO', "Ya existe una marca llamada 'kia'."),
    );
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nueva marca' }));
    const modal = screen.getByRole('dialog', { name: 'Nueva marca' });

    await usuario.type(within(modal).getByLabelText('Nombre'), 'kia');
    await usuario.click(within(modal).getByRole('button', { name: 'Crear marca' }));

    expect(await within(modal).findByLabelText('Nombre')).toHaveAccessibleDescription(
      "Ya existe una marca llamada 'kia'.",
    );
  });

  it('un modelo nuevo pide la marca y el nombre', async () => {
    crearModelo.mockResolvedValue({ idModelo: 12, idMarca: 2, nombre: 'Picanto' });
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo modelo' }));
    const modal = screen.getByRole('dialog', { name: 'Nuevo modelo' });

    await usuario.click(within(modal).getByRole('button', { name: 'Crear modelo' }));
    expect(within(modal).getByLabelText('Marca')).toHaveAccessibleDescription('Elige la marca.');
    expect(within(modal).getByLabelText('Nombre')).toHaveAccessibleDescription(
      'Escribe el nombre.',
    );
    expect(crearModelo).not.toHaveBeenCalled();

    await usuario.selectOptions(within(modal).getByLabelText('Marca'), '2');
    await usuario.type(within(modal).getByLabelText('Nombre'), 'Picanto');
    await usuario.click(within(modal).getByRole('button', { name: 'Crear modelo' }));

    expect(crearModelo).toHaveBeenCalledWith(2, 'Picanto');
    expect(await screen.findByText('Modelo Kia Picanto creado.')).toBeInTheDocument();
  });
});
