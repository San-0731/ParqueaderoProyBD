import { ReceiptText } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { listarMetodosPago } from '../../api/catalogos.js';
import { consultarIngresos, consultarOcupacion } from '../../api/reportes.js';
import AtajosFechas from '../../components/filtros/AtajosFechas.jsx';
import CamposFechas from '../../components/filtros/CamposFechas.jsx';
import EncabezadoPagina from '../../components/layout/EncabezadoPagina.jsx';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Cargando from '../../components/ui/Cargando.jsx';
import EstadoVacio from '../../components/ui/EstadoVacio.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import {
  describirRango,
  hoyIso,
  rangoDeAtajo,
  rangoDesdeUrl,
  rangoParaUrl,
  validarRango,
} from '../../utils/rangosFechas.js';
import GraficoDias from './GraficoDias.jsx';
import OcupacionTipos from './OcupacionTipos.jsx';
import TarjetasMetodo from './TarjetasMetodo.jsx';
import { ATAJOS_REPORTES, ingresosPorMetodo, serieDiaria } from './datosReportes.js';

/**
 * Una sección del reporte con su título. Las secciones dentro de otra (por ejemplo, "Por día"
 * dentro de "Ingresos") usan nivel 3, para que el orden de los títulos tenga sentido.
 */
function Seccion({ titulo, descripcion, nivel = 2, children }) {
  const idTitulo = useId();
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby={idTitulo} className={nivel === 2 ? 'mb-10' : 'mb-8'}>
      <Titulo
        id={idTitulo}
        className={`font-condensada font-semibold ${nivel === 2 ? 'text-3xl' : 'text-2xl'}`}
      >
        {titulo}
      </Titulo>
      {descripcion && <p className="text-tenue">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Alerta de error con "Reintentar". */
function ErrorConsulta({ titulo, error, onReintentar }) {
  return (
    <Alerta
      tipo="error"
      titulo={titulo}
      accion={
        <Boton variante="secundario" onClick={onReintentar}>
          Reintentar
        </Boton>
      }
    >
      {error.mensaje}
    </Alerta>
  );
}

/**
 * Reportes: ingresos por método de pago y por día (por fecha del pago) y ocupación actual.
 *
 * - El rango de fechas vive en la URL (?desde=&hasta=, ?todo=1); sin filtros, el mes actual
 *   hasta hoy. Un rango al revés se avisa sin consultar.
 * - Los totales los calcula el backend; aquí se reparten en tarjetas y en el gráfico.
 */
function Reportes() {
  const [parametros, setParametros] = useSearchParams();
  // "Hoy" se fija al abrir la pantalla (para los atajos y el rango por defecto).
  const [hoy] = useState(hoyIso);

  // En un useMemo para que el React Compiler acepte usarlos como dependencias del useCallback.
  const { desde, hasta, errorRango } = useMemo(() => {
    const rango = rangoDesdeUrl(parametros, rangoDeAtajo('mes', hoy));
    return { ...rango, errorRango: validarRango(rango.desde, rango.hasta) };
  }, [parametros, hoy]);

  const consulta = useCallback(
    () => (errorRango ? Promise.resolve(null) : consultarIngresos({ desde, hasta })),
    [desde, hasta, errorRango],
  );
  const ingresos = useConsulta(consulta);
  const metodos = useConsulta(listarMetodosPago);
  const ocupacion = useConsulta(consultarOcupacion);

  function cambiarRango(cambios) {
    setParametros(rangoParaUrl({ desde, hasta, ...cambios }), { replace: true });
  }

  const rango = describirRango({ desde, hasta });

  function contenidoIngresos() {
    if (errorRango) {
      return <p className="text-tenue">Corrige las fechas para ver los ingresos.</p>;
    }
    if ((ingresos.cargando && !ingresos.datos) || (metodos.cargando && !metodos.datos)) {
      return <Cargando texto="Cargando ingresos…" />;
    }
    if (ingresos.error || metodos.error) {
      const recargar = ingresos.error ? ingresos.recargar : metodos.recargar;
      return (
        <ErrorConsulta
          titulo="No se pudieron cargar los ingresos"
          error={ingresos.error ?? metodos.error}
          onReintentar={recargar}
        />
      );
    }

    const reporte = ingresos.datos;
    if (reporte.cantidadPagos === 0) {
      return (
        <EstadoVacio
          icono={ReceiptText}
          titulo={`No hubo pagos${rango ? ` ${rango}` : ''}`}
          descripcion="Prueba con otro rango de fechas, por ejemplo el mes anterior."
        />
      );
    }

    return (
      <div aria-busy={ingresos.cargando || undefined}>
        <Seccion titulo="Por método de pago" nivel={3}>
          <TarjetasMetodo
            totalGeneral={reporte.totalGeneral}
            cantidadPagos={reporte.cantidadPagos}
            tarjetas={ingresosPorMetodo(metodos.datos, reporte.porMetodo, reporte.totalGeneral)}
          />
        </Seccion>
        <Seccion
          titulo="Por día"
          nivel={3}
          descripcion="Pasa el mouse o llega con Tab a una barra para ver su valor."
        >
          <GraficoDias
            serie={serieDiaria(reporte.porDia, desde, hasta)}
            porDia={reporte.porDia}
            totalGeneral={reporte.totalGeneral}
            cantidadPagos={reporte.cantidadPagos}
          />
        </Seccion>
      </div>
    );
  }

  function contenidoOcupacion() {
    if (ocupacion.cargando && !ocupacion.datos) {
      return <Cargando texto="Cargando ocupación…" />;
    }
    if (ocupacion.error) {
      return (
        <ErrorConsulta
          titulo="No se pudo cargar la ocupación"
          error={ocupacion.error}
          onReintentar={ocupacion.recargar}
        />
      );
    }
    return <OcupacionTipos ocupacion={ocupacion.datos} />;
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Reportes"
        descripcion="Ingresos por método de pago y por día, y ocupación actual."
      />

      <section
        aria-label="Rango de fechas"
        className="mb-8 rounded-xl border border-borde bg-white p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <CamposFechas desde={desde} hasta={hasta} error={errorRango} onCambiar={cambiarRango} />
        </div>
        <div className="mt-4">
          <AtajosFechas
            claves={ATAJOS_REPORTES}
            desde={desde}
            hasta={hasta}
            hoy={hoy}
            onCambiar={cambiarRango}
          />
        </div>
      </section>

      <Seccion
        titulo="Ingresos"
        descripcion={`Por la fecha del pago${rango ? `, ${rango}` : ', de todo el historial'}.`}
      >
        {contenidoIngresos()}
      </Seccion>

      <Seccion
        titulo="Ocupación actual"
        descripcion="Cómo están los espacios en este momento (no depende de las fechas)."
      >
        {contenidoOcupacion()}
      </Seccion>
    </>
  );
}

export default Reportes;
