import { X } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

// Elementos que pueden recibir el foco con Tab.
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ventana modal (por ejemplo, para confirmar una acción o editar un registro).
 *
 * <Modal abierto={confirmando} titulo="¿Confirmar el pago?" onCerrar={() => setConfirmando(false)}
 *        acciones={<><Boton variante="secundario" onClick={...}>Cancelar</Boton>
 *                    <Boton onClick={pagar}>Confirmar pago</Boton></>}>
 *   <p>Se cobrarán $ 12.500 con Nequi.</p>
 * </Modal>
 *
 * Accesibilidad: role="dialog" con el título como nombre; al abrir enfoca el primer control
 * (en una confirmación, "Cancelar", la opción menos riesgosa, va primero); Tab no sale del
 * modal; Escape o un clic en el fondo lo cierran; al cerrar el foco vuelve al botón que lo abrió.
 *
 * Se hizo propio (y no con <dialog>) porque jsdom, el navegador simulado de las pruebas, no
 * implementa showModal() y el comportamiento no se podría probar.
 */
function Modal({ abierto, titulo, onCerrar, acciones, children }) {
  const idTitulo = useId();
  const refPanel = useRef(null);
  // useEffectEvent: el efecto siempre llama al onCerrar más reciente sin tenerlo como
  // dependencia (si no, se reiniciaría en cada render del padre y movería el foco).
  const cerrar = useEffectEvent(() => onCerrar());

  useEffect(() => {
    if (!abierto) {
      return undefined;
    }
    const panel = refPanel.current;
    const enfocadoAntes = document.activeElement;

    // Primer control del contenido o de las acciones (la X de cerrar va al final).
    const enfocables = () => [...panel.querySelectorAll(ENFOCABLES)];
    const primero = enfocables().find((elemento) => !elemento.hasAttribute('data-cerrar'));
    (primero ?? panel).focus();

    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrar();
        return;
      }
      if (evento.key !== 'Tab') {
        return;
      }
      // Atrapa el foco: del último control se vuelve al primero, y al revés con Shift+Tab.
      const lista = enfocables();
      const inicio = lista[0];
      const fin = lista.at(-1);
      if (
        evento.shiftKey &&
        (document.activeElement === inicio || document.activeElement === panel)
      ) {
        evento.preventDefault();
        fin.focus();
      } else if (!evento.shiftKey && document.activeElement === fin) {
        evento.preventDefault();
        inicio.focus();
      }
    }

    document.addEventListener('keydown', alPresionarTecla);
    // Mientras el modal está abierto, la página de fondo no se desplaza.
    const desplazamientoAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      document.body.style.overflow = desplazamientoAntes;
      enfocadoAntes?.focus?.();
    };
  }, [abierto]);

  if (!abierto) {
    return null;
  }

  // createPortal lo dibuja al final de <body>, encima de todo lo demás.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-asfalto/60 p-4 sm:items-center"
      onMouseDown={(evento) => {
        // Solo si el clic fue en el fondo oscuro, no dentro del panel.
        if (evento.target === evento.currentTarget) {
          onCerrar();
        }
      }}
    >
      <div
        ref={refPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none motion-safe:animate-aparecer"
      >
        <h2 id={idTitulo} className="pr-10 text-xl font-semibold">
          {titulo}
        </h2>
        <div className="mt-3">{children}</div>
        {acciones && (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {acciones}
          </div>
        )}
        <button
          type="button"
          data-cerrar
          aria-label="Cerrar"
          onClick={onCerrar}
          className="absolute top-4 right-4 grid size-10 place-items-center rounded-lg text-tenue hover:bg-concreto hover:text-asfalto"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
