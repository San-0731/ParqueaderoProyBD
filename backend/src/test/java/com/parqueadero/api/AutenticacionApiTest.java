package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import com.parqueadero.model.Rol;
import com.parqueadero.service.AutenticacionService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Tokens;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;

/**
 * Inicio y cierre de sesión ({@code /api/auth/...}) contra la API real y la
 * base de pruebas.
 */
class AutenticacionApiTest extends PruebaApi {

    // ------------------------------------------------------------ login

    @ParameterizedTest
    @EnumSource(Rol.class)
    void conUsuarioYClaveCorrectosEntregaElTokenYElUsuario(Rol rol) {
        UsuarioPrueba usuario = crearUsuario(rol);

        RespuestaHttp respuesta = iniciarSesion(usuario.nombreUsuario(), usuario.clave());

        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        JsonObject cuerpo = respuesta.objeto();
        assertEquals(43, cuerpo.get("token").getAsString().length());
        JsonObject datos = cuerpo.getAsJsonObject("usuario");
        assertEquals(usuario.idUsuario(), datos.get("idUsuario").getAsLong());
        assertEquals(usuario.nombreUsuario(), datos.get("nombreUsuario").getAsString());
        assertEquals("Usuario de prueba", datos.get("nombreCompleto").getAsString());
        assertEquals(rol.name(), datos.get("rol").getAsString());
        assertTrue(datos.get("activo").getAsBoolean());
        // Nada de la contraseña ni de su hash sale de la API.
        assertEquals(Set.of("idUsuario", "nombreUsuario", "nombreCompleto", "rol", "activo"),
                datos.keySet());
        assertFalse(respuesta.cuerpo().contains("pbkdf2"));
    }

    @Test
    void enLaBaseSoloQuedaElHashDelToken() throws SQLException {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);

        String token = tokenDe(usuario);

