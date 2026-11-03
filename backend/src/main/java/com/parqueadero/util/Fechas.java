package com.parqueadero.util;

import java.time.LocalDate;
import java.time.ZoneId;

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
}
