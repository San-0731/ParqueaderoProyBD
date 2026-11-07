package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;

/** {@code GET /api/salud}: el servidor responde y llega a la base de datos. */
class SaludApiTest extends PruebaApi {

    /** Con MySQL encendido, la salud responde 200 con el servidor y la base en OK, en JSON UTF-8. */
    @Test
    void saludRespondeOkConLaBaseDeDatos() {
        RespuestaHttp respuesta = get("/salud");

        assertEquals(200, respuesta.estado());
        assertEquals("application/json; charset=utf-8", respuesta.cabecera("Content-Type"));
        JsonObject cuerpo = respuesta.objeto();
        assertEquals("OK", cuerpo.get("estado").getAsString());
        assertEquals("OK", cuerpo.get("baseDatos").getAsString());
    }
}
