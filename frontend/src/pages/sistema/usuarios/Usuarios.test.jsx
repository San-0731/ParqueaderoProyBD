import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ErrorApi } from '../../../api/cliente.js';
import {
  actualizarUsuario,
  cambiarClaveUsuario,
  crearUsuario,
  listarUsuarios,
} from '../../../api/usuarios.js';
import ProveedorNotificaciones from '../../../context/ProveedorNotificaciones.jsx';
import SesionDePrueba from '../../../test/SesionDePrueba.jsx';
import Usuarios from './Usuarios.jsx';

vi.mock('../../../api/usuarios.js', () => ({
  listarUsuarios: vi.fn(),
  crearUsuario: vi.fn(),
  actualizarUsuario: vi.fn(),
  cambiarClaveUsuario: vi.fn(),
}));

// idUsuario 1 es el DBA de SesionDePrueba (quien tiene la sesión abierta).
const USUARIOS = [
  {
    idUsuario: 1,
    nombreUsuario: 'dba',
    nombreCompleto: 'Administrador de la base',
    rol: 'DBA',
    activo: true,
  },
  {
    idUsuario: 7,
    nombreUsuario: 'ana.perez',
    nombreCompleto: 'Ana Pérez',
    rol: 'OPERADOR',
    activo: true,
  },
  {
    idUsuario: 8,
    nombreUsuario: 'beto',
    nombreCompleto: 'Beto Gómez',
    rol: 'ADMINISTRADOR',
    activo: false,
  },
];

function renderizar() {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <SesionDePrueba rol="DBA">
        <ProveedorNotificaciones>
          <Usuarios />
        </ProveedorNotificaciones>
      </SesionDePrueba>
    </MemoryRouter>,
  );
  return usuario;
}

const fila = (nombreUsuario) =>
  within(screen.getByRole('table', { name: 'Lista de usuarios' }))
    .getByText(nombreUsuario)
    .closest('tr');

beforeEach(() => {
  vi.clearAllMocks();
  listarUsuarios.mockResolvedValue(USUARIOS);
});

