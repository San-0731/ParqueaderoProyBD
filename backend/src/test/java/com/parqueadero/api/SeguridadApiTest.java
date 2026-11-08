package com.parqueadero.api;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import com.parqueadero.Servidor;
import com.parqueadero.config.Configuracion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.lang.reflect.Constructor;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pruebas de seguridad básicas de la API: inyección SQL, textos demasiado
 * largos, caracteres especiales (UTF-8 de punta a punta), cuerpos con formas
 * inesperadas y que los errores no muestren detalles internos.
 */
class SeguridadApiTest extends PruebaApi {

    /** Textos que nunca deben aparecer en una respuesta: delatarían el código o la base. */
    private static final List<String> DETALLES_INTERNOS = List.of("Exception", "java.", "com.mysql",
            "com.parqueadero", "com.google", "SQLState", "jdbc:", "SELECT ", "INSERT ", "Duplicate entry",
            "constraint", "Communications link", "\tat ");

    private static void assertSinDetallesInternos(RespuestaHttp respuesta) {
        for (String detalle : DETALLES_INTERNOS) {
            assertFalse(respuesta.cuerpo().contains(detalle),
                    () -> "La respuesta muestra un detalle interno ('" + detalle + "'): " + respuesta.cuerpo());
        }
    }

    private static long contarFilas(String tabla) throws SQLException {
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement("SELECT COUNT(*) FROM " + tabla);
             ResultSet fila = consulta.executeQuery()) {
            fila.next();
            return fila.getLong(1);
        }
    }

    // ------------------------------------------------------------ inyección SQL

    /**
     * Inyección SQL en los filtros de búsqueda: como las consultas usan
     * PreparedStatement, el texto se compara como un dato y no se ejecuta.
     * No devuelve todos los registros, no hay error 500 y las tablas siguen ahí.
     */
    @ParameterizedTest(name = "búsqueda con [{0}]")
    @ValueSource(strings = {"' OR '1'='1", "ABC123'; DROP TABLE vehiculo; --", "\" OR \"\"=\"",
            "1 OR 1=1", "%' OR '%'='", "ABC123' UNION SELECT * FROM cliente --"})
    void laInyeccionSqlEnLasBusquedasNoFunciona(String ataque) throws SQLException {
        long vehiculosAntes = contarFilas("vehiculo");
        String valor = enUrl(ataque);

        for (String ruta : List.of("/vehiculos?identificador=", "/clientes?documento=",
                "/registros/activos?identificador=", "/registros?identificador=")) {
            RespuestaHttp respuesta = get(ruta + valor);
            assertEquals(200, respuesta.estado(), () -> ruta + " → " + respuesta.cuerpo());
            assertEquals(0, respuesta.lista().size(),
                    () -> ruta + " no debe devolver registros: " + respuesta.cuerpo());
        }
        assertEquals(vehiculosAntes, contarFilas("vehiculo"), "La tabla vehiculo sigue intacta");
        assertFalse(get("/vehiculos").lista().isEmpty(), "El listado normal sigue funcionando");
    }

    /** Inyección en la ruta: el id debe ser un número, así que responde 400. */
    @Test
    void laInyeccionSqlEnLaRutaResponde400() {
        assertError(get("/vehiculos/" + enUrl("1 OR 1=1")), 400, "DATOS_INVALIDOS");
        assertError(get("/clientes/" + enUrl("1; DROP TABLE cliente")), 400, "DATOS_INVALIDOS");
    }

    /** Inyección en una placa: el CHECK de formato la rechaza (400) y no se ejecuta nada. */
    @Test
    void laInyeccionSqlEnUnaPlacaResponde400() throws SQLException {
        long vehiculosAntes = contarFilas("vehiculo");

        assertError(post("/vehiculos", json(Map.of(
                "identificador", "ABC123'; DROP TABLE vehiculo; --",
                "idCliente", crearPropietarioPorApi()))), 400, "DATOS_INVALIDOS");

        assertEquals(vehiculosAntes, contarFilas("vehiculo"));
    }

    /** Un nombre con SQL se guarda y se devuelve como texto, sin ejecutarse. */
    @Test
    void unNombreConSqlSeGuardaComoTexto() throws SQLException {
        long clientesAntes = contarFilas("cliente");
        String nombre = "Robert'); DROP TABLE cliente;--";

        RespuestaHttp creado = post("/clientes", json(Map.of(
                "documento", documentoUnico(), "nombres", nombre, "apellidos", "Tablas")));

        assertEquals(201, creado.estado(), creado.cuerpo());
        long id = creado.objeto().get("idCliente").getAsLong();
        registrarPropietarioCreado(id);
        assertEquals(nombre, get("/clientes/" + id).objeto().get("nombres").getAsString());
        assertEquals(clientesAntes + 1, contarFilas("cliente"), "La tabla cliente sigue ahí, con uno más");
    }

    // ------------------------------------------------------------ textos largos

    /**
     * Campos más largos que su máximo: la validación del servicio responde 400
     * con un mensaje claro, nunca 500 (sin llegar al error de MySQL).
     */
    @ParameterizedTest(name = "{0} con {1} caracteres")
    @CsvSource({"documento, 21", "nombres, 81", "apellidos, 81", "telefono, 16", "nombres, 100000"})
    void unTextoDemasiadoLargoEnElPropietarioResponde400(String campo, int largo) {
        Map<String, Object> datos = new HashMap<>(Map.of(
                "documento", documentoUnico(), "nombres", "Ana", "apellidos", "Pérez"));
        datos.put(campo, "1".repeat(largo));

        String mensaje = assertError(post("/clientes", json(datos)), 400, "DATOS_INVALIDOS");
        assertTrue(mensaje.contains("más de"), mensaje);
    }

    /** Placa de más de 40 caracteres y color de más de 30 → 400. */
    @Test
    void unTextoDemasiadoLargoEnElVehiculoResponde400() {
        long propietario = crearPropietarioPorApi();

        assertError(post("/vehiculos", json(Map.of("identificador", "A".repeat(41),
                "idCliente", propietario))), 400, "DATOS_INVALIDOS");
        assertError(post("/vehiculos", json(Map.of("identificador", identificadorUnico(CARRO),
                "idCliente", propietario, "color", "x".repeat(31)))), 400, "DATOS_INVALIDOS");
    }

    /** Referencia de pago de más de 60 caracteres → 400, y el registro sigue abierto. */
    @Test
    void unaReferenciaDemasiadoLargaResponde400() throws SQLException {
        JsonObject carro = crearPropietarioYVehiculoPorApi(CARRO);
        long registro = registrarEntradaPorApi(carro.get("identificador").getAsString(),
                espacioNuevo(CARRO, true)).get("idRegistro").getAsLong();
        simularTiempoAdentro(registro, 60);

        assertError(post("/registros/" + registro + "/salida", json(Map.of(
                "idMetodoPago", idMetodoPago("Nequi"), "referencia", "R".repeat(61)))),
                400, "DATOS_INVALIDOS");
        assertEquals("ACTIVO", get("/registros/" + registro).objeto().get("estado").getAsString());
    }

    /** Un filtro de búsqueda enorme (5000 caracteres) no rompe el servidor. */
    @Test
    void unFiltroEnormeNoProvocaError500() {
        RespuestaHttp respuesta = get("/vehiculos?identificador=" + "A".repeat(5000));

        assertTrue(respuesta.estado() < 500, () -> "Respondió " + respuesta.estado());
        if (respuesta.estado() == 200) {
            assertEquals(0, respuesta.lista().size());
        }
    }

    // ------------------------------------------------------------ caracteres especiales

    /**
     * Tildes, ñ y emojis se guardan y se devuelven iguales: UTF-8 (utf8mb4) de
     * punta a punta, desde el JSON de la petición hasta la columna de MySQL.
     */
    @Test
    void tildesEnesYEmojisSeGuardanYSeDevuelvenIguales() throws SQLException {
        String nombres = "José Ñúñez 🚗";
        String apellidos = "Pérez Ávila 😀 ü";

        RespuestaHttp creado = post("/clientes", json(Map.of(
                "documento", documentoUnico(), "nombres", nombres, "apellidos", apellidos)));
        assertEquals(201, creado.estado(), creado.cuerpo());
        long id = creado.objeto().get("idCliente").getAsLong();
        registrarPropietarioCreado(id);

        assertEquals(nombres, creado.objeto().get("nombres").getAsString(), "Respuesta del POST");
        JsonObject consultado = get("/clientes/" + id).objeto();
        assertEquals(nombres, consultado.get("nombres").getAsString(), "Respuesta del GET");
        assertEquals(apellidos, consultado.get("apellidos").getAsString());
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(
                     "SELECT nombres, apellidos FROM cliente WHERE id_cliente = ?")) {
            consulta.setLong(1, id);
            try (ResultSet fila = consulta.executeQuery()) {
                assertTrue(fila.next());
                assertEquals(nombres, fila.getString("nombres"), "Lo guardado en MySQL");
                assertEquals(apellidos, fila.getString("apellidos"));
            }
        }

        String color = "Azul océano 🌊";
        RespuestaHttp vehiculo = post("/vehiculos", json(Map.of(
                "identificador", identificadorUnico(CARRO), "idCliente", id, "color", color)));
        assertEquals(201, vehiculo.estado(), vehiculo.cuerpo());
        registrarVehiculoCreado(vehiculo.objeto().get("idVehiculo").getAsLong());
        assertEquals(color, vehiculo.objeto().get("color").getAsString());
    }

    // ------------------------------------------------------------ cuerpos raros

    /**
     * Cuerpos vacíos, arreglos en vez de objetos, tipos equivocados (texto
     * donde va un número o un booleano) o texto que no es JSON → 400, nunca 500.
     */
    @ParameterizedTest(name = "{0} {1} con [{2}]")
    @CsvSource(delimiter = '|', quoteCharacter = '`', textBlock = """
            POST  | /vehiculos             | ``
            POST  | /vehiculos             | []
            POST  | /vehiculos             | [{"identificador": "ABC123", "idCliente": 1}]
            POST  | /vehiculos             | {"identificador": "ABC123", "idCliente": "uno"}
            POST  | /vehiculos             | {"identificador": "ABC123", "idCliente": 99999999999999999999}
            POST  | /vehiculos             | {"identificador": "ABC123", "idCliente": 1, "anio": "dos mil"}
            POST  | /clientes              | "solo un texto"
            POST  | /clientes              | null
            POST  | /clientes              | {"documento": "123", "nombres": {"a": 1}, "apellidos": "X"}
            POST  | /clientes              | documento=123&nombres=Ana
            POST  | /registros/entrada     | {"identificador": "ABC123", "idEspacio": "cinco"}
            PATCH | /espacios/1/habilitado | {"habilitado": 1}
            PATCH | /espacios/1/habilitado | {"habilitado": "true"}
            """)
    void unCuerpoConFormaInesperadaResponde400(String metodo, String ruta, String cuerpo) {
        RespuestaHttp respuesta = enviar(metodo, ruta, cuerpo);

        assertError(respuesta, 400, "DATOS_INVALIDOS");
        assertSinDetallesInternos(respuesta);
    }

    // ------------------------------------------------------------ sin filtración de detalles

    /**
     * Los errores que vienen de MySQL (UNIQUE, llave foránea, CHECK) se
     * traducen a mensajes para el usuario: no muestran nombres de restricciones,
     * SQL ni clases de Java.
     */
    @Test
    void losErroresDeLaBaseNoMuestranDetallesInternos() {
        JsonObject existente = crearPropietarioYVehiculoPorApi(CARRO);
        long propietario = existente.get("idCliente").getAsLong();

        RespuestaHttp duplicado = post("/vehiculos", json(Map.of(
                "identificador", existente.get("identificador").getAsString(), "idCliente", propietario)));
        assertError(duplicado, 409, "REGLA_NEGOCIO");
        RespuestaHttp sinPropietario = post("/vehiculos", json(Map.of(
                "identificador", identificadorUnico(CARRO), "idCliente", 999_999_999L)));
        assertError(sinPropietario, 400, "DATOS_INVALIDOS");
        RespuestaHttp anioInvalido = post("/vehiculos", json(Map.of(
                "identificador", identificadorUnico(CARRO), "idCliente", propietario, "anio", 1800)));
        assertError(anioInvalido, 400, "DATOS_INVALIDOS");

        for (RespuestaHttp respuesta : List.of(duplicado, sinPropietario, anioInvalido)) {
            assertSinDetallesInternos(respuesta);
            assertFalse(respuesta.cuerpo().matches(".*\\b(uq|fk|chk)_.*"),
                    () -> "Muestra el nombre de una restricción: " + respuesta.cuerpo());
        }
    }

    /**
     * Un error interno real (la base de datos no responde) llega como 500 con
     * un mensaje genérico: sin stack trace, clases, SQL ni datos de conexión.
     * La salud responde 503 diciendo solo que la base está en ERROR.
     *
     * <p>Para provocarlo se levanta un segundo servidor con una configuración
     * que apunta a un puerto donde no hay MySQL. El constructor de
     * {@link Configuracion} es privado (solo se crea con {@code cargar()}), así
     * que esta prueba lo usa por reflexión; el código del sistema no cambia.
     */
    @Test
    void unErrorInternoNoMuestraDetalles() throws Exception {
        Constructor<Configuracion> constructor = Configuracion.class.getDeclaredConstructor(Map.class);
        constructor.setAccessible(true);
        Configuracion sinBaseDeDatos = constructor.newInstance(Map.of(
                "DB_HOST", "127.0.0.1", "DB_PORT", "1", "DB_NAME", "parqueadero_test",
                "DB_USER", "usuario_prueba", "DB_PASSWORD", "clave_prueba",
                "DB_SSL", "false", "PORT", "8080", "CORS_ORIGIN", "http://localhost:5173"));
        Servidor servidorSinBase = new Servidor(sinBaseDeDatos);
        servidorSinBase.iniciar(0);
        try (HttpClient cliente = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build()) {
            String base = "http://localhost:" + servidorSinBase.getPuerto() + "/api";

            // Con token: para revisar la sesión el backend va a la base, que no responde
            // (sin token respondería 401 antes de tocarla).
            HttpResponse<String> vehiculos = cliente.send(
                    HttpRequest.newBuilder(URI.create(base + "/vehiculos"))
                            .header("Authorization", "Bearer token-cualquiera").GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            RespuestaHttp error = new RespuestaHttp(vehiculos.statusCode(), vehiculos.body(),
                    vehiculos.headers());
            assertError(error, 500, "ERROR_INTERNO");
            assertFormatoDeError(error);
            assertSinDetallesInternos(error);
            for (String dato : List.of("127.0.0.1", "parqueadero_test", "usuario_prueba", "clave_prueba")) {
                assertFalse(error.cuerpo().contains(dato), () -> "Muestra '" + dato + "': " + error.cuerpo());
            }

            HttpResponse<String> salud = cliente.send(
                    HttpRequest.newBuilder(URI.create(base + "/salud")).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            assertEquals(503, salud.statusCode());
            assertEquals("{\"estado\":\"OK\",\"baseDatos\":\"ERROR\"}", salud.body());
        } finally {
            servidorSinBase.detener();
        }
    }
}
