package com.parqueadero.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.sun.net.httpserver.Headers;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Lectura del token de la cabecera Authorization en {@link ApiHandler}. */
class ApiHandlerTest {

    private static Headers conAutorizacion(String valor) {
        Headers cabeceras = new Headers();
        if (valor != null) {
            cabeceras.add("Authorization", valor);
        }
        return cabeceras;
    }

    @ParameterizedTest
    @CsvSource({
        "'Bearer abc123', abc123",
        "'bearer abc123', abc123",
        "'BEARER abc123', abc123",
        "'Bearer   abc123  ', abc123",
    })
    void leeElTokenDeBearer(String cabecera, String esperado) {
        assertEquals(esperado, ApiHandler.leerToken(conAutorizacion(cabecera)));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Bearer", "Bearer ", "Bearer    ", "Basic dXN1YXJpbzpjbGF2ZQ==", "abc123"})
    void sinTokenBearerDevuelveNull(String cabecera) {
        assertNull(ApiHandler.leerToken(conAutorizacion(cabecera)));
    }
}
