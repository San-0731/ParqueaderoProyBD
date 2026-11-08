import { ScrollText } from 'lucide-react';
import { useCallback, useState } from 'react';
import { consultarAuditoria } from '../../api/auditoria.js';
import AtajosFechas from '../../components/filtros/AtajosFechas.jsx';
import CamposFechas from '../../components/filtros/CamposFechas.jsx';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';
import Paginacion from '../../components/ui/Paginacion.jsx';
import Placa from '../../components/ui/Placa.jsx';
import Selector from '../../components/ui/Selector.jsx';
import Tabla from '../../components/ui/Tabla.jsx';
import { useSesion } from '../../context/SesionContext.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import { formatearFechaHora } from '../../utils/formato.js';
import { hoyIso, rangoDeAtajo, validarRango } from '../../utils/rangosFechas.js';
import { nombreRol } from '../../utils/roles.js';
import { TABLAS, describirAccion, detalle, formatearValor, paginar } from './datosAuditoria.js';

/** Un valor del detalle: la placa con <Placa>, lo demás como texto. */
function Valor({ item, valor }) {
  return item.esPlaca && valor ? (
    <Placa identificador={valor} />
  ) : (
    <span>{formatearValor(item.clave, valor)}</span>
  );
}

/** Lista "Etiqueta: valor" o "Etiqueta: antes → después" de un cambio. */
function Detalle({ registro }) {
  return (
    <ul className="space-y-1 text-sm">
      {detalle(registro).map((item) => (
        <li key={item.clave} className="flex flex-wrap items-center gap-x-1.5">
          <span className="text-tenue">{item.etiqueta}:</span>
          {'antes' in item ? (
            <>
              <Valor item={item} valor={item.antes} />
              <span aria-hidden="true">→</span>
              <span className="sr-only">cambió a</span>
              <Valor item={item} valor={item.despues} />
            </>
          ) : (
            <Valor item={item} valor={item.valor} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Auditoría: quién cambió qué y cuándo. La llenan los triggers de la base (V008). El
 * administrador ve lo que hicieron los operadores; el DBA, también lo de los administradores.
 * Lo que hace el DBA no se audita.
 */
function Auditoria() {
  const { puede } = useSesion();
  const [hoy] = useState(hoyIso);
  const [filtros, setFiltros] = useState(() => ({ ...rangoDeAtajo('7', hoy), tabla: '' }));
  const [pagina, setPagina] = useState(1);
  const errorRango = validarRango(filtros.desde, filtros.hasta);

  const consulta = useCallback(
    () => (errorRango ? Promise.resolve([]) : consultarAuditoria(filtros)),
    [filtros, errorRango],
  );
  const { datos, cargando, error, recargar } = useConsulta(consulta);

  function cambiarFiltros(cambios) {
    setFiltros((anteriores) => ({ ...anteriores, ...cambios }));
    setPagina(1);
  }

  function contenido() {
    if (cargando && !datos) {
      return <Cargando texto="Cargando la auditoría…" />;
    }
    if (error) {
      return (
        <Alerta
          tipo="error"
          titulo="No se pudo cargar la auditoría"
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
    if (datos.length === 0) {
      return (
        <EstadoVacio
          icono={ScrollText}
          titulo="No hay cambios en este rango"
          descripcion="Prueba con otras fechas o con todas las secciones."
        />
      );
    }
    const vista = paginar(datos, pagina);
    return (
      <>
        <p aria-live="polite" className="mb-3 text-tenue">
          {datos.length === 1 ? '1 cambio' : `${datos.length} cambios`}.
        </p>
        <Tabla
          etiqueta="Cambios auditados"
          filas={vista.filas}
          claveFila="idAuditoria"
          columnas={[
            {
              clave: 'fecha',
              titulo: 'Fecha',
              fija: true,
              render: (registro) => formatearFechaHora(registro.fecha),
            },
            {
              clave: 'usuario',
              titulo: 'Quién',
              render: (registro) => (
                <span>
                  <span className="block font-semibold">{registro.nombreCompleto}</span>
                  <span className="text-sm text-tenue">
                    {nombreRol(registro.rol)} · {registro.nombreUsuario}
                  </span>
                </span>
              ),
            },
            { clave: 'accion', titulo: 'Qué hizo', render: describirAccion },
            {
              clave: 'detalle',
              titulo: 'Detalle',
              render: (registro) => <Detalle registro={registro} />,
            },
          ]}
        />
        <Paginacion
          etiqueta="Páginas de la auditoría"
          pagina={vista.pagina}
          totalPaginas={vista.totalPaginas}
          onCambiar={setPagina}
        />
      </>
    );
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion={
          puede('DBA')
            ? 'Quién cambió qué y cuándo: administradores y operadores. Lo que hace el DBA no se audita.'
            : 'Quién cambió qué y cuándo entre los operadores.'
        }
      />
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-borde bg-white p-4 sm:p-5">
        <AtajosFechas
          claves={['hoy', '7', '30', 'mes', 'todo']}
          desde={filtros.desde}
          hasta={filtros.hasta}
          hoy={hoy}
          onCambiar={cambiarFiltros}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <CamposFechas
            desde={filtros.desde}
            hasta={filtros.hasta}
            error={errorRango}
            onCambiar={cambiarFiltros}
          />
          <Selector
            etiqueta="Sección"
            placeholder="Todas"
            opciones={TABLAS}
            value={filtros.tabla}
            onChange={(evento) => cambiarFiltros({ tabla: evento.target.value })}
          />
        </div>
      </div>
      {contenido()}
    </>
  );
}

export default Auditoria;
