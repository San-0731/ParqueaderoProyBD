package com.parqueadero;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Ninguna ruta queda abierta por olvido: toda ruta nueva debe declarar su rol
 * mínimo en {@link Servidor}, o agregarse aquí a propósito si de verdad es
 * pública. No necesita base de datos (los servicios solo guardan la conexión).
 */
class ServidorRutasTest {

    @Test
    void soloLaSaludYElInicioDeSesionSonPublicos() {
        List<String> publicas = Servidor.registrarRutas(null).rutasPublicas();

        assertEquals(List.of("GET /api/salud", "POST /api/auth/login"), publicas);
    }
}
