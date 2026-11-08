package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Formato uniforme de los errores y cabeceras CORS. Todo error llega como
 * {@code {"error": "CODIGO", "mensaje": "..."}}, en JSON, con el código HTTP
 * que corresponde.
 */
class FormatoErroresApiTest extends PruebaApi {

    /** Una ruta que no existe → 404 RUTA_NO_ENCONTRADA. */
    @Test
    void rutaInexistenteResponde404() {
        assertError(get("/no-existe"), 404, "RUTA_NO_ENCONTRADA");
    }

    /** Un método que la ruta no acepta → 405 con la cabecera Allow (la exige HTTP). */
    @Test
    void metodoNoPermitidoResponde405ConAllow() {
        RespuestaHttp salud = post("/salud", "{}");
        assertError(salud, 405, "METODO_NO_PERMITIDO");
        assertEquals("GET", salud.cabecera("Allow"));

        RespuestaHttp borrar = enviar("DELETE", "/vehiculos/1", null);
        assertError(borrar, 405, "METODO_NO_PERMITIDO");
        assertEquals("GET, PUT", borrar.cabecera("Allow"));
    }

    /**
     * Toda respuesta de error tiene solo "error" y "mensaje", en JSON UTF-8 y
     * con la cabecera CORS (si no, el navegador no dejaría leer el error).
     */
    @ParameterizedTest(name = "{0} {1} → {3} {4}")
    @CsvSource(delimiter = '|', nullValues = "NULO", textBlock = """
            GET    | /no-existe                  | NULO                | 404 | RUTA_NO_ENCONTRADA
            DELETE | /espacios/1                 | NULO                | 405 | METODO_NO_PERMITIDO
            GET    | /vehiculos/999999999        | NULO                | 404 | NO_ENCONTRADO
            GET    | /vehiculos/abc              | NULO                | 400 | DATOS_INVALIDOS
            POST   | /registros/entrada          | {}                  | 400 | DATOS_INVALIDOS
            POST   | /clientes                   | { "documento":      | 400 | DATOS_INVALIDOS
            PATCH  | /espacios/1/habilitado      | { "habilitado": "si" } | 400 | DATOS_INVALIDOS
            GET    | /registros?desde=31-10-2026 | NULO                | 400 | DATOS_INVALIDOS
            """)
    void todaRespuestaDeErrorTieneErrorYMensaje(String metodo, String ruta, String cuerpo,
            int estado, String error) {
        RespuestaHttp respuesta = enviar(metodo, ruta, cuerpo);

        assertError(respuesta, estado, error);
        assertFormatoDeError(respuesta);
        assertEquals("application/json; charset=utf-8", respuesta.cabecera("Content-Type"));
        assertNotNull(respuesta.cabecera("Access-Control-Allow-Origin"), "CORS también en los errores");
    }

    /**
     * Preflight de CORS: el navegador pregunta con OPTIONS antes de un POST
     * desde el frontend. Responde 204 sin cuerpo y con las cabeceras Access-Control-Allow-*.
     */
    @Test
    void optionsResponde204ConCabecerasCors() {
        RespuestaHttp respuesta = enviar("OPTIONS", "/vehiculos", null);

        assertEquals(204, respuesta.estado());
        assertTrue(respuesta.cuerpo().isEmpty(), "Sin cuerpo");
        assertEquals(configuracion().getOrigenCors(), respuesta.cabecera("Access-Control-Allow-Origin"));
        String metodos = respuesta.cabecera("Access-Control-Allow-Methods");
        assertNotNull(metodos);
        for (String metodo : new String[] {"GET", "POST", "PUT", "PATCH", "OPTIONS"}) {
            assertTrue(metodos.contains(metodo), "Falta " + metodo + " en " + metodos);
        }
        // Authorization: por ahí viaja el token de la sesión (Fase 5).
        assertEquals("Content-Type, Authorization", respuesta.cabecera("Access-Control-Allow-Headers"));
    }
}
