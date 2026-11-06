import { render, screen } from '@testing-library/react';
import Insignia from './Insignia.jsx';
import Placa from './Placa.jsx';

describe('Insignia', () => {
  it.each([
    ['libre', 'Libre', 'text-libre'],
    ['ocupado', 'Ocupado', 'text-ocupado'],
    ['deshabilitado', 'Deshabilitado', 'text-deshabilitado'],
  ])('el estado %s se muestra como "%s" con su color', (estado, texto, claseColor) => {
    render(<Insignia estado={estado} />);

    expect(screen.getByText(texto)).toHaveClass(claseColor);
  });

  it('acepta un texto propio con el color del estado', () => {
    render(<Insignia estado="libre">9 libres</Insignia>);

    expect(screen.getByText('9 libres')).toHaveClass('text-libre');
  });
});

describe('Placa', () => {
  it.each([
    ['KLM234', 'KLM 234'],
    ['ABC12D', 'ABC 12D'],
    ['WTU2024A0153', 'WTU2024A0153'],
  ])('muestra %s como %s', (identificador, texto) => {
    render(<Placa identificador={identificador} />);

    expect(screen.getByText(texto)).toBeInTheDocument();
  });
});
