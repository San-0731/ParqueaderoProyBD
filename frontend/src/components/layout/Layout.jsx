import { Outlet } from 'react-router';
import BarraNavegacion from './BarraNavegacion.jsx';

/**
 * Estructura común de todas las pantallas: enlace para saltar al contenido (teclado),
 * barra de navegación y el contenido de la ruta actual (<Outlet />).
 */
function Layout() {
  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-senal focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <BarraNavegacion />
      <main id="contenido" tabIndex={-1} className="outline-none lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
