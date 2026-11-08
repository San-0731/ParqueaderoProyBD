package com.parqueadero.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Pruebas de la lectura de {@code DB_SSL} en {@link Configuracion} (sin
 * variables de entorno). Si {@code DB_SSL} no está definida o está vacía,
 * {@code cargar()} usa el valor por defecto {@code false} antes de llegar aquí.
 */
class ConfiguracionTest {

    @ParameterizedTest
    @ValueSource(strings = {"true", "TRUE", "True"})
    void dbSsl_trueSinImportarMayusculas(String valor) {
        assertTrue(Configuracion.leerBooleano("DB_SSL", valor));
    }

    @ParameterizedTest
    @ValueSource(strings = {"false", "FALSE", "False"})
    void dbSsl_falseSinImportarMayusculas(String valor) {
        assertFalse(Configuracion.leerBooleano("DB_SSL", valor));
    }

    /**
     * Un valor mal escrito es un error y no se toma como false: así nadie
     * apaga el cifrado en producción por equivocación.
     */
    @ParameterizedTest
    @ValueSource(strings = {"si", "1", "yes", "verdadero", "true "})
    void dbSsl_valorInvalido_lanzaErrorConElNombreDeLaVariable(String valor) {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> Configuracion.leerBooleano("DB_SSL", valor));

        assertEquals("La variable DB_SSL debe valer true o false, pero vale '" + valor + "'.",
                error.getMessage());
    }
}
