package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import org.junit.jupiter.api.Test;

/** Pruebas de {@link Identificadores#normalizar(String)}: misma regla que el trigger de V005. */
class IdentificadoresTest {

    @Test
    void normalizar_quitaGuionesYPasaAMayusculas() {
        assertEquals("ABC123", Identificadores.normalizar("abc-123"));
    }

    @Test
    void normalizar_quitaEspaciosEnCualquierPosicion() {
        assertEquals("ABC123", Identificadores.normalizar(" ab c-12 3 "));
    }

    @Test
    void normalizar_dejaIgualUnValorYaNormalizado() {
        assertEquals("ABC123", Identificadores.normalizar("ABC123"));
    }

    @Test
    void normalizar_nuloLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class, () -> Identificadores.normalizar(null));
    }

    @Test
    void normalizar_soloEspaciosYGuionesLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> Identificadores.normalizar("  -  "));
        assertEquals("El identificador (placa o código) del vehículo es obligatorio.",
                error.getMessage());
    }
}
