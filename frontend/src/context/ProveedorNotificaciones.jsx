import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { NotificacionesContext } from './NotificacionesContext.js';

/** Tiempo que se muestra cada aviso. */
const DURACION_MS = 5_000;

const TIPOS = {
  exito: { icono: CircleCheck, barra: 'border-l-libre', color: 'text-libre' },
  error: { icono: CircleAlert, barra: 'border-l-ocupado', color: 'text-ocupado' },
};

/**
 * Guarda la lista de avisos y la dibuja en una esquina (abajo a la derecha; a todo el ancho
 * en celular). La región aria-live existe siempre, así el lector de pantalla anuncia cada
 * aviso nuevo que aparece dentro de ella.
 */
function ProveedorNotificaciones({ children }) {
  const [avisos, setAvisos] = useState([]);
  const ultimoId = useRef(0);

  const cerrar = useCallback((id) => {
    setAvisos((lista) => lista.filter((aviso) => aviso.id !== id));
  }, []);

  const notificar = useCallback(
    (tipo, mensaje) => {
      ultimoId.current += 1;
      const id = ultimoId.current;
      setAvisos((lista) => [...lista, { id, tipo, mensaje }]);
      setTimeout(() => cerrar(id), DURACION_MS);
    },
    [cerrar],
  );

  // useMemo: el objeto no cambia en cada render, así los componentes que usan el contexto
  // no se vuelven a dibujar sin necesidad.
  const valor = useMemo(
    () => ({
      notificarExito: (mensaje) => notificar('exito', mensaje),
      notificarError: (mensaje) => notificar('error', mensaje),
    }),
    [notificar],
  );

  return (
    <NotificacionesContext value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex flex-col gap-3 p-4 sm:right-0 sm:left-auto sm:w-96"
      >
        {avisos.map(({ id, tipo, mensaje }) => {
          const { icono: Icono, barra, color } = TIPOS[tipo];
          return (
            <div
              key={id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-l-4 border-borde bg-white p-4 shadow-lg motion-safe:animate-aparecer ${barra}`}
            >
              <Icono aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${color}`} />
              <p className="flex-1 font-medium">{mensaje}</p>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => cerrar(id)}
                className="-m-1.5 grid size-8 shrink-0 place-items-center rounded-md text-tenue hover:bg-concreto hover:text-asfalto"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificacionesContext>
  );
}

export default ProveedorNotificaciones;
