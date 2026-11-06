import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// Fuentes incluidas en el proyecto (funcionan sin internet). Solo el subconjunto latino,
// que trae las tildes y la ñ.
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import './index.css';
import App from './App.jsx';
import ProveedorNotificaciones from './context/ProveedorNotificaciones.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorNotificaciones>
        <App />
      </ProveedorNotificaciones>
    </BrowserRouter>
  </StrictMode>,
);
