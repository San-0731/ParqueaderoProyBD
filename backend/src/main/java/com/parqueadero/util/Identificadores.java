package com.parqueadero.util;

import com.parqueadero.exception.DatosInvalidosException;

import java.util.Locale;

/**
 * Normalización del identificador de un vehículo (placa o código).
 *
 * <p>Aplica exactamente la misma regla que el trigger de
 * {@code V005__triggers.sql}: mayúsculas y sin espacios ni guiones. El trigger
 * solo normaliza lo que se guarda; esta clase sirve para normalizar lo que se
 * busca y para validar el valor antes de ir a la base.
 */
public final class Identificadores {

    private Identificadores() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /**
     * Devuelve el identificador en mayúsculas y sin espacios ni guiones.
     * Ejemplo: {@code " abc-123 "} → {@code "ABC123"}.
     *
     * @throws DatosInvalidosException si el valor es {@code null} o queda vacío
     */
    public static String normalizar(String valor) {
        if (valor == null) {
            throw identificadorObligatorio();
        }
        // Locale.ROOT: las mayúsculas no dependen del idioma del sistema
        // (en turco, por ejemplo, la "i" pasaría a "İ" y no a "I").
        String normalizado = valor.replace(" ", "").replace("-", "").toUpperCase(Locale.ROOT);
        if (normalizado.isEmpty()) {
            throw identificadorObligatorio();
        }
        return normalizado;
    }

    private static DatosInvalidosException identificadorObligatorio() {
        return new DatosInvalidosException(
                "El identificador (placa o código) del vehículo es obligatorio.");
    }
}
