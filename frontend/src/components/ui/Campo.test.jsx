import { render, screen } from '@testing-library/react';
import Campo from './Campo.jsx';
import Selector from './Selector.jsx';

describe('Campo', () => {
  it('asocia la etiqueta con el campo', () => {
    render(<Campo etiqueta="Placa o código" />);

    expect(screen.getByLabelText('Placa o código')).toBeInTheDocument();
  });

  it('muestra el error y lo asocia al campo con aria-describedby', () => {
    render(
      <Campo
        etiqueta="Placa o código"
        ayuda="Sin espacios ni guiones."
        error="El identificador (placa o código) del vehículo es obligatorio."
      />,
    );

    const campo = screen.getByLabelText('Placa o código');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription(
      'Sin espacios ni guiones. El identificador (placa o código) del vehículo es obligatorio.',
    );
    expect(
      screen.getByText('El identificador (placa o código) del vehículo es obligatorio.'),
    ).toBeVisible();
  });

  it('sin error no marca el campo como inválido', () => {
    render(<Campo etiqueta="Color" ayuda="Opcional." />);

    const campo = screen.getByLabelText('Color');
    expect(campo).not.toHaveAttribute('aria-invalid');
    expect(campo).toHaveAccessibleDescription('Opcional.');
  });
});

describe('Selector', () => {
  it('muestra las opciones y el error asociado', () => {
    render(
      <Selector
        etiqueta="Método de pago"
        placeholder="Elige un método"
        opciones={[
          { valor: 1, texto: 'PSE' },
          { valor: 4, texto: 'Efectivo' },
        ]}
        error="El método de pago es obligatorio."
        defaultValue=""
      />,
    );

    const selector = screen.getByLabelText('Método de pago');
    expect(screen.getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Elige un método',
      'PSE',
      'Efectivo',
    ]);
    expect(selector).toHaveAccessibleDescription('El método de pago es obligatorio.');
  });
});
