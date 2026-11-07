import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Paginacion from './Paginacion.jsx';

function renderizar(pagina, totalPaginas) {
  const onCambiar = vi.fn();
  render(
    <Paginacion
      etiqueta="Páginas"
      pagina={pagina}
      totalPaginas={totalPaginas}
      onCambiar={onCambiar}
    />,
  );
  return { onCambiar, usuario: userEvent.setup() };
}

describe('Paginacion', () => {
  it('en la primera página, "Anterior" está deshabilitado', async () => {
    const { onCambiar, usuario } = renderizar(1, 3);

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onCambiar).toHaveBeenCalledWith(2);
  });

  it('en la última, "Siguiente" está deshabilitado', async () => {
    const { onCambiar, usuario } = renderizar(3, 3);

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onCambiar).toHaveBeenCalledWith(2);
  });

  it('con una sola página no se muestra', () => {
    renderizar(1, 1);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
