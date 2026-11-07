import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNotificaciones } from './NotificacionesContext.js';
import ProveedorNotificaciones from './ProveedorNotificaciones.jsx';

/** Componente de prueba con dos botones que lanzan avisos. */
function Disparador() {
  const { notificarExito, notificarError } = useNotificaciones();
  return (
    <>
      <button type="button" onClick={() => notificarExito('Entrada registrada en el espacio 3.')}>
        Avisar éxito
      </button>
      <button type="button" onClick={() => notificarError('No se pudo conectar con el servidor.')}>
        Avisar error
      </button>
    </>
  );
}

function renderizar() {
  return render(
    <ProveedorNotificaciones>
      <Disparador />
    </ProveedorNotificaciones>,
  );
}

describe('ProveedorNotificaciones', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el aviso dentro de una región aria-live', async () => {
    renderizar();

    await userEvent.click(screen.getByRole('button', { name: 'Avisar éxito' }));

    const aviso = screen.getByText('Entrada registrada en el espacio 3.');
    expect(aviso.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });

  it('el aviso desaparece solo a los 5 segundos', () => {
    // Con temporizadores falsos de Vitest se usa fireEvent (síncrono): userEvent espera
    // internamente un setTimeout que Testing Library solo sabe adelantar con Jest.
    vi.useFakeTimers();
    renderizar();

    fireEvent.click(screen.getByRole('button', { name: 'Avisar error' }));
    expect(screen.getByText('No se pudo conectar con el servidor.')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4_999));
    expect(screen.getByText('No se pudo conectar con el servidor.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('No se pudo conectar con el servidor.')).not.toBeInTheDocument();
  });

  it('se puede cerrar antes con su botón', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Avisar éxito' }));

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByText('Entrada registrada en el espacio 3.')).not.toBeInTheDocument();
  });
});
