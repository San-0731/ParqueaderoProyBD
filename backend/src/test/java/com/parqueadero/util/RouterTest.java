package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.MetodoNoPermitidoException;
import com.parqueadero.exception.NoAutenticadoException;
import com.parqueadero.exception.RutaNoEncontradaException;
import com.parqueadero.exception.SinPermisoException;
import com.parqueadero.model.Rol;
import com.parqueadero.model.Usuario;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Pruebas del {@link Router}, sin levantar el servidor HTTP. */
class RouterTest {

    /** Manejador de prueba que devuelve la propia petición como cuerpo. */
    private static final Manejador ECO = Respuesta::ok;

    /** Despacha y devuelve la {@link Peticion} que recibió el manejador ECO. */
    private static Peticion eco(Router router, String metodo, String uri, String cuerpo) {
        return (Peticion) router.despachar(metodo, URI.create(uri), cuerpo).cuerpo();
    }

    // ----------------------------------------------------- coincidencia

    @Test
    void resolver_rutaExactaCoincide() {
        Manejador salud = p -> Respuesta.ok("salud");
        Router router = new Router().get("/api/salud", salud);

        Router.Coincidencia coincidencia = router.resolver("GET", "/api/salud");

        assertSame(salud, coincidencia.manejador());
        assertEquals(Map.of(), coincidencia.parametrosRuta());
    }

    @Test
    void resolver_extraeElId() {
        Router router = new Router().get("/api/vehiculos/{id}", ECO);

        assertEquals(Map.of("id", "15"), router.resolver("GET", "/api/vehiculos/15").parametrosRuta());
    }

    @Test
    void resolver_parametroEnMedioDeLaRuta() {
        Router router = new Router().post("/api/registros/{id}/salida", ECO);

        assertEquals(Map.of("id", "7"),
                router.resolver("POST", "/api/registros/7/salida").parametrosRuta());
    }

    @Test
    void resolver_segmentosDeMasNoCoinciden() {
        Router router = new Router().get("/api/vehiculos/{id}", ECO);

        assertThrows(RutaNoEncontradaException.class,
                () -> router.resolver("GET", "/api/vehiculos/15/extra"));
    }

    @Test
    void resolver_segmentosDeMenosNoCoinciden() {
        Router router = new Router().post("/api/registros/{id}/salida", ECO);

        assertThrows(RutaNoEncontradaException.class,
                () -> router.resolver("POST", "/api/registros/7"));
    }

    @Test
    void resolver_barraFinalSeIgnora() {
        Manejador listar = p -> Respuesta.ok("lista");
        Router router = new Router().get("/api/vehiculos", listar);

        assertSame(listar, router.resolver("GET", "/api/vehiculos/").manejador());
    }

    @Test
    void resolver_segmentoVacioEnMedioNoCoincide() {
        Router router = new Router().get("/api/vehiculos/{id}", ECO);

        assertThrows(RutaNoEncontradaException.class,
                () -> router.resolver("GET", "/api//vehiculos"));
    }

    @Test
    void resolver_literalTienePrioridadSobreParametro() {
        Manejador activos = p -> Respuesta.ok("activos");
        Manejador porId = p -> Respuesta.ok("porId");

        // Se prueba en los dos órdenes de registro: el resultado no debe cambiar.
        Router literalPrimero = new Router()
                .get("/api/registros/activos", activos)
                .get("/api/registros/{id}", porId);
        Router parametroPrimero = new Router()
                .get("/api/registros/{id}", porId)
                .get("/api/registros/activos", activos);

        for (Router router : List.of(literalPrimero, parametroPrimero)) {
            assertSame(activos, router.resolver("GET", "/api/registros/activos").manejador());
            assertSame(porId, router.resolver("GET", "/api/registros/15").manejador());
        }
    }

    @Test
    void resolver_rutaLiteralConOtroMetodoDa405EnVezDeUsarElParametro() {
        Router router = new Router()
                .get("/api/registros/{id}", ECO)
                .post("/api/registros/entrada", ECO);

        MetodoNoPermitidoException error = assertThrows(MetodoNoPermitidoException.class,
                () -> router.resolver("GET", "/api/registros/entrada"));

        assertEquals(List.of("POST"), error.getMetodosPermitidos());
    }

    @Test
    void resolver_rutaInexistenteLanza404() {
        Router router = new Router().get("/api/vehiculos", ECO);

        RutaNoEncontradaException error = assertThrows(RutaNoEncontradaException.class,
                () -> router.resolver("GET", "/api/xyz"));

        assertEquals(404, error.getEstadoHttp());
        assertEquals("No existe la ruta GET /api/xyz.", error.getMessage());
    }