describe('Usuarios', () => {
  it('lista los usuarios con su rol, su estado y quién es uno mismo', async () => {
    renderizar();

    await screen.findByRole('table', { name: 'Lista de usuarios' });
    expect(within(fila('dba')).getByText('(tú)')).toBeInTheDocument();
    expect(within(fila('ana.perez')).getByText('Operador')).toBeInTheDocument();
    expect(within(fila('ana.perez')).getByText('Activo')).toBeInTheDocument();
    expect(within(fila('beto')).getByText('Administrador')).toBeInTheDocument();
    expect(within(fila('beto')).getByText('Desactivado')).toBeInTheDocument();
  });

  it('"Nuevo usuario" valida los campos antes de enviar', async () => {
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
    const modal = screen.getByRole('dialog', { name: 'Nuevo usuario' });

    await usuario.type(within(modal).getByLabelText('Nombre de usuario'), 'Ana Pérez');
    await usuario.type(within(modal).getByLabelText('Contraseña inicial'), 'corta');
    await usuario.click(within(modal).getByRole('button', { name: 'Crear usuario' }));

    expect(within(modal).getByLabelText('Nombre de usuario')).toHaveAccessibleDescription(
      /De 3 a 30 caracteres/,
    );
    expect(within(modal).getByLabelText('Nombre completo')).toHaveAccessibleDescription(
      'El nombre completo es obligatorio.',
    );
    expect(within(modal).getByLabelText('Rol')).toHaveAccessibleDescription(/Elige un rol\./);
    expect(within(modal).getByLabelText('Contraseña inicial')).toHaveAccessibleDescription(
      /entre 8 y 100 caracteres/,
    );
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  it('crea un usuario, avisa y vuelve a cargar la lista', async () => {
    crearUsuario.mockResolvedValue({
      idUsuario: 9,
      nombreUsuario: 'carla',
      nombreCompleto: 'Carla Díaz',
      rol: 'ADMINISTRADOR',
      activo: true,
    });
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
    const modal = screen.getByRole('dialog', { name: 'Nuevo usuario' });

    await usuario.type(within(modal).getByLabelText('Nombre de usuario'), ' carla ');
    await usuario.type(within(modal).getByLabelText('Nombre completo'), ' Carla Díaz ');
    await usuario.selectOptions(within(modal).getByLabelText('Rol'), 'ADMINISTRADOR');
    await usuario.type(within(modal).getByLabelText('Contraseña inicial'), 'clave-inicial-1');
    await usuario.click(within(modal).getByRole('button', { name: 'Crear usuario' }));

    expect(crearUsuario).toHaveBeenCalledWith({
      nombreUsuario: 'carla',
      nombreCompleto: 'Carla Díaz',
      rol: 'ADMINISTRADOR',
      clave: 'clave-inicial-1',
    });
    expect(
      await screen.findByText('Usuario carla creado. Entrégale su contraseña inicial.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(listarUsuarios).toHaveBeenCalledTimes(2));
  });

  it('un nombre de usuario repetido (409) se muestra junto a su campo', async () => {
    crearUsuario.mockRejectedValue(
      new ErrorApi(409, 'REGLA_NEGOCIO', "Ya existe un usuario llamado 'beto'."),
    );
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
    const modal = screen.getByRole('dialog', { name: 'Nuevo usuario' });

    await usuario.type(within(modal).getByLabelText('Nombre de usuario'), 'beto');
    await usuario.type(within(modal).getByLabelText('Nombre completo'), 'Otro Beto');
    await usuario.selectOptions(within(modal).getByLabelText('Rol'), 'OPERADOR');
    await usuario.type(within(modal).getByLabelText('Contraseña inicial'), 'clave-inicial-1');
    await usuario.click(within(modal).getByRole('button', { name: 'Crear usuario' }));

    expect(await within(modal).findByLabelText('Nombre de usuario')).toHaveAccessibleDescription(
      /Ya existe un usuario llamado 'beto'\./,
    );
  });

  it('editar cambia el nombre, el rol y si puede iniciar sesión (el usuario no se cambia)', async () => {
    actualizarUsuario.mockResolvedValue({ ...USUARIOS[1], rol: 'ADMINISTRADOR', activo: false });
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Editar ana.perez' }));
    const modal = screen.getByRole('dialog', { name: 'Editar el usuario ana.perez' });

    expect(within(modal).queryByLabelText('Nombre de usuario')).not.toBeInTheDocument();
    expect(within(modal).getByLabelText('Nombre completo')).toHaveValue('Ana Pérez');
    await usuario.selectOptions(within(modal).getByLabelText('Rol'), 'ADMINISTRADOR');
    await usuario.click(within(modal).getByRole('switch', { name: 'Puede iniciar sesión' }));
    await usuario.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizarUsuario).toHaveBeenCalledWith(7, {
      nombreCompleto: 'Ana Pérez',
      rol: 'ADMINISTRADOR',
      activo: false,
    });
    expect(await screen.findByText('Usuario ana.perez actualizado.')).toBeInTheDocument();
  });

  it('al editarse a sí mismo avisa que quitarse el rol DBA cierra su sesión', async () => {
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Editar dba' }));
    const modal = screen.getByRole('dialog', { name: 'Editar el usuario dba' });

    expect(within(modal).queryByText(/se cerrará tu sesión/)).not.toBeInTheDocument();
    await usuario.selectOptions(within(modal).getByLabelText('Rol'), 'ADMINISTRADOR');

    expect(within(modal).getByText(/se cerrará tu sesión/)).toBeInTheDocument();
  });

  it('si el backend rechaza el cambio (último DBA), muestra su mensaje en el modal', async () => {
    actualizarUsuario.mockRejectedValue(
      new ErrorApi(409, 'REGLA_NEGOCIO', 'Debe quedar al menos un DBA activo.'),
    );
    const usuario = renderizar();
    await usuario.click(await screen.findByRole('button', { name: 'Editar dba' }));
    const modal = screen.getByRole('dialog', { name: 'Editar el usuario dba' });

    await usuario.click(within(modal).getByRole('switch', { name: 'Puede iniciar sesión' }));
    await usuario.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent(
      'Debe quedar al menos un DBA activo.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cambiar la contraseña valida el largo, la envía y avisa', async () => {
    cambiarClaveUsuario.mockResolvedValue(null);
    const usuario = renderizar();
    await usuario.click(
      await screen.findByRole('button', { name: 'Cambiar la contraseña de ana.perez' }),
    );
    const modal = screen.getByRole('dialog', { name: 'Cambiar la contraseña de ana.perez' });
    expect(within(modal).getByText(/Se cerrarán sus sesiones abiertas/)).toBeInTheDocument();

    await usuario.type(within(modal).getByLabelText('Contraseña nueva'), '1234');
    await usuario.click(within(modal).getByRole('button', { name: 'Cambiar contraseña' }));
    expect(within(modal).getByLabelText('Contraseña nueva')).toHaveAccessibleDescription(
      /entre 8 y 100 caracteres/,
    );
    expect(cambiarClaveUsuario).not.toHaveBeenCalled();

    await usuario.clear(within(modal).getByLabelText('Contraseña nueva'));
    await usuario.type(within(modal).getByLabelText('Contraseña nueva'), 'clave-nueva-123');
    await usuario.click(within(modal).getByRole('button', { name: 'Cambiar contraseña' }));

    expect(cambiarClaveUsuario).toHaveBeenCalledWith(7, 'clave-nueva-123');
    expect(await screen.findByText('Contraseña de ana.perez cambiada.')).toBeInTheDocument();
  });

  it('si falla la carga, "Reintentar" vuelve a consultar', async () => {
    listarUsuarios.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table', { name: 'Lista de usuarios' })).toBeInTheDocument();
  });
});
