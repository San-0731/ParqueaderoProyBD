import { UsersRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';

/** Secciones de la pestaña Sistema (rutas hijas de /sistema). */
const SECCIONES = [{ ruta: 'usuarios', texto: 'Usuarios', icono: UsersRound }];

/** Sección activa: texto azul y línea abajo, como una pestaña. */
function clasesPestana({ isActive }) {
  const base =
    '-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 font-semibold transition-colors';
  return isActive
    ? `${base} border-senal text-senal`
    : `${base} border-transparent text-tenue hover:text-asfalto`;
}

/**
 * Pestaña Sistema, exclusiva del DBA (la protege RequiereRol en App.jsx y el backend responde
 * 403 a los demás roles). Arriba van las secciones como pestañas y abajo la sección elegida.
 */
function Sistema() {
  return (
    <>
      <EncabezadoPagina
        titulo="Sistema"
        descripcion="Administración que solo hace el DBA: usuarios, zonas, espacios, marcas y modelos."
      />
      <nav
        aria-label="Secciones del sistema"
        className="mb-6 flex flex-wrap gap-1 border-b border-borde"
      >
        {SECCIONES.map(({ ruta, texto, icono: Icono }) => (
          <NavLink key={ruta} to={ruta} className={clasesPestana}>
            <Icono aria-hidden="true" className="size-5" />
            {texto}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}

export default Sistema;
