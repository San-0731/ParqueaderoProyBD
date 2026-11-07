import { useId } from 'react';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';
import { totalGeneral } from './datosTablero.js';

/** 1 → "1 ocupado"; 3 → "3 ocupados". */
function contar(cantidad, singular, plural) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** Frase completa para el lector de pantalla: "Carro: 9 libres de 12, 3 ocupados". */
function describir({ nombre, libres, total, ocupados, deshabilitados }) {
  const partes = [`${nombre}: ${contar(libres, 'libre', 'libres')} de ${total}`];
  if (ocupados > 0) {
    partes.push(contar(ocupados, 'ocupado', 'ocupados'));
  }
  if (deshabilitados > 0) {
    partes.push(contar(deshabilitados, 'deshabilitado', 'deshabilitados'));
  }
  return partes.join(', ');
}

/**
 * Resumen de cupos con el aspecto del letrero de "cupos libres" que hay a la entrada de los
 * parqueaderos (panel oscuro con números grandes). Cada tipo de vehículo es además un botón
 * de filtro: al elegir "Moto", la cuadrícula muestra solo los espacios de motos.
 *
 * Los botones usan aria-pressed (botón que se queda "presionado"), así el lector de pantalla
 * dice cuál filtro está activo. Su aria-label es una frase completa porque el texto visible
 * está repartido en varias líneas que el lector leería pegadas ("Carro9de 12").
 *
 * @param ocupacion filas de GET /reportes/ocupacion
 * @param idTipo tipo elegido, o null para "Todos"
 * @param onElegir recibe el idTipo elegido (null = "Todos")
 */
function LetreroCupos({ ocupacion, idTipo, onElegir }) {
  const idTitulo = useId();
  const celdas = [
    { idTipo: null, nombre: 'Todos', ...totalGeneral(ocupacion) },
    // Un tipo sin espacios (total 0) no tiene nada que mostrar ni que filtrar.
    ...ocupacion
      .filter((tipo) => tipo.total > 0)
      .map((tipo) => ({ ...tipo, nombre: nombreTipoVisible(tipo.tipoVehiculo) })),
  ];

  return (
    <section
      aria-labelledby={idTitulo}
      className="superficie-oscura mb-8 rounded-xl bg-asfalto p-4 text-white sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={idTitulo} className="font-condensada text-2xl font-semibold">
          Cupos libres
        </h2>
        <p className="text-sm text-white/75">Elige un tipo para ver solo sus espacios.</p>
      </div>

      {/* Celular: "Todos" a lo ancho y los tipos de a dos. Desde tablet: todo en una fila. */}
      <ul className="grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col">
        {celdas.map((celda) => {
          const elegida = celda.idTipo === idTipo;
          return (
            <li
              key={celda.idTipo ?? 'todos'}
              className={celda.idTipo === null ? 'col-span-2 sm:col-span-1' : ''}
            >
              <button
                type="button"
                aria-pressed={elegida}
                aria-label={describir(celda)}
                onClick={() => onElegir(celda.idTipo)}
                className={`flex h-full w-full flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  elegida
                    ? 'border-white bg-white text-asfalto'
                    : 'border-white/15 bg-asfalto-claro text-white hover:border-white/50'
                }`}
              >
                {/* Alto de dos líneas: así los números quedan alineados aunque un nombre largo
                    ("Camión de carga pesada") ocupe dos. En celular "Todos" va sola en su fila
                    y no lo necesita. */}
                <span
                  className={`leading-snug font-semibold ${celda.idTipo === null ? 'sm:min-h-[2lh]' : 'min-h-[2lh]'}`}
                >
                  {celda.nombre}
                </span>
                <span
                  className={`mt-1 font-condensada text-4xl leading-none font-bold tabular-nums sm:text-5xl ${
                    elegida ? 'text-libre' : ''
                  }`}
                >
                  {celda.libres}
                </span>
                <span className={`text-sm ${elegida ? 'text-tenue' : 'text-white/75'}`}>
                  de {celda.total}
                </span>
                {(celda.ocupados > 0 || celda.deshabilitados > 0) && (
                  <span className={`mt-2 text-sm ${elegida ? 'text-tenue' : 'text-white/75'}`}>
                    {celda.ocupados > 0 && (
                      <span className="block">{contar(celda.ocupados, 'ocupado', 'ocupados')}</span>
                    )}
                    {celda.deshabilitados > 0 && (
                      <span className="block">
                        {contar(celda.deshabilitados, 'deshabilitado', 'deshabilitados')}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default LetreroCupos;
