package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.IngresoDiaMetodo;
import com.parqueadero.model.IngresoPorDia;
import com.parqueadero.model.IngresoPorMetodo;
import com.parqueadero.model.ReporteIngresos;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Pruebas del resumen de ingresos de {@link ReporteService}; no usan base de datos. */
class ReporteServiceTest {

    private static final LocalDate DIA_1 = LocalDate.of(2026, 10, 1);
    private static final LocalDate DIA_2 = LocalDate.of(2026, 10, 2);
    private static final LocalDate DIA_5 = LocalDate.of(2026, 10, 5);

    private static IngresoDiaMetodo fila(LocalDate fecha, String metodo, long pagos, String total) {
        return new IngresoDiaMetodo(fecha, metodo, pagos, new BigDecimal(total));
    }

    /** Las filas reales de vw_ingresos_por_metodo del 1 al 5 de octubre de 2026 (V003). */
    private static final List<IngresoDiaMetodo> OCTUBRE_1_A_5 = List.of(
            fila(DIA_1, "Nequi", 1, "10000.00"),
            fila(DIA_1, "PSE", 1, "120000.00"),
            fila(DIA_2, "Daviplata", 1, "6000.00"),
            fila(DIA_5, "Daviplata", 1, "20000.00"),
            fila(DIA_5, "PSE", 1, "25000.00"));

    @Test
    void resumir_totalesGenerales() {
        ReporteIngresos reporte = ReporteService.resumir(DIA_1, DIA_5, OCTUBRE_1_A_5);

        assertEquals(DIA_1, reporte.desde());
        assertEquals(DIA_5, reporte.hasta());
        assertEquals(5L, reporte.cantidadPagos());
        assertEquals(new BigDecimal("181000.00"), reporte.totalGeneral());
        assertEquals(OCTUBRE_1_A_5, reporte.detalle());
    }

    @Test
    void resumir_porMetodoOrdenadoPorNombre() {
        ReporteIngresos reporte = ReporteService.resumir(DIA_1, DIA_5, OCTUBRE_1_A_5);

        assertEquals(List.of(
                new IngresoPorMetodo("Daviplata", 2L, new BigDecimal("26000.00")),
                new IngresoPorMetodo("Nequi", 1L, new BigDecimal("10000.00")),
                new IngresoPorMetodo("PSE", 2L, new BigDecimal("145000.00"))),
                reporte.porMetodo());
    }

    @Test
    void resumir_porDiaOrdenadoPorFecha() {
        // Aunque las filas lleguen desordenadas, porDia sale ordenado por fecha.
        List<IngresoDiaMetodo> desordenadas = List.of(OCTUBRE_1_A_5.get(4), OCTUBRE_1_A_5.get(2),
                OCTUBRE_1_A_5.get(0), OCTUBRE_1_A_5.get(3), OCTUBRE_1_A_5.get(1));

        ReporteIngresos reporte = ReporteService.resumir(DIA_1, DIA_5, desordenadas);

        assertEquals(List.of(
                new IngresoPorDia(DIA_1, 2L, new BigDecimal("130000.00")),
                new IngresoPorDia(DIA_2, 1L, new BigDecimal("6000.00")),
                new IngresoPorDia(DIA_5, 2L, new BigDecimal("45000.00"))),
                reporte.porDia());
    }

    @Test
    void resumir_sinDatosDaCerosYListasVacias() {
        ReporteIngresos reporte = ReporteService.resumir(null, null, List.of());

        assertNull(reporte.desde());
        assertNull(reporte.hasta());
        assertEquals(0L, reporte.cantidadPagos());
        assertEquals(0, BigDecimal.ZERO.compareTo(reporte.totalGeneral()));
        assertEquals(List.of(), reporte.porMetodo());
        assertEquals(List.of(), reporte.porDia());
        assertEquals(List.of(), reporte.detalle());
    }

    @Test
    void ingresos_validaElRangoAntesDeIrALaBase() {
        // Sin conexión ni DAO: si la validación no fallara primero, daría NullPointerException.
        ReporteService servicio = new ReporteService(null, null);

        assertThrows(DatosInvalidosException.class,
                () -> servicio.ingresos(LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 1)));
    }
}
