import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Modal from './Modal.jsx';

/** Pantalla de ejemplo: un botón que abre un modal de confirmación. */
function Ejemplo({ alCerrar = () => {} }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => {
    alCerrar();
    setAbierto(false);
  };

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>
        Deshabilitar espacio
      </button>
      <Modal
        abierto={abierto}
        titulo="¿Deshabilitar el espacio 2?"
        onCerrar={cerrar}
        acciones={
          <>
            <button type="button" onClick={cerrar}>
              Cancelar
            </button>
            <button type="button">Deshabilitar</button>
          </>
        }
      >
        <p>El vehículo que está adentro puede salir normalmente.</p>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('abre un diálogo con el título como nombre y enfoca el primer control', async () => {
    const usuario = userEvent.setup();
    render(<Ejemplo />);

    await usuario.click(screen.getByRole('button', { name: 'Deshabilitar espacio' }));

    expect(screen.getByRole('dialog', { name: '¿Deshabilitar el espacio 2?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('se cierra con Escape y devuelve el foco al botón que lo abrió', async () => {
    const usuario = userEvent.setup();
    const alCerrar = vi.fn();
    render(<Ejemplo alCerrar={alCerrar} />);
    const disparador = screen.getByRole('button', { name: 'Deshabilitar espacio' });

    await usuario.click(disparador);
    await usuario.keyboard('{Escape}');

    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(disparador).toHaveFocus();
  });

  it('Tab no sale del diálogo', async () => {
    const usuario = userEvent.setup();
    render(<Ejemplo />);
    await usuario.click(screen.getByRole('button', { name: 'Deshabilitar espacio' }));

    // Cancelar → Deshabilitar → Cerrar (X) → de vuelta a Cancelar.
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Deshabilitar' })).toHaveFocus();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('no dibuja nada cuando está cerrado', () => {
    render(<Ejemplo />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
