import Campo from '../ui/Campo.jsx';
import Selector from '../ui/Selector.jsx';
import { MAX_COLOR } from './validaciones.js';

/**
 * Campos opcionales del vehículo: marca, modelo, color y año. Los usan el registro
 * (FormularioVehiculo) y la edición (pantalla de vehículos). Van sueltos (un fragmento) para
 * que el padre los acomode en su propia grilla.
 *
 * <CamposVehiculo valores={{ idMarca, idModelo, color, anio }} errores={errores}
 *                 marcas={marcas} modelos={modelos} onCambiar={(cambios) => ...} />
 *
 * @param valores los valores como texto (así los entregan los <select> e <input>)
 * @param onCambiar recibe solo lo que cambió, por ejemplo { color: 'Gris' }. Al cambiar la
 *        marca también llega idModelo: '' (el modelo anterior era de otra marca).
 */
function CamposVehiculo({ valores, errores, marcas, modelos, onCambiar }) {
  const modelosDeMarca = modelos.filter((modelo) => String(modelo.idMarca) === valores.idMarca);
  const cambiar = (campo) => (evento) => onCambiar({ [campo]: evento.target.value });

  return (
    <>
      <Selector
        etiqueta="Marca (opcional)"
        placeholder="Sin marca"
        opciones={marcas.map((marca) => ({ valor: String(marca.idMarca), texto: marca.nombre }))}
        value={valores.idMarca}
        onChange={(evento) => onCambiar({ idMarca: evento.target.value, idModelo: '' })}
      />
      <Selector
        etiqueta="Modelo (opcional)"
        placeholder={valores.idMarca ? 'Elige el modelo' : 'Primero elige la marca'}
        opciones={modelosDeMarca.map((modelo) => ({
          valor: String(modelo.idModelo),
          texto: modelo.nombre,
        }))}
        value={valores.idModelo}
        onChange={cambiar('idModelo')}
        disabled={!valores.idMarca}
        error={errores.idModelo}
      />
      <Campo
        etiqueta="Color (opcional)"
        value={valores.color}
        onChange={cambiar('color')}
        maxLength={MAX_COLOR}
        error={errores.color}
        autoComplete="off"
      />
      <Campo
        etiqueta="Año (opcional)"
        value={valores.anio}
        onChange={cambiar('anio')}
        inputMode="numeric"
        maxLength={4}
        error={errores.anio}
        autoComplete="off"
      />
    </>
  );
}

export default CamposVehiculo;
