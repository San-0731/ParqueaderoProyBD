import { useId } from 'react';
import { idsDescripcion } from './accesibilidad.js';
import { clasesControl } from './estilos.js';
import MensajeCampo from './MensajeCampo.jsx';

/**
 * Lista desplegable (<select> nativo) con su etiqueta, ayuda y mensaje de error.
 *
 * <Selector etiqueta="Tipo de vehículo" placeholder="Elige un tipo"
 *           opciones={tipos.map((t) => ({ valor: t.idTipo, texto: t.nombre }))}
 *           value={idTipo} onChange={(e) => setIdTipo(e.target.value)} />
 *
 * @param opciones [{ valor, texto, deshabilitada? }]
 * @param placeholder primera opción vacía (valor ''), por ejemplo "Elige un tipo"
 */
function Selector({
  etiqueta,
  opciones = [],
  placeholder,
  ayuda,
  error,
  id,
  className = '',
  ...props
}) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const { idAyuda, idError, describe } = idsDescripcion(idCampo, ayuda, error);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={idCampo} className="font-semibold">
        {etiqueta}
      </label>
      <select
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe}
        className={clasesControl(Boolean(error))}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor} disabled={opcion.deshabilitada}>
            {opcion.texto}
          </option>
        ))}
      </select>
      <MensajeCampo idAyuda={idAyuda} ayuda={ayuda} idError={idError} error={error} />
    </div>
  );
}

export default Selector;
