import { Route, Routes } from 'react-router';
import Layout from './components/layout/Layout.jsx';
import Entrada from './pages/entrada/Entrada.jsx';
import Espacios from './pages/Espacios.jsx';
import Historial from './pages/historial/Historial.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';
import Reportes from './pages/Reportes.jsx';
import Liquidacion from './pages/salida/Liquidacion.jsx';
import Salida from './pages/salida/Salida.jsx';
import Tablero from './pages/tablero/Tablero.jsx';
import Vehiculos from './pages/vehiculos/Vehiculos.jsx';

// Rutas de la aplicación. Todas comparten el Layout (menú + contenido); cada pantalla vive
// en su propio archivo de src/pages/.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Tablero />} />
        <Route path="entrada" element={<Entrada />} />
        <Route path="salida" element={<Salida />} />
        <Route path="salida/:idRegistro" element={<Liquidacion />} />
        <Route path="vehiculos" element={<Vehiculos />} />
        <Route path="historial" element={<Historial />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="espacios" element={<Espacios />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}

export default App;
