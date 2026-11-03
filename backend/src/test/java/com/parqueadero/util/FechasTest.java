package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

/** Pruebas de {@link Fechas}. */
class FechasTest {

    @Test
    void ahora_sinFraccionesDeSegundo() {
        assertEquals(0, Fechas.ahora().getNano());
    }

    @Test
    void ahora_esLaHoraDeBogota() {
        // Se compara con la hora de Bogotá calculada aparte; puede haber pasado
        // un instante entre las dos llamadas, por eso se admite un margen.
        LocalDateTime esperada = LocalDateTime.now(ZoneId.of("America/Bogota"));
        Duration diferencia = Duration.between(Fechas.ahora(), esperada).abs();

        assertTrue(diferencia.compareTo(Duration.ofSeconds(2)) < 0, diferencia::toString);
    }
}
