import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { consultarAuditoria } from '../../api/auditoria.js';
import { ErrorApi } from '../../api/cliente.js';
import SesionDePrueba from '../../test/SesionDePrueba.jsx';
import Auditoria from './Auditoria.jsx';
import { AUDITORIA } from './datosPrueba.js';

vi.mock('../../api/auditoria.js', () => ({ consultarAuditoria: vi.fn() }));

function renderizar(rol = 'ADMINISTRADOR') {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <SesionDePrueba rol={rol}>
        <Auditoria />
      </SesionDePrueba>
    </MemoryRouter>,
  );
  return usuario;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 7, 12, 0));
  consultarAuditoria.mockResolvedValue(AUDITORIA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Auditoria', () => {
  it('muestra quién hizo cada cambio, qué hizo y qué cambió', async () => {
    renderizar();

    const tabla = await screen.findByRole('table', { name: 'Cambios auditados' });
    expect(screen.getByText('5 cambios.')).toBeInTheDocument();
    const salida = within(tabla).getByText('Registró una salida').closest('tr');
    expect(within(salida).getByText('Ana Operadora')).toBeInTheDocument();
    expect(within(salida).getByText('Operador · ana')).toBeInTheDocument();
    expect(within(salida).getByText('KLM 234')).toBeInTheDocument();
    expect(within(salida).getByText('$ 10.000')).toBeInTheDocument();
    expect(within(salida).getByText('ACTIVO')).toBeInTheDocument();
    expect(within(salida).getByText('PAGO')).toBeInTheDocument();
    const vehiculo = within(tabla).getByText('Registró un vehículo').closest('tr');
    expect(within(vehiculo).getByText('Camión de carga pesada')).toBeInTheDocument();
  });

  it('empieza con los últimos 7 días y consulta de nuevo al cambiar los filtros', async () => {
    const usuario = renderizar();
    await screen.findByRole('table', { name: 'Cambios auditados' });

    expect(consultarAuditoria).toHaveBeenCalledWith({
      desde: '2026-11-01',
      hasta: '2026-11-07',
      tabla: '',
    });

    await usuario.selectOptions(screen.getByLabelText('Sección'), 'pago');
    await waitFor(() =>
      expect(consultarAuditoria).toHaveBeenLastCalledWith({
        desde: '2026-11-01',
        hasta: '2026-11-07',
        tabla: 'pago',
      }),
    );

    await usuario.click(screen.getByRole('button', { name: 'Hoy' }));
    await waitFor(() =>
      expect(consultarAuditoria).toHaveBeenLastCalledWith({
        desde: '2026-11-07',
        hasta: '2026-11-07',
        tabla: 'pago',
      }),
    );
  });

  it('el administrador lee que ve a los operadores; el DBA, a todos', async () => {
    renderizar('ADMINISTRADOR');
    expect(
      await screen.findByText('Quién cambió qué y cuándo entre los operadores.'),
    ).toBeInTheDocument();
  });

  it('al DBA le aclara que lo suyo no se audita', async () => {
    renderizar('DBA');
    expect(await screen.findByText(/Lo que hace el DBA no se audita\./)).toBeInTheDocument();
  });

  it('sin cambios lo dice, y un error se puede reintentar', async () => {
    consultarAuditoria.mockResolvedValueOnce([]);
    renderizar();
    expect(await screen.findByText('No hay cambios en este rango')).toBeInTheDocument();
  });

  it('si falla la carga, "Reintentar" vuelve a consultar', async () => {
    consultarAuditoria.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor.'),
    );
    const usuario = renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table', { name: 'Cambios auditados' })).toBeInTheDocument();
  });
});
