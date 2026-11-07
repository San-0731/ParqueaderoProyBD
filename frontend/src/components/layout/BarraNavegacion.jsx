import {
  CarFront,
  ChartColumn,
  History,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import IndicadorServidor from './IndicadorServidor.jsx';

// Menú agrupado: "Operación" es lo que el operador usa todo el día; "Gestión", lo demás.
const GRUPOS = [
  {
    titulo: 'Operación',
    enlaces: [
      { ruta: '/', texto: 'Tablero', icono: LayoutGrid },
      { ruta: '/entrada', texto: 'Entrada', icono: LogIn },
      { ruta: '/salida', texto: 'Salida', icono: LogOut },
    ],
  },
  {
    titulo: 'Gestión',
    enlaces: [
      { ruta: '/vehiculos', texto: 'Vehículos', icono: CarFront },
      { ruta: '/historial', texto: 'Historial', icono: History },
      { ruta: '/reportes', texto: 'Reportes', icono: ChartColumn },
      { ruta: '/espacios', texto: 'Espacios', icono: SlidersHorizontal },
    ],
  },
];

// Sección activa: fondo un poco más claro y línea amarilla a la izquierda (pintura vial).
function clasesEnlace({ isActive }) {
  const base = 'relative flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium';
  return isActive
    ? `${base} bg-asfalto-claro text-white before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-placa`
    : `${base} text-white/80 hover:bg-asfalto-claro hover:text-white`;
}

/**
 * Barra de navegación. Es UN solo menú: en escritorio (≥ 1024 px) es la barra lateral fija;
 * en celular y tablet vertical se abre y se cierra con el botón "Menú".
 */
function BarraNavegacion() {
  const { pathname } = useLocation();
  // Se guarda la ruta en la que se abrió el menú: al navegar a otra, queda cerrado solo,
  // sin necesidad de un efecto.
  const [abiertoEn, setAbiertoEn] = useState(null);
  const abierto = abiertoEn === pathname;

  return (
    <header
      className="superficie-oscura bg-asfalto text-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col print:hidden"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && abierto) {
          setAbiertoEn(null);
        }
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 lg:flex-col lg:items-start lg:gap-3 lg:px-5 lg:pt-6 lg:pb-2">
        <NavLink to="/" className="flex items-center gap-2.5 rounded-md">
          {/* La "P" del aviso de parqueadero. */}
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-md bg-senal font-condensada text-2xl leading-none font-bold"
          >
            P
          </span>
          <span className="font-condensada text-2xl leading-none font-semibold">Parqueadero</span>
        </NavLink>
        <IndicadorServidor className="ml-auto lg:ml-0" />
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls="menu-principal"
          onClick={() => setAbiertoEn(abierto ? null : pathname)}
          className="grid size-11 place-items-center rounded-lg hover:bg-asfalto-claro lg:hidden"
        >
          {abierto ? (
            <X aria-hidden="true" className="size-6" />
          ) : (
            <Menu aria-hidden="true" className="size-6" />
          )}
          <span className="sr-only">Menú</span>
        </button>
      </div>

      <nav
        id="menu-principal"
        aria-label="Principal"
        className={`${abierto ? 'block' : 'hidden'} border-t border-white/10 px-3 pb-4 lg:block lg:flex-1 lg:overflow-y-auto lg:border-0`}
      >
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="mt-4">
            <p className="px-3 pb-1.5 text-sm font-medium text-white/60">{grupo.titulo}</p>
            <ul className="space-y-1">
              {grupo.enlaces.map(({ ruta, texto, icono: Icono }) => (
                <li key={ruta}>
                  {/* end en "/": el Tablero solo queda activo en la raíz, no en todas las rutas. */}
                  <NavLink to={ruta} end={ruta === '/'} className={clasesEnlace}>
                    <Icono aria-hidden="true" className="size-5 shrink-0" />
                    {texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </header>
  );
}

export default BarraNavegacion;
