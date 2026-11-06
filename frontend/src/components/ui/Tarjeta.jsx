import { useId } from 'react';

/**
 * Superficie blanca con borde para agrupar contenido. Sin sombra: las sombras se reservan
 * para lo que flota (modales y avisos).
 *
 * <Tarjeta titulo="Datos del vehículo" acciones={<Boton variante="secundario">Editar</Boton>}>
 *   ...
 * </Tarjeta>
 */
function Tarjeta({ titulo, acciones, className = '', children }) {
  const idTitulo = useId();

  return (
    <section
      aria-labelledby={titulo ? idTitulo : undefined}
      className={`rounded-xl border border-borde bg-white p-5 sm:p-6 ${className}`}
    >
      {(titulo || acciones) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {titulo && (
            <h2 id={idTitulo} className="text-lg font-semibold">
              {titulo}
            </h2>
          )}
          {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export default Tarjeta;
