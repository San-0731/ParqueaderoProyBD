import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Boton from './Boton.jsx';

describe('Boton', () => {
  it('es type="button" por defecto, para no enviar formularios sin querer', () => {
    render(<Boton>Actualizar</Boton>);

    expect(screen.getByRole('button', { name: 'Actualizar' })).toHaveAttribute('type', 'button');
  });

  it('ejecuta el clic cuando no está cargando', async () => {
    const alHacerClic = vi.fn();
    render(<Boton onClick={alHacerClic}>Confirmar entrada</Boton>);

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }));

    expect(alHacerClic).toHaveBeenCalledTimes(1);
  });

  it('queda deshabilitado mientras carga y no ejecuta el clic', async () => {
    const alHacerClic = vi.fn();
    render(
      <Boton cargando onClick={alHacerClic}>
        Confirmar entrada
      </Boton>,
    );

    const boton = screen.getByRole('button', { name: 'Confirmar entrada' });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(boton);
    expect(alHacerClic).not.toHaveBeenCalled();
  });
});
