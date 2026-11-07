package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.parqueadero.model.Rol;
import com.parqueadero.util.Peticion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Map;

/**
 * Permisos de cada ruta (sección 4 del plan de la Fase 5): sin sesión → 401;
 * con un rol que no alcanza → 403; con el rol suficiente, la petición llega al
 * servicio (puede dar 200, 400 o 404, pero nunca 401 ni 403).
 */
class PermisosApiTest extends PruebaApi {

    private static final String MENSAJE_SOLO_ADMINISTRADOR =
            "Solo un usuario Administrador o DBA puede hacer esto.";

    /** Un cuerpo cualquiera para las rutas que lo esperan (el permiso se revisa antes). */
    private static final String CUERPO = "{}";

    // ------------------------------------------------------------ sin sesión

    @ParameterizedTest(name = "{0} {1} sin sesión → 401")
    @CsvSource({
        "GET, /auth/yo", "POST, /auth/logout",
        "GET, /vehiculos", "GET, /vehiculos/1", "POST, /vehiculos", "PUT, /vehiculos/1",
        "GET, /tipos-vehiculo", "GET, /metodos-pago", "GET, /tarifas/vigente",
        "GET, /marcas", "GET, /modelos",
        "GET, /clientes", "GET, /clientes/1", "POST, /clientes", "PUT, /clientes/1",
        "GET, /espacios", "GET, /espacios/1", "PATCH, /espacios/1/habilitado",
        "POST, /registros/entrada", "GET, /registros/activos", "GET, /registros",
        "GET, /registros/1", "GET, /registros/1/liquidacion", "POST, /registros/1/salida",
        "GET, /reportes/ingresos", "GET, /reportes/ocupacion",
        "GET, /usuarios", "POST, /usuarios", "PUT, /usuarios/1", "PUT, /usuarios/1/clave",
        "GET, /zonas", "POST, /zonas", "POST, /zonas/1/espacios", "POST, /marcas", "POST, /modelos",
    })
    void todaRutaQueNoEsPublicaExigeSesion(String metodo, String ruta) {
        String cuerpo = "GET".equals(metodo) ? null : CUERPO;

        RespuestaHttp respuesta = enviar(metodo, ruta, cuerpo, null);

        assertEquals(401, respuesta.estado(), respuesta.cuerpo());
        assertEquals("NO_AUTENTICADO", respuesta.objeto().get("error").getAsString());
        assertEquals(Peticion.MENSAJE_SIN_SESION, respuesta.objeto().get("mensaje").getAsString());
    }

    @Test
    void laSaludYElInicioDeSesionSonPublicos() {
        assertEquals(200, enviar("GET", "/salud", null, null).estado());
        // Sin datos el login responde 400 (no 401): la ruta no exige sesión.
        assertEquals(400, enviar("POST", "/auth/login", CUERPO, null).estado());
    }

    // ------------------------------------------------------------ operador

    @ParameterizedTest(name = "el operador en {0} {1} → 403")
    @CsvSource({
        "PUT, /vehiculos/1",
        "PUT, /clientes/1",
        "PATCH, /espacios/1/habilitado",
        "GET, /reportes/ingresos",
    })
    void elOperadorNoEditaNiDeshabilitaNiVeLosIngresos(String metodo, String ruta) {
        String token = tokenConRol(Rol.OPERADOR);
        String cuerpo = "GET".equals(metodo) ? null : CUERPO;

        RespuestaHttp respuesta = enviar(metodo, ruta, cuerpo, token);

        assertEquals(403, respuesta.estado(), respuesta.cuerpo());
        assertEquals("SIN_PERMISO", respuesta.objeto().get("error").getAsString());
        assertEquals(MENSAJE_SOLO_ADMINISTRADOR, respuesta.objeto().get("mensaje").getAsString());
    }

    @ParameterizedTest(name = "el operador consulta {0}")
    @CsvSource({
        "/vehiculos", "/clientes", "/espacios", "/tipos-vehiculo", "/metodos-pago",
        "/tarifas/vigente", "/marcas", "/modelos", "/registros/activos", "/registros", "/zonas",
        // El tablero del operador muestra los cupos libres con este reporte.
        "/reportes/ocupacion",
    })
    void elOperadorConsultaLoQueNecesitaParaTrabajar(String ruta) {
        String token = tokenConRol(Rol.OPERADOR);

        assertEquals(200, enviar("GET", ruta, null, token).estado(), ruta);
    }

