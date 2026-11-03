import { render, screen } from '@testing-library/react';
import App from './App.jsx';

// Prueba mínima: confirma que Vitest, jsdom y Testing Library están bien configurados.
describe('App', () => {
  it('muestra el título del sistema', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sistema de Parqueadero' }),
    ).toBeInTheDocument();
  });
});
