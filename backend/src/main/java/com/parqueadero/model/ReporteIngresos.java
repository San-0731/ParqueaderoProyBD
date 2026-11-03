package com.parqueadero.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Respuesta de {@code GET /api/reportes/ingresos}: el detalle de la vista
 * {@code vw_ingresos_por_metodo} y sus totales. Si el rango no tiene pagos, los
 * totales valen 0 y las listas quedan vacías.
 *
 * @param desde         primer día del rango; {@code null} si no se filtró
 * @param hasta         último día del rango; {@code null} si no se filtró
 * @param cantidadPagos número total de pagos del rango
 * @param totalGeneral  suma de todos los pagos del rango
 * @param porMetodo     totales por método de pago, por nombre
 * @param porDia        totales por día, del más antiguo al más reciente
 * @param detalle       una fila por día y método (la vista tal cual)
 */
public record ReporteIngresos(LocalDate desde, LocalDate hasta, Long cantidadPagos,
        BigDecimal totalGeneral, List<IngresoPorMetodo> porMetodo, List<IngresoPorDia> porDia,
        List<IngresoDiaMetodo> detalle) {

    public ReporteIngresos {
        // Copias inmutables: el reporte no cambia después de armarlo.
        porMetodo = List.copyOf(porMetodo);
        porDia = List.copyOf(porDia);
        detalle = List.copyOf(detalle);
    }
}