    @Test
    void resolver_otroMetodoLanza405ConMetodosPermitidos() {
        Router router = new Router()
                .put("/api/vehiculos/{id}", ECO)
                .get("/api/vehiculos/{id}", ECO);

        MetodoNoPermitidoException error = assertThrows(MetodoNoPermitidoException.class,
                () -> router.resolver("DELETE", "/api/vehiculos/5"));

        assertEquals(405, error.getEstadoHttp());
        assertEquals(List.of("GET", "PUT"), error.getMetodosPermitidos());
        assertEquals("El método DELETE no está permitido en /api/vehiculos/5."
                + " Métodos permitidos: GET, PUT.", error.getMessage());
    }

    @Test
    void resolver_metodoEnMinusculasFunciona() {
        Router router = new Router().get("/api/vehiculos", ECO);

        assertSame(ECO, router.resolver("get", "/api/vehiculos").manejador());
    }

    // ------------------------------------------------------- query string

    @Test
    void parsearQuery_decodificaValores() {
        Map<String, String> query = Router.parsearQuery(
                "identificador=abc%2D123&nombre=ma%C3%B1ana&texto=hola+mundo");

        assertEquals("abc-123", query.get("identificador"));
        assertEquals("mañana", query.get("nombre"));
        assertEquals("hola mundo", query.get("texto"));
    }

    @Test
    void parsearQuery_claveSinValorYParesVacios() {
        Map<String, String> query = Router.parsearQuery("a&&b=&c=1&=x&c=2");

        assertEquals(Map.of("a", "", "b", "", "c", "1"), query);
    }

    @Test
    void parsearQuery_nulaOVaciaDaMapaVacio() {
        assertEquals(Map.of(), Router.parsearQuery(null));
        assertEquals(Map.of(), Router.parsearQuery(""));
    }

    // ------------------------------------------------- parámetros de ruta

    @Test
    void parametroRuta_decodificaUtf8YConservaElMas() {
        Router router = new Router().get("/api/prueba/{texto}", ECO);

        assertEquals("mañana", eco(router, "GET", "/api/prueba/ma%C3%B1ana", null)
                .parametroRuta("texto"));
        assertEquals("a+b", eco(router, "GET", "/api/prueba/a+b", null).parametroRuta("texto"));
    }

    @Test
    void parametroRuta_barraCodificadaNoCreaSegmentos() {
        Router router = new Router().get("/api/prueba/{texto}", ECO);

        assertEquals("a/b", eco(router, "GET", "/api/prueba/a%2Fb", null).parametroRuta("texto"));
    }

    @Test
    void parametroRuta_inexistenteEsErrorDeProgramacion() {
        Router router = new Router().get("/api/vehiculos/{id}", ECO);
        Peticion peticion = eco(router, "GET", "/api/vehiculos/15", null);

        assertThrows(IllegalArgumentException.class, () -> peticion.parametroRuta("idVehiculo"));
    }

    @Test
    void parametroRutaComoLong_numeroValido() {
        Router router = new Router().get("/api/vehiculos/{id}", ECO);

        assertEquals(15L, eco(router, "GET", "/api/vehiculos/15", null).parametroRutaComoLong("id"));
    }

    @Test
    void parametroRutaComoLong_noNumericoLanzaDatosInvalidos() {
        Router router = new Router().get("/api/vehiculos/{id}", ECO);
        Peticion peticion = eco(router, "GET", "/api/vehiculos/abc", null);

        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> peticion.parametroRutaComoLong("id"));

