import { Navigate, Route, Routes } from 'react-router';
import Layout from './components/layout/Layout.jsx';
import RequiereRol from './components/sesion/RequiereRol.jsx';
import RutaProtegida from './components/sesion/RutaProtegida.jsx';
import Entrada from './pages/entrada/Entrada.jsx';
import Espacios from './pages/espacios/Espacios.jsx';
import Historial from './pages/historial/Historial.jsx';
import IniciarSesion from './pages/login/IniciarSesion.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';
import Reportes from './pages/reportes/Reportes.jsx';
import Liquidacion from './pages/salida/Liquidacion.jsx';
import Salida from './pages/salida/Salida.jsx';
import MarcasModelos from './pages/sistema/marcas/MarcasModelos.jsx';
import Sistema from './pages/sistema/Sistema.jsx';
import Usuarios from './pages/sistema/usuarios/Usuarios.jsx';
import Zonas from './pages/sistema/zonas/Zonas.jsx';
import Tablero from './pages/tablero/Tablero.jsx';
import Vehiculos from './pages/vehiculos/Vehiculos.jsx';

// Rutas de la aplicación. /login es la única pública; todas las demás exigen sesión
// (RutaProtegida) y comparten el Layout (menú + contenido). Las que son solo para algunos roles
// van dentro de RequiereRol. Cada pantalla vive en su propio archivo de src/pages/.
function App() {
  return (
    <Routes>
      <Route path="login" element={<IniciarSesion />} />
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<Tablero />} />
          <Route path="entrada" element={<Entrada />} />
          <Route path="salida" element={<Salida />} />
          <Route path="salida/:idRegistro" element={<Liquidacion />} />
          <Route path="vehiculos" element={<Vehiculos />} />
          <Route path="historial" element={<Historial />} />
          <Route
            path="reportes"
            element={
              <RequiereRol
                minimo="ADMINISTRADOR"
                mensaje="Solo los administradores pueden ver los reportes."
              >
                <Reportes />
              </RequiereRol>
            }
          />
          <Route path="espacios" element={<Espacios />} />
          <Route
            path="sistema"
            element={
              <RequiereRol minimo="DBA" mensaje="Solo el DBA puede administrar el sistema.">
                <Sistema />
              </RequiereRol>
            }
          >
            <Route index element={<Navigate to="usuarios" replace />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="zonas" element={<Zonas />} />
            <Route path="marcas" element={<MarcasModelos />} />
          </Route>
          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
