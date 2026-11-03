package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.service.CalculadoraTarifa.Cobro;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/** Pruebas de la regla de cobro (hora o fracción). No usan base de datos. */
class CalculadoraTarifaTest {

    private static final LocalDateTime ENTRADA = LocalDateTime.of(2026, 11, 3, 8, 0);
    private static final BigDecimal CARRO = new BigDecimal("5000.00");

    /** Cobro de un parqueo de {@code minutos} minutos a la tarifa de carro. */
    private static Cobro cobrar(long minutos) {
        return CalculadoraTarifa.calcular(ENTRADA, ENTRADA.plusMinutes(minutos), CARRO);
    }

    @Test
    void ceroMinutos_noSeCobra() {
        assertEquals(new Cobro(0, 0, new BigDecimal("0.00")), cobrar(0));
    }

    @Test
    void salidaIgualALaEntrada_ceroMinutos() {
        assertEquals(0, CalculadoraTarifa.calcular(ENTRADA, ENTRADA, CARRO).horasCobradas());
    }

    @Test
    void unMinuto_seCobraUnaHora() {
        assertEquals(new Cobro(1, 1, new BigDecimal("5000.00")), cobrar(1));
    }

    @Test
    void cincuentaYNueveMinutos_unaHora() {
        assertEquals(new Cobro(59, 1, new BigDecimal("5000.00")), cobrar(59));
    }

    @Test
    void exactamenteSesentaMinutos_unaHora() {
        assertEquals(new Cobro(60, 1, new BigDecimal("5000.00")), cobrar(60));
    }

    @Test
    void sesentaYUnMinutos_dosHoras() {
        assertEquals(new Cobro(61, 2, new BigDecimal("10000.00")), cobrar(61));
    }

    @Test
    void variasHoras_comoElRegistro6DeLosDatosDePrueba() {
        // 06:50 → 18:05 = 675 min = 11 h 15 min → 12 horas a 4.500
        Cobro cobro = CalculadoraTarifa.calcular(LocalDateTime.of(2026, 9, 21, 6, 50),
                LocalDateTime.of(2026, 9, 21, 18, 5), new BigDecimal("4500.00"));

        assertEquals(new Cobro(675, 12, new BigDecimal("54000.00")), cobro);
    }

    @Test
    void cruzaLaMedianoche_comoElRegistro12DeLosDatosDePrueba() {
        // 30-sep 18:00 → 1-oct 08:30 = 870 min = 14 h 30 min → 15 horas a 8.000
        Cobro cobro = CalculadoraTarifa.calcular(LocalDateTime.of(2026, 9, 30, 18, 0),
                LocalDateTime.of(2026, 10, 1, 8, 30), new BigDecimal("8000.00"));

        assertEquals(new Cobro(870, 15, new BigDecimal("120000.00")), cobro);
    }

    @Test
    void losSegundosSobrantesNoCuentan() {
        // 60 min 59 s → 60 minutos completos (igual que TIMESTAMPDIFF de MySQL) → 1 hora
        Cobro cobro = CalculadoraTarifa.calcular(ENTRADA, ENTRADA.plusMinutes(60).plusSeconds(59), CARRO);

        assertEquals(new Cobro(60, 1, new BigDecimal("5000.00")), cobro);
    }

    @Test
    void salidaAnteriorALaEntrada_lanzaExcepcion() {
        assertThrows(IllegalArgumentException.class,
                () -> CalculadoraTarifa.calcular(ENTRADA, ENTRADA.minusSeconds(1), CARRO));
    }

    @Test
    void tarifaNulaCeroONegativa_lanzaExcepcion() {
        LocalDateTime salida = ENTRADA.plusHours(1);
        for (BigDecimal tarifa : new BigDecimal[] {null, BigDecimal.ZERO, new BigDecimal("-1")}) {
            assertThrows(IllegalArgumentException.class,
                    () -> CalculadoraTarifa.calcular(ENTRADA, salida, tarifa), String.valueOf(tarifa));
        }
    }
}
