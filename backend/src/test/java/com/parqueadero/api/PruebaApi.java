package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.parqueadero.Servidor;
import com.parqueadero.integracion.PruebaIntegracion;
import com.parqueadero.util.Json;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;

/**
 * Base de las pruebas de la API: antes de las pruebas de cada clase levanta el
 * {@link Servidor} completo en un puerto libre contra {@code parqueadero_test}
 * y al final lo detiene. Las peticiones son HTTP reales, hechas con
 * {@link HttpClient} del JDK, y el JSON se lee con la clase {@link Json} del
 * proyecto.
 *
 * <p>Los servicios confirman sus propias transacciones, así que aquí no hay
 * {@code rollback()}: cada prueba crea sus datos con identificadores únicos y
 * en espacios propios, y {@link PruebaIntegracion#limpiarDatosCreados()} los
 * borra al terminar (incluidos los registros y pagos que hizo la API).
 */
abstract class PruebaApi extends PruebaIntegracion {

    private static Servidor servidor;
    private static HttpClient clienteHttp;
    private static String urlBase;

    /** Respuesta HTTP recibida: código de estado, cuerpo y cabeceras. */
    protected record RespuestaHttp(int estado, String cuerpo, HttpHeaders cabeceras) {

        /** El cuerpo como objeto JSON. */
        JsonObject objeto() {
            return Json.desdeJson(cuerpo, JsonObject.class);
        }

        /** El cuerpo como lista JSON. */
        JsonArray lista() {
            return Json.desdeJson(cuerpo, JsonArray.class);
        }

        /** Valor de una cabecera, o {@code null} si no vino. */
        String cabecera(String nombre) {
            return cabeceras.firstValue(nombre).orElse(null);
        }
    }

