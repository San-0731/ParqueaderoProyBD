package com.parqueadero.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

/**
 * Regla de cobro del parqueadero: <b>por hora o fracción</b>. Es lógica pura:
 * no usa la base de datos, así que se prueba con JUnit.
 *
 * <ul>
 *   <li>Los minutos se cuentan completos, sin los segundos sobrantes, igual
 *       que {@code TIMESTAMPDIFF(MINUTE, entrada, salida)} de MySQL. Así se
 *       cumple siempre el CHECK {@code chk_registro_minutos_coherentes}.</li>
 *   <li>Cada hora empezada se cobra completa: 1 a 60 minutos = 1 hora,
 *       61 minutos = 2 horas.</li>
 *   <li>0 minutos (salió antes de cumplir un minuto) = 0 horas: no se cobra.</li>
 * </ul>
 *
 * <p>Se comprobó con los 27 registros pagados de los datos de prueba (V003).
 */
public final class CalculadoraTarifa {

    private static final long MINUTOS_POR_HORA = 60;

    /**
     * Resultado del cálculo.
     *
     * @param minutos       minutos completos entre entrada y salida
     * @param horasCobradas horas que se cobran (cada fracción cuenta como hora)
     * @param valorTotal    {@code horasCobradas × valorHora}
     */
    public record Cobro(long minutos, long horasCobradas, BigDecimal valorTotal) {
    }

    private CalculadoraTarifa() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /**
     * Calcula los minutos, las horas cobradas y el valor de un parqueo.
     *
     * @param entrada   fecha y hora de entrada
     * @param salida    fecha y hora de salida; puede ser igual a la entrada
     * @param valorHora tarifa por hora del tipo de vehículo; mayor que 0
     * @throws IllegalArgumentException si la salida es anterior a la entrada o
     *         la tarifa no es mayor que 0 (son errores de programación: el
     *         servicio los revisa antes de llamar)
     */
    public static Cobro calcular(LocalDateTime entrada, LocalDateTime salida, BigDecimal valorHora) {
        Objects.requireNonNull(entrada, "La entrada es obligatoria.");
        Objects.requireNonNull(salida, "La salida es obligatoria.");
        if (salida.isBefore(entrada)) {
            throw new IllegalArgumentException(
                    "La salida (" + salida + ") es anterior a la entrada (" + entrada + ").");
        }
        if (valorHora == null || valorHora.signum() <= 0) {
            throw new IllegalArgumentException("La tarifa por hora debe ser mayor que 0.");
        }

        long minutos = ChronoUnit.MINUTES.between(entrada, salida);
        // División entera redondeando hacia arriba: (minutos + 59) / 60.
        // 0 → 0, 1 → 1, 60 → 1, 61 → 2.
        long horas = (minutos + MINUTOS_POR_HORA - 1) / MINUTOS_POR_HORA;
        BigDecimal valor = valorHora.multiply(BigDecimal.valueOf(horas));
        return new Cobro(minutos, horas, valor);
    }
}
