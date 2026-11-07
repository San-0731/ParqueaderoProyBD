import { History } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { listarMetodosPago } from '../../api/catalogos.js';
import { listarHistorial } from '../../api/registros.js';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';
import Paginacion from '../../components/ui/Paginacion.jsx';
import Placa from '../../components/ui/Placa.jsx';
import Tabla from '../../components/ui/Tabla.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { nombreEspacio } from '../../utils/espacio.js';
import {
  formatearDuracion,
  formatearFecha,
  formatearHora,
  formatearPesos,
  SIN_DATO,
} from '../../utils/formato.js';
import { formatearPlaca } from '../../utils/identificador.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';
import FiltrosHistorial from './FiltrosHistorial.jsx';
import {
  consultaParaApi,
  contarParqueos,
  describirRango,
  filtrarPorPlaca,
  filtrosDesdeUrl,
  filtrosParaUrl,
  hoyIso,
  paginar,
  rangoDeAtajo,
  totalValor,
  validarRango,
} from './datosHistorial.js';

/** Fecha arriba y hora debajo: la columna queda angosta y la tabla cabe en escritorio. */
function FechaHora({ valor }) {
  return (
    <>
      <span className="block">{formatearFecha(valor)}</span>
      <span className="block text-sm text-tenue">{formatearHora(valor)}</span>
    </>
  );
}

const COLUMNAS = [
  {
    clave: 'identificador',
    titulo: 'Placa',
    fija: true,
    render: (fila) => (
      <>
        <Placa identificador={fila.identificador} />
        <span className="mt-1 block text-sm text-tenue">
          {nombreTipoVisible(fila.tipoVehiculo)}
        </span>
      </>
    ),
  },
  { clave: 'espacio', titulo: 'Espacio', render: (fila) => nombreEspacio(fila) },
  { clave: 'entrada', titulo: 'Entrada', render: (fila) => <FechaHora valor={fila.entrada} /> },
  { clave: 'salida', titulo: 'Salida', render: (fila) => <FechaHora valor={fila.salida} /> },
  { clave: 'tiempo', titulo: 'Tiempo', render: (fila) => formatearDuracion(fila.minutosTotales) },
  {
    clave: 'valorTotal',
    titulo: 'Valor',
    alinear: 'derecha',
    render: (fila) => formatearPesos(fila.valorTotal),
  },
  {
    clave: 'metodo',
    titulo: 'Método',
    render: (fila) => fila.metodosPago ?? <span className="text-tenue">Sin cobro</span>,
  },
  { clave: 'referencia', titulo: 'Referencia', render: (fila) => fila.referencias ?? SIN_DATO },
];

/**
 * Historial de parqueos terminados.
 *
 * - Los filtros viven en la URL (?desde=&hasta=&identificador=&metodo=&pagina=): se pueden
 *   compartir y sobreviven a recargar. Sin filtros, los últimos 7 días.
 * - Al backend van las fechas y el método; la placa se filtra aquí, por parte de ella.
 * - Un rango al revés se avisa sin consultar.
 * - El total suma todos los resultados; la tabla muestra 20 por página.
 */
