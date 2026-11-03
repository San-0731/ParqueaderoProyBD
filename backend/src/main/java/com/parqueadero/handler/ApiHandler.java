package com.parqueadero.handler;

import com.parqueadero.exception.AplicacionException;
import com.parqueadero.exception.MetodoNoPermitidoException;
import com.parqueadero.util.Json;
import com.parqueadero.util.Respuesta;
import com.parqueadero.util.Router;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;

/**
 * Único {@link HttpHandler} registrado en el {@code HttpServer} (contexto
 * {@code /api}). Es el puente entre el servidor del JDK y el {@link Router}:
 *
 * <ol>
 *   <li>Agrega las cabeceras CORS a <b>todas</b> las respuestas, incluidos los errores.</li>
 *   <li>Responde las peticiones {@code OPTIONS} (preflight de CORS) con 204,
 *       antes de buscar la ruta.</li>
 *   <li>Lee el cuerpo, le pide al {@link Router} que despache y obtiene una {@link Respuesta}.</li>
 *   <li>Convierte cualquier excepción en el JSON de error uniforme.</li>
 *   <li>Escribe la respuesta como JSON en UTF-8.</li>
 * </ol>
 *
 * <p>Así los handlers de cada recurso (vehículos, espacios...) solo devuelven
 * datos: no tocan {@code HttpExchange}, cabeceras ni manejo de errores.
 */
public final class ApiHandler implements HttpHandler {

    private static final String TIPO_JSON = "application/json; charset=utf-8";

    /** Métodos que se anuncian por CORS: los del router más OPTIONS. */
    private static final String METODOS_CORS =
            String.join(", ", Router.METODOS_SOPORTADOS) + ", OPTIONS";

    private final Router router;
    private final String origenCors;

    public ApiHandler(Router router, String origenCors) {
        this.router = router;
        this.origenCors = origenCors;
    }

    @Override
    public void handle(HttpExchange intercambio) throws IOException {
        // try-with-resources: el intercambio se cierra siempre, pase lo que pase.
        try (intercambio) {
            Headers cabeceras = intercambio.getResponseHeaders();
            agregarCabecerasCors(cabeceras);

            String metodo = intercambio.getRequestMethod();
            URI uri = intercambio.getRequestURI();
            Respuesta respuesta;
            if ("OPTIONS".equalsIgnoreCase(metodo)) {
                // Preflight: el navegador pregunta si puede hacer la petición real.
                respuesta = Respuesta.sinContenido();
            } else {
                respuesta = atender(intercambio, metodo, uri, cabeceras);
            }
            enviar(intercambio, respuesta);
        }
    }

    /** Despacha la petición al router y convierte las excepciones en respuestas de error. */
    private Respuesta atender(HttpExchange intercambio, String metodo, URI uri, Headers cabeceras)
            throws IOException {
        String cuerpo = new String(intercambio.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        try {
            return router.despachar(metodo, uri, cuerpo);
        } catch (AplicacionException e) {
            if (e instanceof MetodoNoPermitidoException noPermitido) {
                // HTTP exige la cabecera Allow en las respuestas 405.
                cabeceras.set("Allow", String.join(", ", noPermitido.getMetodosPermitidos()));
            }
            return Respuesta.deError(e);
        } catch (RuntimeException e) {
            // Error no previsto: el detalle solo va a la consola; el cliente recibe
            // un mensaje genérico (500).
            System.err.println("Error interno atendiendo " + metodo + " " + uri + ":");
            e.printStackTrace();
            return Respuesta.deError(e);
        }
    }

    private void agregarCabecerasCors(Headers cabeceras) {
        cabeceras.set("Access-Control-Allow-Origin", origenCors);
        cabeceras.set("Access-Control-Allow-Methods", METODOS_CORS);
        cabeceras.set("Access-Control-Allow-Headers", "Content-Type");
    }

    /**
     * Escribe la respuesta. Sin cuerpo (204 o {@code null}) se envía la
     * longitud -1, que para {@code HttpServer} significa "no hay cuerpo".
     */
    private static void enviar(HttpExchange intercambio, Respuesta respuesta) throws IOException {
        if (respuesta.estado() == 204 || respuesta.cuerpo() == null) {
            intercambio.sendResponseHeaders(respuesta.estado(), -1);
            return;
        }
        // Los mensajes tienen tildes y ñ: se envían los bytes en UTF-8 y se
        // declara el charset en Content-Type.
        byte[] bytes = Json.aJson(respuesta.cuerpo()).getBytes(StandardCharsets.UTF_8);
        intercambio.getResponseHeaders().set("Content-Type", TIPO_JSON);
        intercambio.sendResponseHeaders(respuesta.estado(), bytes.length);
        try (OutputStream salida = intercambio.getResponseBody()) {
            salida.write(bytes);
        }
    }
}
