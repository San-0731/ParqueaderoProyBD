import { useId } from 'react';
import { idsDescripcion } from './accesibilidad.js';
import { clasesControl } from './estilos.js';
import MensajeCampo from './MensajeCampo.jsx';

/**
 * Campo de texto con su etiqueta, ayuda y mensaje de error.
 *
 * <Campo etiqueta="Placa o código" ayuda="Sin espacios ni guiones" error={errorPlaca}
 *        value={placa} onChange={(e) => setPlaca(e.target.value)} />
 *
 * El resto de props (value, onChange, type, required, autoComplete...) van al <input>.
 */
function Campo({ etiqueta, ayuda, error, id, className = '', ...props }) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const { idAyuda, idError, describe } = idsDescripcion(idCampo, ayuda, error);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={idCampo} className="font-semibold">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe}
        className={clasesControl(Boolean(error))}
        {...props}
      />
      <MensajeCampo idAyuda={idAyuda} ayuda={ayuda} idError={idError} error={error} />
    </div>
  );
}

export default Campo;