    @BeforeAll
    static void iniciarServidor() throws IOException {
        servidor = new Servidor(configuracion());
        servidor.iniciar(0);
        urlBase = "http://localhost:" + servidor.getPuerto() + "/api";
        // HTTP/1.1: es lo que habla HttpServer del JDK (así el cliente no intenta HTTP/2).
        clienteHttp = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @AfterAll
    static void detenerServidor() {
        if (clienteHttp != null) {
            clienteHttp.close();
        }
        if (servidor != null) {
            servidor.detener();
        }
    }

    // ------------------------------------------------------------ peticiones

    protected static RespuestaHttp get(String ruta) {
        return enviar("GET", ruta, null);
    }

    protected static RespuestaHttp post(String ruta, String json) {
        return enviar("POST", ruta, json);
    }

    protected static RespuestaHttp put(String ruta, String json) {
        return enviar("PUT", ruta, json);
    }

    protected static RespuestaHttp patch(String ruta, String json) {
        return enviar("PATCH", ruta, json);
    }

    /**
     * Hace una petición a {@code /api + ruta}. Con {@code cuerpo} distinto de
     * {@code null} lo envía como JSON.
     */
    protected static RespuestaHttp enviar(String metodo, String ruta, String cuerpo) {
        HttpRequest.Builder peticion = HttpRequest.newBuilder(URI.create(urlBase + ruta))
                .timeout(Duration.ofSeconds(15));
        if (cuerpo == null) {
            peticion.method(metodo, HttpRequest.BodyPublishers.noBody());
        } else {
            peticion.header("Content-Type", "application/json; charset=utf-8")
                    .method(metodo, HttpRequest.BodyPublishers.ofString(cuerpo, StandardCharsets.UTF_8));
        }
        try {
            HttpResponse<String> respuesta = clienteHttp.send(peticion.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return new RespuestaHttp(respuesta.statusCode(), respuesta.body(), respuesta.headers());
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo hacer " + metodo + " " + ruta + ": " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Petición interrumpida: " + metodo + " " + ruta, e);
        }
    }

    /** Convierte un mapa en JSON con la clase {@link Json} del proyecto (sin armar el texto a mano). */
    protected static String json(Map<String, ?> datos) {
        return Json.aJson(datos);
    }

    /** Codifica un valor para ponerlo en la URL ({@code "abc 123"} → {@code "abc+123"}). */
    protected static String enUrl(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }

    /** {@code "ABC123"} → {@code "abc-123"}: la placa como la escribiría alguien a la carrera. */
    protected static String enMinusculasConGuion(String placa) {
        return placa.substring(0, 3).toLowerCase(Locale.ROOT) + "-" + placa.substring(3);
    }

    // ------------------------------------------------------------ datos por la API

    /** Crea un propietario con {@code POST /api/clientes} y lo anota para borrarlo al final. */
    protected long crearPropietarioPorApi() {
        RespuestaHttp respuesta = post("/clientes", json(Map.of(
                "documento", documentoUnico(), "nombres", "Prueba", "apellidos", "API")));
        assertEquals(201, respuesta.estado(), respuesta.cuerpo());
        long idCliente = respuesta.objeto().get("idCliente").getAsLong();
        registrarPropietarioCreado(idCliente);
        return idCliente;
    }

    /**
     * Crea un vehículo con {@code POST /api/vehiculos} (el tipo sale de la
     * placa) y lo anota para borrarlo al final.
     *
     * @param tipo una de las constantes de {@link com.parqueadero.util.TipoPorPlaca}
     * @return el vehículo creado, como lo devolvió la API
     */
    protected JsonObject crearVehiculoPorApi(String tipo, long idCliente) {
        RespuestaHttp respuesta = post("/vehiculos", json(Map.of(
                "identificador", identificadorUnico(tipo), "idCliente", idCliente)));
        assertEquals(201, respuesta.estado(), respuesta.cuerpo());
        JsonObject vehiculo = respuesta.objeto();
        registrarVehiculoCreado(vehiculo.get("idVehiculo").getAsLong());
        return vehiculo;
    }

    /** Propietario y vehículo nuevos, creados por la API. */
    protected JsonObject crearPropietarioYVehiculoPorApi(String tipo) {
        return crearVehiculoPorApi(tipo, crearPropietarioPorApi());
    }

    /** Crea (y confirma) un espacio propio de la prueba; se borra al final. */
    protected long espacioNuevo(String tipo, boolean habilitado) throws SQLException {
        try (Connection conexion = conexion()) {
            return crearEspacio(conexion, tipo, habilitado);
        }
    }

    /** Registra la entrada con {@code POST /api/registros/entrada} y exige 201. */
    protected static JsonObject registrarEntradaPorApi(String identificador, long idEspacio) {
        RespuestaHttp respuesta = post("/registros/entrada", json(Map.of(
                "identificador", identificador, "idEspacio", idEspacio)));
        assertEquals(201, respuesta.estado(), respuesta.cuerpo());
        return respuesta.objeto();
    }

    /**
     * Simula que el vehículo lleva {@code minutos} adentro moviendo hacia atrás
     * la hora de entrada (una prueba no puede esperar dos horas). Solo cambia
     * los datos de la prueba, no la lógica del sistema; así la salida tiene
     * algo que cobrar (con 0 minutos no se cobra) y no choca con el CHECK de
     * que la salida sea posterior a la entrada.
     */
    protected static void simularTiempoAdentro(long idRegistro, int minutos) throws SQLException {
        try (Connection conexion = conexion();
             PreparedStatement cambio = conexion.prepareStatement("UPDATE registro_parqueo"
                     + " SET entrada = NOW() - INTERVAL ? MINUTE"
                     + " WHERE id_registro = ? AND estado = 'ACTIVO'")) {
            cambio.setInt(1, minutos);
            cambio.setLong(2, idRegistro);
            assertEquals(1, cambio.executeUpdate(), "El registro " + idRegistro + " debía estar activo");
        }
    }

    /** Id de un método de pago por su nombre, consultado en {@code GET /api/metodos-pago}. */
    protected static long idMetodoPago(String nombre) {
        for (JsonElement metodo : get("/metodos-pago").lista()) {
            if (metodo.getAsJsonObject().get("nombre").getAsString().equals(nombre)) {
                return metodo.getAsJsonObject().get("idMetodo").getAsLong();
            }
        }
        throw new IllegalArgumentException("No existe el método de pago " + nombre);
    }

    // ------------------------------------------------------------ afirmaciones

    /**
     * Comprueba una respuesta de error: el código HTTP, el JSON uniforme
     * {@code {"error": ..., "mensaje": ...}} y el código de error.
     *
     * @return el mensaje del error, por si la prueba quiere revisarlo
     */
    protected static String assertError(RespuestaHttp respuesta, int estadoEsperado, String errorEsperado) {
        assertEquals(estadoEsperado, respuesta.estado(), () -> "Respuesta: " + respuesta.cuerpo());
        JsonObject cuerpo = respuesta.objeto();
        assertEquals(errorEsperado, cuerpo.get("error").getAsString(), respuesta.cuerpo());
        assertNotNull(cuerpo.get("mensaje"), "Todo error trae un mensaje");
        String mensaje = cuerpo.get("mensaje").getAsString();
        assertFalse(mensaje.isBlank(), "El mensaje de error no puede estar vacío");
        return mensaje;
    }

    /** Comprueba que el JSON de error tiene exactamente los campos {@code error} y {@code mensaje}. */
    protected static void assertFormatoDeError(RespuestaHttp respuesta) {
        JsonObject cuerpo = respuesta.objeto();
        assertEquals(2, cuerpo.size(), () -> "Solo 'error' y 'mensaje': " + respuesta.cuerpo());
        assertTrue(cuerpo.has("error") && cuerpo.has("mensaje"), respuesta.cuerpo());
    }
}
