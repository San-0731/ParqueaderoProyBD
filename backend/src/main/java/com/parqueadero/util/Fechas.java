package com.parqueadero.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * Fecha y hora "de negocio" del parqueadero, siempre en la zona horaria de
 * Bogotá. Se usa en vez de {@code LocalDate.now()} sin zona, que tomaría la
 * del sistema operativo (en un servidor de despliegue suele ser UTC y el día
 * cambiaría a las 7 p. m. hora de Colombia).
 *
 * <p>Es la misma zona que usan la conexión JDBC ({@code serverTimezone}) y
 * MySQL en Docker ({@code TZ}).
 */
public final class Fechas {

    /** Zona horaria del parqueadero. */
    public static final ZoneId ZONA = ZoneId.of("America/Bogota");

    private Fechas() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /** Fecha de hoy en Bogotá. */
    public static LocalDate hoy() {
        return LocalDate.now(ZONA);
    }

    /**
     * Fecha y hora actual en Bogotá, <b>sin fracciones de segundo</b>.
     *
     * <p>Se trunca porque MySQL <i>redondea</i> las fracciones al guardar en
     * una columna {@code DATETIME}: 14:30:05.7 quedaría como 14:30:06 y el
     * valor guardado no coincidiría con el que calculó Java.
     */
    public static LocalDateTime ahora() {
        return LocalDateTime.now(ZONA).truncatedTo(ChronoUnit.SECONDS);
    }
}