        assertTrue(existeSesion(Tokens.hash(token)), "La sesión se guarda con el hash del token");
        assertFalse(existeSesion(token), "El token mismo nunca se guarda");
    }

    @Test
    void cadaInicioDeSesionDaUnTokenDistinto() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);

        assertNotEquals(tokenDe(usuario), tokenDe(usuario));
    }

    @Test
    void elUsuarioSeAceptaConMayusculasYEspacios() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);

        RespuestaHttp respuesta = iniciarSesion("  " + usuario.nombreUsuario().toUpperCase() + " ",
                usuario.clave());

        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
    }

    @Test
    void conLaClaveIncorrectaResponde401() {
        UsuarioPrueba usuario = crearUsuario(Rol.ADMINISTRADOR);

        assertCredencialesIncorrectas(iniciarSesion(usuario.nombreUsuario(), usuario.clave() + "x"));
    }

    @Test
    void conUnUsuarioQueNoExisteRespondeLoMismo() {
        assertCredencialesIncorrectas(iniciarSesion("no_existe_nadie_asi", "una-clave-cualquiera"));
    }

    @Test
    void unUsuarioDesactivadoNoPuedeEntrar() throws SQLException {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);
        actualizar("UPDATE usuario SET activo = FALSE WHERE id_usuario = ?", usuario.idUsuario());

        assertCredencialesIncorrectas(iniciarSesion(usuario.nombreUsuario(), usuario.clave()));
    }

    @Test
    void sinUsuarioOSinClaveResponde400() {
        RespuestaHttp sinClave = post("/auth/login", json(Map.of("nombreUsuario", "dba")));
        RespuestaHttp sinUsuario = post("/auth/login", json(Map.of("clave", "clave-123")));

        assertEquals(400, sinClave.estado());
        assertEquals("DATOS_INVALIDOS", sinClave.objeto().get("error").getAsString());
        assertEquals(400, sinUsuario.estado());
    }

    @Test
    void elLoginBorraLasSesionesVencidas() throws SQLException {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);
        String vieja = tokenDe(usuario);
        vencer(vieja);

        tokenDe(usuario);

        assertFalse(existeSesion(Tokens.hash(vieja)));
    }

    // ------------------------------------------------------------ /auth/yo

    @Test
    void yoDevuelveElUsuarioDeLaSesion() {
        UsuarioPrueba usuario = crearUsuario(Rol.DBA);
        String token = tokenDe(usuario);

        RespuestaHttp respuesta = enviar("GET", "/auth/yo", null, token);

        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        assertEquals(usuario.nombreUsuario(), respuesta.objeto().get("nombreUsuario").getAsString());
        assertEquals("DBA", respuesta.objeto().get("rol").getAsString());
    }

    @Test
    void yoSinTokenResponde401() {
        RespuestaHttp respuesta = enviar("GET", "/auth/yo", null, null);

        assertNoAutenticado(respuesta, Peticion.MENSAJE_SIN_SESION);
    }

    @Test
    void yoConUnTokenInventadoResponde401() {
        assertNoAutenticado(enviar("GET", "/auth/yo", null, Tokens.generar()),
                Peticion.MENSAJE_SESION_INVALIDA);
    }

    @Test
    void unaSesionVencidaYaNoSirve() throws SQLException {
        String token = tokenDe(crearUsuario(Rol.OPERADOR));
        vencer(token);

        assertNoAutenticado(enviar("GET", "/auth/yo", null, token), Peticion.MENSAJE_SESION_INVALIDA);
    }

    @Test
    void desactivarAlUsuarioCortaSuSesionEnLaSiguientePeticion() throws SQLException {
        UsuarioPrueba usuario = crearUsuario(Rol.ADMINISTRADOR);
        String token = tokenDe(usuario);
        actualizar("UPDATE usuario SET activo = FALSE WHERE id_usuario = ?", usuario.idUsuario());

        assertNoAutenticado(enviar("GET", "/auth/yo", null, token), Peticion.MENSAJE_SESION_INVALIDA);
    }

    // ------------------------------------------------------------ logout

    @Test
    void cerrarSesionInvalidaElToken() throws SQLException {
        String token = tokenDe(crearUsuario(Rol.OPERADOR));

        RespuestaHttp respuesta = enviar("POST", "/auth/logout", null, token);

        assertEquals(204, respuesta.estado());
        assertFalse(existeSesion(Tokens.hash(token)));
        assertNoAutenticado(enviar("GET", "/auth/yo", null, token), Peticion.MENSAJE_SESION_INVALIDA);
    }

    @Test
    void cerrarSesionSoloCierraEsaSesion() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);
        String enCaja = tokenDe(usuario);
        String enOtroEquipo = tokenDe(usuario);

        enviar("POST", "/auth/logout", null, enCaja);

        assertEquals(200, enviar("GET", "/auth/yo", null, enOtroEquipo).estado());
    }

    @Test
    void cerrarSesionSinTokenResponde401() {
        assertNoAutenticado(enviar("POST", "/auth/logout", null, null), Peticion.MENSAJE_SIN_SESION);
    }

    // ------------------------------------------------------------ auxiliares

    private static void assertCredencialesIncorrectas(RespuestaHttp respuesta) {
        assertNoAutenticado(respuesta, AutenticacionService.MENSAJE_CREDENCIALES);
    }

    private static void assertNoAutenticado(RespuestaHttp respuesta, String mensaje) {
        assertEquals(401, respuesta.estado(), respuesta.cuerpo());
        assertEquals("NO_AUTENTICADO", respuesta.objeto().get("error").getAsString());
        assertEquals(mensaje, respuesta.objeto().get("mensaje").getAsString());
    }

    private static boolean existeSesion(String tokenHash) throws SQLException {
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(
                     "SELECT 1 FROM sesion WHERE token_hash = ?")) {
            consulta.setString(1, tokenHash);
            try (ResultSet fila = consulta.executeQuery()) {
                return fila.next();
            }
        }
    }

    /** Hace que la sesión del token ya haya vencido (empezó hace 9 h y venció hace 1 h). */
    private static void vencer(String token) throws SQLException {
        actualizar("UPDATE sesion SET creada = NOW() - INTERVAL 9 HOUR,"
                + " expira = NOW() - INTERVAL 1 HOUR WHERE token_hash = ?", Tokens.hash(token));
    }

    private static void actualizar(String sql, Object valor) throws SQLException {
        try (Connection conexion = conexion();
             PreparedStatement sentencia = conexion.prepareStatement(sql)) {
            sentencia.setObject(1, valor);
            assertEquals(1, sentencia.executeUpdate(), "Debía cambiar una fila: " + sql);
        }
    }
}