function Historial() {
  const [parametros, setParametros] = useSearchParams();
  // "Hoy" se fija al abrir la pantalla (para los atajos y el rango por defecto).
  const [hoy] = useState(hoyIso);
  const refResultados = useRef(null);

  // Los filtros salen de la URL. Se calculan en un useMemo para que el React Compiler los trate
  // como valores fijos y acepte usarlos como dependencias del useCallback de la consulta.
  const { desde, hasta, identificador, idMetodo, pagina, errorRango } = useMemo(() => {
    const filtros = filtrosDesdeUrl(parametros, hoy);
    return { ...filtros, errorRango: validarRango(filtros.desde, filtros.hasta) };
  }, [parametros, hoy]);

  // Con un rango inválido no se consulta: se devuelve una lista vacía sin llamar a la API.
  const consulta = useCallback(
    () =>
      errorRango
        ? Promise.resolve([])
        : listarHistorial(consultaParaApi({ desde, hasta, idMetodo })),
    [desde, hasta, idMetodo, errorRango],
  );
  const { datos, cargando, error, recargar } = useConsulta(consulta);
  const { datos: metodos } = useConsulta(listarMetodosPago);

  // Cambiar un filtro escribe la URL (y vuelve a la página 1).
  function cambiarFiltros(cambios) {
    const nuevos = { desde, hasta, identificador, idMetodo, ...cambios, pagina: 1 };
    setParametros(filtrosParaUrl(nuevos), { replace: true });
  }

  function cambiarPagina(nueva) {
    setParametros(filtrosParaUrl({ desde, hasta, identificador, idMetodo, pagina: nueva }), {
      replace: true,
    });
    refResultados.current?.scrollIntoView?.({ block: 'start' });
  }

  function contenido() {
    if (errorRango) {
      return <p className="text-tenue">Corrige las fechas para ver el historial.</p>;
    }
    if (cargando && !datos) {
      return <Cargando texto="Cargando historial…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudo cargar el historial"
          accion={
            <Boton variante="secundario" onClick={recargar}>
              Reintentar
            </Boton>
          }
        >
          {error.mensaje}
        </Alerta>
      );
    }

    const filas = filtrarPorPlaca(datos, identificador);
    const rango = describirRango({ desde, hasta });

    if (filas.length === 0) {
      const placa = identificador && formatearPlaca(identificador);
      const sinFechas = !desde && !hasta;
      const treintaDias = rangoDeAtajo('30', hoy);
      return (
        <EstadoVacio
          icono={History}
          titulo={
            placa
              ? `Ningún parqueo terminado de ${placa}${rango ? ` ${rango}` : ''}`
              : `No hay parqueos terminados${rango ? ` ${rango}` : ''}`
          }
          descripcion={sinFechas ? undefined : 'Prueba con un rango de fechas más amplio.'}
          accion={
            !sinFechas && (
              <div className="flex flex-wrap justify-center gap-3">
                {(desde !== treintaDias.desde || hasta !== treintaDias.hasta) && (
                  <Boton variante="secundario" onClick={() => cambiarFiltros(treintaDias)}>
                    Ver los últimos 30 días
                  </Boton>
                )}
                <Boton onClick={() => cambiarFiltros(rangoDeAtajo('todo', hoy))}>
                  Ver todo el historial
                </Boton>
              </div>
            )
          }
        />
      );
    }

    const vista = paginar(filas, pagina);
    return (
      <div aria-busy={cargando || undefined}>
        <p ref={refResultados} aria-live="polite" className="mb-3 scroll-mt-4 text-tenue">
          {contarParqueos(filas.length)}
          {rango && `, ${rango}`}.
        </p>
        <Tabla
          etiqueta="Historial de parqueos"
          columnas={COLUMNAS}
          filas={vista.filas}
          claveFila="idRegistro"
          pie={{
            identificador: `Total de ${filas.length} ${filas.length === 1 ? 'parqueo' : 'parqueos'}`,
            valorTotal: formatearPesos(totalValor(filas)),
          }}
        />
        <Paginacion
          etiqueta="Páginas del historial"
          pagina={vista.pagina}
          totalPaginas={vista.totalPaginas}
          onCambiar={cambiarPagina}
        />
      </div>
    );
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Historial de parqueos"
        descripcion="Parqueos terminados, con su duración, valor y método de pago."
      />
      <FiltrosHistorial
        filtros={{ desde, hasta, identificador, idMetodo }}
        hoy={hoy}
        metodos={metodos ?? []}
        errorRango={errorRango}
        onCambiar={cambiarFiltros}
      />
      {contenido()}
    </>
  );
}

export default Historial;