    @Test
    void elOperadorRegistraPropietariosVehiculosYEntradas() {
        String token = tokenConRol(Rol.OPERADOR);
        long idEspacio = crearEspacioLibre();

        RespuestaHttp propietario = enviar("POST", "/clientes", json(Map.of(
                "documento", documentoUnico(), "nombres", "Prueba", "apellidos", "Operador")), token);
        assertEquals(201, propietario.estado(), propietario.cuerpo());
        long idCliente = propietario.objeto().get("idCliente").getAsLong();
        registrarPropietarioCreado(idCliente);

        String placa = identificadorUnico(com.parqueadero.util.TipoPorPlaca.CARRO);
        RespuestaHttp vehiculo = enviar("POST", "/vehiculos",
                json(Map.of("identificador", placa, "idCliente", idCliente)), token);
        assertEquals(201, vehiculo.estado(), vehiculo.cuerpo());
        registrarVehiculoCreado(vehiculo.objeto().get("idVehiculo").getAsLong());

        RespuestaHttp entrada = enviar("POST", "/registros/entrada",
                json(Map.of("identificador", placa, "idEspacio", idEspacio)), token);
        assertEquals(201, entrada.estado(), entrada.cuerpo());
        long idRegistro = entrada.objeto().get("idRegistro").getAsLong();

        assertEquals(200, enviar("GET", "/registros/" + idRegistro + "/liquidacion", null, token)
                .estado());
        // La salida también es del operador: aquí falla por otra razón (la salida debe ser
        // posterior a la entrada), no por permisos.
        int salida = enviar("POST", "/registros/" + idRegistro + "/salida", CUERPO, token).estado();
        assertNotEquals(401, salida);
        assertNotEquals(403, salida);
    }

    // ------------------------------------------------------------ solo DBA

    @ParameterizedTest(name = "{0} en {1} {2} → 403")
    @CsvSource({
        "OPERADOR, GET, /usuarios", "OPERADOR, POST, /usuarios",
        "OPERADOR, PUT, /usuarios/1", "OPERADOR, PUT, /usuarios/1/clave",
        "ADMINISTRADOR, GET, /usuarios", "ADMINISTRADOR, POST, /usuarios",
        "ADMINISTRADOR, PUT, /usuarios/1", "ADMINISTRADOR, PUT, /usuarios/1/clave",
        "OPERADOR, POST, /zonas", "OPERADOR, POST, /zonas/1/espacios",
        "OPERADOR, POST, /marcas", "OPERADOR, POST, /modelos",
        "ADMINISTRADOR, POST, /zonas", "ADMINISTRADOR, POST, /zonas/1/espacios",
        "ADMINISTRADOR, POST, /marcas", "ADMINISTRADOR, POST, /modelos",
    })
    void soloElDbaAdministraUsuariosZonasYCatalogos(Rol rol, String metodo, String ruta) {
        String cuerpo = "GET".equals(metodo) ? null : CUERPO;

        RespuestaHttp respuesta = enviar(metodo, ruta, cuerpo, tokenConRol(rol));

        assertEquals(403, respuesta.estado(), respuesta.cuerpo());
        assertEquals("Solo un usuario DBA puede hacer esto.",
                respuesta.objeto().get("mensaje").getAsString());
    }

    // ------------------------------------------------------------ administrador y DBA

    @ParameterizedTest(name = "{0} puede editar, deshabilitar y ver los ingresos")
    @EnumSource(value = Rol.class, names = {"ADMINISTRADOR", "DBA"})
    void administradorYDbaPasanLasRutasDeAdministracion(Rol rol) {
        String token = tokenConRol(rol);

        assertEquals(200, enviar("GET", "/reportes/ingresos", null, token).estado());
        // Ids que no existen: 404 demuestra que la petición pasó el permiso.
        assertEquals(404, enviar("PUT", "/vehiculos/999999999",
                json(Map.of("idCliente", 1)), token).estado());
        assertEquals(404, enviar("PUT", "/clientes/999999999", json(Map.of(
                "documento", "1", "nombres", "A", "apellidos", "B")), token).estado());
        assertEquals(404, enviar("PATCH", "/espacios/999999999/habilitado",
                json(Map.of("habilitado", true)), token).estado());
    }

    private long crearEspacioLibre() {
        try (var conexion = conexion()) {
            return crearEspacio(conexion, com.parqueadero.util.TipoPorPlaca.CARRO, true);
        } catch (java.sql.SQLException e) {
            throw new IllegalStateException(e);
        }
    }
}
