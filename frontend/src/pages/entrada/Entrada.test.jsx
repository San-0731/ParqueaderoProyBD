import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { listarMarcas, listarModelos, listarTiposVehiculo } from '../../api/catalogos.js';
import { ErrorApi } from '../../api/cliente.js';
import { listarClientes, obtenerCliente } from '../../api/clientes.js';
import { listarEspacios } from '../../api/espacios.js';
import { listarActivos, registrarEntrada } from '../../api/registros.js';
import { listarVehiculos } from '../../api/vehiculos.js';
import ProveedorNotificaciones from '../../context/ProveedorNotificaciones.jsx';
import Entrada from './Entrada.jsx';
import {
  ABC12D,
  ACTIVO_MVC054,
  ESPACIOS,
  KLM234,
  LAURA,
  MARCAS,
  MODELOS,
  TIPOS,
} from './datosPrueba.js';

// La API se simula: cada prueba decide qué responde el "backend".
vi.mock('../../api/catalogos.js', () => ({
  listarTiposVehiculo: vi.fn(),
  listarMarcas: vi.fn(),
  listarModelos: vi.fn(),
}));
vi.mock('../../api/espacios.js', () => ({ listarEspacios: vi.fn() }));
vi.mock('../../api/vehiculos.js', () => ({ listarVehiculos: vi.fn(), crearVehiculo: vi.fn() }));
vi.mock('../../api/clientes.js', () => ({
  obtenerCliente: vi.fn(),
  listarClientes: vi.fn(),
  crearCliente: vi.fn(),
}));
vi.mock('../../api/registros.js', () => ({ listarActivos: vi.fn(), registrarEntrada: vi.fn() }));

/** Muestra la URL actual para comprobar los parámetros y la navegación. */
function UbicacionActual() {
  const { pathname, search } = useLocation();
  return <p data-testid="ubicacion">{pathname + search}</p>;
}

async function renderizar(ruta = '/entrada') {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorNotificaciones>
        <Routes>
          <Route path="/entrada" element={<Entrada />} />
          <Route path="*" element={<p>Otra pantalla</p>} />
        </Routes>
        <UbicacionActual />
      </ProveedorNotificaciones>
    </MemoryRouter>,
  );
  await screen.findByRole('textbox', { name: 'Placa o código' });
  return usuario;
}

const campoPlaca = () => screen.getByRole('textbox', { name: 'Placa o código' });
const botonConfirmar = () => screen.getByRole('button', { name: 'Confirmar entrada' });
const paso2 = () => screen.getByRole('region', { name: 'Paso 2: Espacio' });
const resumen = () => screen.getByRole('complementary', { name: 'Resumen de la entrada' });

async function buscar(usuario, placa) {
  await usuario.clear(campoPlaca());
  await usuario.type(campoPlaca(), placa);
  await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
}