        assertEquals("El parámetro 'id' de la ruta debe ser un número entero; se recibió 'abc'.",
                error.getMessage());
    }

    @Test
    void parametroQueryComoLong_casos() {
        Router router = new Router().get("/api/espacios", ECO);
        Peticion peticion = eco(router, "GET", "/api/espacios?idTipo=3&vacio=&texto=x", null);

        assertEquals(3L, peticion.parametroQueryComoLong("idTipo"));
        assertNull(peticion.parametroQueryComoLong("noViene"));
        assertNull(peticion.parametroQueryComoLong("vacio"));
        assertThrows(DatosInvalidosException.class, () -> peticion.parametroQueryComoLong("texto"));
    }

    @Test
    void parametroQueryComoBoolean_casos() {
        Router router = new Router().get("/api/espacios", ECO);
        Peticion peticion = eco(router, "GET",
                "/api/espacios?a=true&b=FALSE&c=%20True%20&vacio=&texto=si", null);

        assertEquals(true, peticion.parametroQueryComoBoolean("a"));
        assertEquals(false, peticion.parametroQueryComoBoolean("b"));
        assertEquals(true, peticion.parametroQueryComoBoolean("c"));
        assertNull(peticion.parametroQueryComoBoolean("noViene"));
        assertNull(peticion.parametroQueryComoBoolean("vacio"));
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> peticion.parametroQueryComoBoolean("texto"));
        assertEquals("El parámetro 'texto' debe ser true o false; se recibió 'si'.",
                error.getMessage());
    }

    @Test
    void parametroQueryComoFecha_casos() {
        Router router = new Router().get("/api/registros", ECO);
        Peticion peticion = eco(router, "GET", "/api/registros?desde=2026-10-01&hasta=%202026-10-31%20"
                + "&vacio=&dmy=31-10-2026&inexistente=2026-02-30&anioLargo=%2B20000-01-01"
                + "&conHora=2026-10-01T10:00", null);

        assertEquals(LocalDate.of(2026, 10, 1), peticion.parametroQueryComoFecha("desde"));
        assertEquals(LocalDate.of(2026, 10, 31), peticion.parametroQueryComoFecha("hasta"));
        assertNull(peticion.parametroQueryComoFecha("noViene"));
        assertNull(peticion.parametroQueryComoFecha("vacio"));
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> peticion.parametroQueryComoFecha("dmy"));
        assertEquals("El parámetro 'dmy' debe ser una fecha con formato 2026-11-03;"
                + " se recibió '31-10-2026'.", error.getMessage());
        for (String invalido : List.of("inexistente", "anioLargo", "conHora")) {
            assertThrows(DatosInvalidosException.class,
                    () -> peticion.parametroQueryComoFecha(invalido), invalido);
        }
    }

    @Test
    void urlMalCodificadaLanzaDatosInvalidos() {
        Router router = new Router().get("/api/prueba/{texto}", ECO);

        assertThrows(DatosInvalidosException.class, () -> router.resolver("GET", "/api/prueba/%ZZ"));
        assertThrows(DatosInvalidosException.class, () -> Router.parsearQuery("a=%ZZ"));
    }

    // ---------------------------------------------------------- despachar

    @Test
    void despachar_pasaPeticionCompletaAlManejador() {
        Router router = new Router().post("/api/registros/{id}/salida", ECO);

        Peticion peticion = eco(router, "post",
                "/api/registros/7/salida?identificador=abc%2D123", "{\"idMetodoPago\":2}");

        assertEquals("POST", peticion.metodo());
        assertEquals("/api/registros/7/salida", peticion.ruta());
        assertEquals(7L, peticion.parametroRutaComoLong("id"));
        assertEquals("abc-123", peticion.parametroQuery("identificador"));
        assertEquals("{\"idMetodoPago\":2}", peticion.cuerpo());
    }

    @Test
    void despachar_devuelveLaRespuestaDelManejador() {
        Router router = new Router().post("/api/vehiculos", p -> Respuesta.creado("nuevo"));

        Respuesta respuesta = router.despachar("POST", URI.create("/api/vehiculos"), "{}");

        assertEquals(new Respuesta(201, "nuevo"), respuesta);
    }

    // ---------------------------------------------------------- sesión y rol

    private static final Usuario OPERADOR = new Usuario(1, "ana", "Ana", Rol.OPERADOR, true);
    private static final Usuario ADMINISTRADOR = new Usuario(2, "beto", "Beto", Rol.ADMINISTRADOR, true);

    /** Autenticador de prueba: "t-operador" y "t-admin" son sesiones válidas; nada más. */
    private static final Autenticador AUTENTICADOR = token -> switch (token) {
        case "t-operador" -> Optional.of(OPERADOR);
        case "t-admin" -> Optional.of(ADMINISTRADOR);
        default -> Optional.empty();
    };

    private static Peticion ecoConToken(Router router, String metodo, String uri, String token) {
        return (Peticion) router.despachar(metodo, URI.create(uri), null, token).cuerpo();
    }

    @Test
    void rutaPublica_noBuscaElUsuarioAunqueVengaToken() {
        AtomicInteger consultas = new AtomicInteger();
        Router router = new Router(token -> {
            consultas.incrementAndGet();
            return Optional.of(OPERADOR);
        }).get("/api/salud", ECO);

        Peticion peticion = ecoConToken(router, "GET", "/api/salud", "t-operador");

        assertNull(peticion.usuario(), "En una ruta pública no se busca el usuario");
        assertEquals("t-operador", peticion.token());
        assertEquals(0, consultas.get(), "No se consulta la sesión en la base");
    }

    @Test
    void rutaConRol_sinTokenResponde401() {
        Router router = new Router(AUTENTICADOR).get("/api/auth/yo", Rol.OPERADOR, ECO);

        NoAutenticadoException error = assertThrows(NoAutenticadoException.class,
                () -> ecoConToken(router, "GET", "/api/auth/yo", null));

        assertEquals(Peticion.MENSAJE_SIN_SESION, error.getMessage());
        assertEquals(401, error.getEstadoHttp());
    }

    @Test
    void rutaConRol_conTokenInvalidoResponde401() {
        Router router = new Router(AUTENTICADOR).get("/api/auth/yo", Rol.OPERADOR, ECO);

        NoAutenticadoException error = assertThrows(NoAutenticadoException.class,
                () -> ecoConToken(router, "GET", "/api/auth/yo", "token-vencido"));

        assertEquals(Peticion.MENSAJE_SESION_INVALIDA, error.getMessage());
    }

    @Test
    void rutaConRol_conRolSuficientePasaElUsuarioAlManejador() {
        Router router = new Router(AUTENTICADOR).get("/api/reportes", Rol.ADMINISTRADOR, ECO);

        Peticion peticion = ecoConToken(router, "GET", "/api/reportes", "t-admin");

        assertSame(ADMINISTRADOR, peticion.usuario());
        assertSame(ADMINISTRADOR, peticion.usuarioAutenticado());
    }

    @Test
    void rutaConRol_conRolInsuficienteResponde403() {
        Router router = new Router(AUTENTICADOR).get("/api/reportes", Rol.ADMINISTRADOR, ECO);

        SinPermisoException error = assertThrows(SinPermisoException.class,
                () -> ecoConToken(router, "GET", "/api/reportes", "t-operador"));

        assertEquals(403, error.getEstadoHttp());
        assertEquals("Solo un usuario Administrador o DBA puede hacer esto.", error.getMessage());
    }

    @Test
    void routerSinAutenticador_noAceptaNingunToken() {
        Router router = new Router().get("/api/auth/yo", Rol.OPERADOR, ECO);

        assertThrows(NoAutenticadoException.class,
                () -> ecoConToken(router, "GET", "/api/auth/yo", "t-operador"));
    }

    @ParameterizedTest
    @CsvSource({
        "OPERADOR, 'Solo un usuario Operador o Administrador o DBA puede hacer esto.'",
        "ADMINISTRADOR, 'Solo un usuario Administrador o DBA puede hacer esto.'",
        "DBA, 'Solo un usuario DBA puede hacer esto.'",
    })
    void mensajeSinPermiso_nombraLosRolesQueSiPueden(Rol minimo, String esperado) {
        assertEquals(esperado, Router.mensajeSinPermiso(minimo));
    }

    @Test
    void usuarioAutenticado_sinSesionLanza401() {
        Router router = new Router().get("/api/salud", ECO);

        Peticion sinToken = ecoConToken(router, "GET", "/api/salud", null);
        Peticion conToken = ecoConToken(router, "GET", "/api/salud", "algo");

        assertEquals(Peticion.MENSAJE_SIN_SESION,
                assertThrows(NoAutenticadoException.class, sinToken::usuarioAutenticado).getMessage());
        assertEquals(Peticion.MENSAJE_SESION_INVALIDA,
                assertThrows(NoAutenticadoException.class, conToken::usuarioAutenticado).getMessage());
    }

    // ---------------------------------------------------------- registro

    @Test
    void registrar_rutaDuplicadaOMetodoNoSoportadoFalla() {
        Router router = new Router().get("/api/vehiculos/{id}", ECO);

        // Misma forma aunque el parámetro tenga otro nombre.
        assertThrows(IllegalArgumentException.class,
                () -> router.get("/api/vehiculos/{idVehiculo}", ECO));
        assertThrows(IllegalArgumentException.class,
                () -> router.agregar("HEAD", "/api/vehiculos", ECO));
        assertThrows(IllegalArgumentException.class,
                () -> router.get("api/sin-barra", ECO));
    }
}