describe('Entrada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarTiposVehiculo.mockResolvedValue(TIPOS);
    listarMarcas.mockResolvedValue(MARCAS);
    listarModelos.mockResolvedValue(MODELOS);
    listarEspacios.mockResolvedValue(ESPACIOS);
    obtenerCliente.mockResolvedValue(LAURA);
    listarActivos.mockResolvedValue([]);
    listarVehiculos.mockImplementation(async ({ identificador }) =>
      [KLM234, ABC12D].filter((vehiculo) => vehiculo.identificador === identificador),
    );
  });

  it('al escribir, la placa se normaliza', async () => {
    const usuario = await renderizar();

    await usuario.type(campoPlaca(), 'klm-234');

    expect(campoPlaca()).toHaveValue('KLM234');
  });

  it('un vehículo existente muestra su tarjeta con tipo, marca y propietario', async () => {
    const usuario = await renderizar();

    await buscar(usuario, 'KLM234');

    expect(await screen.findByText('Mazda 3')).toBeInTheDocument();
    expect(screen.getByText('Laura Camila Pérez')).toBeInTheDocument();
    expect(within(resumen()).getByText('KLM 234')).toBeInTheDocument();
    expect(within(resumen()).getByText('Carro')).toBeInTheDocument();
  });

  it('solo ofrece los espacios libres del tipo del vehículo', async () => {
    const usuario = await renderizar();
    await buscar(usuario, 'KLM234');

    const opciones = await within(paso2()).findAllByRole('radio');
    expect(opciones.map((opcion) => opcion.getAttribute('aria-label'))).toEqual([
      'A1-01, piso 1',
      'A1-03, piso 1',
      'B2-01, piso 2',
    ]);
    expect(
      within(paso2()).getByRole('group', { name: 'Espacios libres para Carro' }),
    ).toBeVisible();
  });

  it('un vehículo inexistente abre el registro rápido con la placa buscada', async () => {
    const usuario = await renderizar();

    await buscar(usuario, 'klm-999');

    expect(await screen.findByText(/no está registrado/)).toHaveTextContent('KLM 999');
    expect(screen.getByRole('button', { name: 'Registrar vehículo' })).toBeInTheDocument();
    expect(paso2()).toHaveTextContent('Registra el vehículo para ver los espacios libres');
    expect(botonConfirmar()).toBeDisabled();
    expect(botonConfirmar()).toHaveAccessibleDescription(
      'Falta registrar el vehículo y elegir un espacio.',
    );

    await usuario.click(screen.getByRole('button', { name: 'Corregir placa' }));
    expect(campoPlaca()).toHaveFocus();
  });

  it('cambiar la placa después de buscar quita el resultado anterior', async () => {
    const usuario = await renderizar();
    await buscar(usuario, 'KLM999');
    await screen.findByRole('button', { name: 'Registrar vehículo' });

    await usuario.type(campoPlaca(), '8');

    expect(screen.queryByRole('button', { name: 'Registrar vehículo' })).not.toBeInTheDocument();
  });

  it('desde el tablero (?idEspacio=3) el espacio llega elegido', async () => {
    const usuario = await renderizar('/entrada?idEspacio=3');
    expect(within(resumen()).getByText('Elegido en el tablero')).toBeInTheDocument();

    await buscar(usuario, 'KLM234');

    expect(await within(paso2()).findByRole('radio', { name: 'A1-03, piso 1' })).toBeChecked();
    expect(botonConfirmar()).toBeEnabled();
  });

  it('si el espacio del tablero es de otro tipo, avisa y no lo elige', async () => {
    const usuario = await renderizar('/entrada?idEspacio=3');

    await buscar(usuario, 'ABC12D');

    expect(await within(paso2()).findByText(/es para Carro y este vehículo es Moto/)).toBeVisible();
    expect(within(paso2()).getByRole('radio', { name: 'M1-01, piso 1' })).not.toBeChecked();
    expect(botonConfirmar()).toBeDisabled();
  });

  it('si el vehículo ya está dentro, avisa con el enlace a la salida y no deja confirmar', async () => {
    listarActivos.mockResolvedValue([ACTIVO_MVC054]);
    const usuario = await renderizar();

    await buscar(usuario, 'KLM234');

    const aviso = await screen.findByText(
      /está en el espacio A1-02, piso 1 desde las 3:45\sp\.\sm\.$/,
    );
    expect(aviso).toBeVisible();
    expect(screen.getByRole('link', { name: 'Registrar salida' })).toHaveAttribute(
      'href',
      '/salida/28',
    );
    expect(within(paso2()).queryByRole('radio')).not.toBeInTheDocument();
    expect(botonConfirmar()).toBeDisabled();
    expect(botonConfirmar()).toHaveAccessibleDescription('El vehículo ya está dentro.');
  });

  it('al confirmar registra la entrada, avisa y deja el formulario listo para el siguiente', async () => {
    registrarEntrada.mockResolvedValue({
      idRegistro: 32,
      identificador: 'KLM234',
      idEspacio: 3,
      piso: '1',
      zona: 'A',
      numero: '03',
      entrada: '2026-11-06T15:45:00',
      estado: 'ACTIVO',
      pagos: [],
    });
    const usuario = await renderizar('/entrada?idEspacio=1');
    await buscar(usuario, 'KLM234');

    await usuario.click(await within(paso2()).findByRole('radio', { name: 'A1-03, piso 1' }));
    await usuario.click(botonConfirmar());

    expect(registrarEntrada).toHaveBeenCalledWith({ identificador: 'KLM234', idEspacio: 3 });
    expect(
      await screen.findByText(
        /Entrada registrada: KLM 234 en A1-03, piso 1, a las 3:45\sp\.\sm\.$/,
      ),
    ).toBeVisible();
    expect(campoPlaca()).toHaveValue('');
    expect(campoPlaca()).toHaveFocus();
    // React Router cambia la URL y la recarga corre un instante después: se espera con waitFor.
    await waitFor(() => expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/entrada$/));
    // Se recargan los espacios para el siguiente vehículo.
    await waitFor(() => expect(listarEspacios).toHaveBeenCalledTimes(2));
  });

  it('un 409 del backend se muestra con su mensaje junto al botón', async () => {
    registrarEntrada.mockRejectedValue(
      new ErrorApi(409, 'REGLA_NEGOCIO', 'El espacio ya está ocupado por otro vehículo.'),
    );
    const usuario = await renderizar('/entrada?idEspacio=3');
    await buscar(usuario, 'KLM234');
    await within(paso2()).findByRole('radio', { name: 'A1-03, piso 1' });

    await usuario.click(botonConfirmar());

    const alerta = await within(resumen()).findByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo registrar la entrada');
    expect(alerta).toHaveTextContent('El espacio ya está ocupado por otro vehículo.');
    await waitFor(() => expect(listarEspacios).toHaveBeenCalledTimes(2));
  });

  it('si la búsqueda falla muestra el error del servidor', async () => {
    listarVehiculos.mockRejectedValue(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = await renderizar();

    await buscar(usuario, 'KLM234');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );
  });

  it('una placa vacía no consulta y explica por qué', async () => {
    const usuario = await renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(campoPlaca()).toHaveAccessibleDescription(
      expect.stringContaining('El identificador (placa o código) del vehículo es obligatorio.'),
    );
    expect(listarVehiculos).not.toHaveBeenCalled();
  });

  it('si no cargan los espacios, muestra el error y "Reintentar" vuelve a cargar', async () => {
    listarEspacios
      .mockRejectedValueOnce(
        new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
      )
      .mockResolvedValue(ESPACIOS);
    const usuario = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/entrada']}>
        <ProveedorNotificaciones>
          <Routes>
            <Route path="/entrada" element={<Entrada />} />
          </Routes>
        </ProveedorNotificaciones>
      </MemoryRouter>,
    );

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo cargar la pantalla');
    expect(alerta).toHaveTextContent('No se pudo conectar con el servidor.');
    expect(screen.queryByRole('textbox', { name: 'Placa o código' })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('textbox', { name: 'Placa o código' })).toBeInTheDocument();
  });

  describe('propietario en el registro rápido', () => {
    const campoDocumento = () => screen.getByRole('textbox', { name: 'Documento del propietario' });

    async function abrirRegistroRapido() {
      const usuario = await renderizar();
      await buscar(usuario, 'KLM999');
      await screen.findByText(/no está registrado/);
      return usuario;
    }

    it('un documento vacío o con símbolos no consulta y explica por qué', async () => {
      const usuario = await abrirRegistroRapido();

      await usuario.click(screen.getByRole('button', { name: 'Buscar propietario' }));
      expect(campoDocumento()).toHaveAccessibleDescription(
        expect.stringContaining('El documento del cliente es obligatorio.'),
      );

      await usuario.type(campoDocumento(), '10#45');
      await usuario.click(screen.getByRole('button', { name: 'Buscar propietario' }));
      expect(campoDocumento()).toHaveAccessibleDescription(
        expect.stringContaining('El documento solo puede tener letras (A-Z) y números.'),
      );
      expect(listarClientes).not.toHaveBeenCalled();
    });

    it('Enter en el documento busca el propietario (sin enviar el formulario)', async () => {
      listarClientes.mockResolvedValue([LAURA]);
      const usuario = await abrirRegistroRapido();

      await usuario.type(campoDocumento(), '1.012.345.678{Enter}');

      expect(listarClientes).toHaveBeenCalledWith({ documento: '1012345678' });
      expect(await screen.findByText(/ya está registrado como propietario/)).toBeInTheDocument();
      expect(registrarEntrada).not.toHaveBeenCalled();
    });

    it('un documento que no existe pide los datos del propietario nuevo', async () => {
      listarClientes.mockResolvedValue([]);
      const usuario = await abrirRegistroRapido();

      await usuario.type(campoDocumento(), '99887766');
      await usuario.click(screen.getByRole('button', { name: 'Buscar propietario' }));

      expect(
        await screen.findByText(/No hay un propietario con el documento 99887766/),
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Nombres' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Apellidos' })).toBeInTheDocument();
    });

    it('si falla la búsqueda del propietario muestra el error del servidor', async () => {
      listarClientes.mockRejectedValue(
        new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
      );
      const usuario = await abrirRegistroRapido();

      await usuario.type(campoDocumento(), '1012345678');
      await usuario.click(screen.getByRole('button', { name: 'Buscar propietario' }));

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('No se pudo buscar el propietario');
      expect(alerta).toHaveTextContent('No se pudo conectar con el servidor.');
    });
  });

  it('el registro rápido continúa el flujo sin salir de la pantalla', async () => {
    listarClientes.mockResolvedValue([LAURA]);
    const { crearVehiculo } = await import('../../api/vehiculos.js');
    // El backend asigna el tipo según la placa: KLM999 es Carro (idTipo 3).
    crearVehiculo.mockImplementation(async (datos) => ({ idVehiculo: 60, idTipo: 3, ...datos }));
    const usuario = await renderizar('/entrada?idEspacio=3');

    await buscar(usuario, 'KLM999');
    // El tipo no se elige: sale de la placa.
    expect(await screen.findByText('Tipo de vehículo, según la placa')).toBeInTheDocument();
    await usuario.type(
      screen.getByRole('textbox', { name: 'Documento del propietario' }),
      '1012345678',
    );
    await usuario.click(screen.getByRole('button', { name: 'Buscar propietario' }));
    await screen.findByText(/ya está registrado como propietario/);
    await usuario.click(screen.getByRole('button', { name: 'Registrar vehículo' }));

    expect(await screen.findByText('Vehículo KLM 999 registrado.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cambiar vehículo' })).toBeInTheDocument();
    expect(within(paso2()).getByRole('radio', { name: 'A1-03, piso 1' })).toBeChecked();
    expect(botonConfirmar()).toBeEnabled();
  });
});
