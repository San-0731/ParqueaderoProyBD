package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.parqueadero.model.Rol;
import com.parqueadero.service.UsuarioService;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Administración de usuarios ({@code /api/usuarios}), que solo puede hacer el
 * DBA. Los permisos de las demás roles los revisa {@link PermisosApiTest}.
 */
class UsuariosApiTest extends PruebaApi {

    private String tokenDba() {
        return tokenConRol(Rol.DBA);
    }

    /** Crea un usuario por la API (y lo anota para borrarlo) y devuelve la respuesta. */
    private RespuestaHttp crearPorApi(String token, String nombreUsuario, String rol, String clave) {
        RespuestaHttp respuesta = enviar("POST", "/usuarios", json(Map.of(
                "nombreUsuario", nombreUsuario, "nombreCompleto", "Persona de prueba",
                "rol", rol, "clave", clave)), token);
        if (respuesta.estado() == 201) {
            registrarUsuarioCreado(respuesta.objeto().get("idUsuario").getAsLong());
        }
        return respuesta;
    }

    private static String nombreNuevo() {
        return "api_" + Long.toString(System.nanoTime(), 36);
    }

    private static RespuestaHttp cambiar(String token, long idUsuario, String nombreCompleto, Rol rol,
            boolean activo) {
        return enviar("PUT", "/usuarios/" + idUsuario, json(Map.of(
                "nombreCompleto", nombreCompleto, "rol", rol.name(), "activo", activo)), token);
    }

    // ------------------------------------------------------------ listar y crear

    @Test
    void elDbaListaLosUsuariosSinContrasenasNiHashes() {
        UsuarioPrueba operador = crearUsuario(Rol.OPERADOR);

        RespuestaHttp respuesta = enviar("GET", "/usuarios", null, tokenDba());

        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        assertFalse(respuesta.cuerpo().contains("pbkdf2"));
        JsonObject encontrado = null;
        for (JsonElement elemento : respuesta.lista()) {
            JsonObject usuario = elemento.getAsJsonObject();
            assertEquals(Set.of("idUsuario", "nombreUsuario", "nombreCompleto", "rol", "activo"),
                    usuario.keySet());
            if (usuario.get("idUsuario").getAsLong() == operador.idUsuario()) {
                encontrado = usuario;
            }
        }
        assertEquals(operador.nombreUsuario(), encontrado.get("nombreUsuario").getAsString());
        assertEquals("OPERADOR", encontrado.get("rol").getAsString());
    }

    @Test
    void elDbaCreaUnUsuarioQuePuedeIniciarSesionConSuRol() {
        String nombre = nombreNuevo();

        RespuestaHttp respuesta = crearPorApi(tokenDba(), "  " + nombre + " ", "administrador",
                "clave-inicial-123");

        assertEquals(201, respuesta.estado(), respuesta.cuerpo());
        assertEquals(nombre, respuesta.objeto().get("nombreUsuario").getAsString());
        assertEquals("ADMINISTRADOR", respuesta.objeto().get("rol").getAsString());
        assertTrue(respuesta.objeto().get("activo").getAsBoolean());
        RespuestaHttp sesion = iniciarSesion(nombre, "clave-inicial-123");
        assertEquals(200, sesion.estado(), sesion.cuerpo());
        assertEquals("ADMINISTRADOR",
                sesion.objeto().getAsJsonObject("usuario").get("rol").getAsString());
    }

    @Test
    void unNombreDeUsuarioRepetidoResponde409() {
        UsuarioPrueba existente = crearUsuario(Rol.OPERADOR);

        RespuestaHttp respuesta = crearPorApi(tokenDba(), existente.nombreUsuario(), "OPERADOR",
                "clave-inicial-123");

        assertEquals(409, respuesta.estado(), respuesta.cuerpo());
        assertEquals("Ya existe un usuario llamado '" + existente.nombreUsuario() + "'.",
                respuesta.objeto().get("mensaje").getAsString());
    }

    @Test
    void conDatosInvalidosResponde400ConTodosLosErrores() {
        RespuestaHttp respuesta = crearPorApi(tokenDba(), "Ana Pérez", "JEFE", "corta");

        assertEquals(400, respuesta.estado(), respuesta.cuerpo());
        String mensaje = respuesta.objeto().get("mensaje").getAsString();
        assertTrue(mensaje.contains("El nombre de usuario debe tener de 3 a 30 caracteres"), mensaje);
        assertTrue(mensaje.contains("El rol debe ser OPERADOR, ADMINISTRADOR o DBA."), mensaje);
        assertTrue(mensaje.contains("La contraseña debe tener entre 8 y 100 caracteres."), mensaje);
    }

    // ------------------------------------------------------------ actualizar

    @Test
    void cambiarElRolCierraSusSesionesYAplicaElRolNuevo() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);
        String suToken = tokenDe(usuario);

        RespuestaHttp respuesta = cambiar(tokenDba(), usuario.idUsuario(), "Nombre Nuevo",
                Rol.ADMINISTRADOR, true);

        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        assertEquals("Nombre Nuevo", respuesta.objeto().get("nombreCompleto").getAsString());
        assertEquals("ADMINISTRADOR", respuesta.objeto().get("rol").getAsString());
        assertEquals(401, enviar("GET", "/auth/yo", null, suToken).estado());
        String nuevoToken = tokenDe(usuario);
        assertEquals(200, enviar("GET", "/reportes/ingresos", null, nuevoToken).estado());
    }

    @Test
    void cambiarSoloElNombreNoCierraSusSesiones() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);
        String suToken = tokenDe(usuario);

        assertEquals(200, cambiar(tokenDba(), usuario.idUsuario(), "Otro Nombre", Rol.OPERADOR, true)
                .estado());

        assertEquals(200, enviar("GET", "/auth/yo", null, suToken).estado());
    }

    @Test
    void desactivarAUnUsuarioLeQuitaElAcceso() {
        UsuarioPrueba usuario = crearUsuario(Rol.ADMINISTRADOR);
        String suToken = tokenDe(usuario);

        RespuestaHttp respuesta = cambiar(tokenDba(), usuario.idUsuario(), "Usuario de prueba",
                Rol.ADMINISTRADOR, false);

        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        assertFalse(respuesta.objeto().get("activo").getAsBoolean());
        assertEquals(401, enviar("GET", "/auth/yo", null, suToken).estado());
        assertEquals(401, iniciarSesion(usuario.nombreUsuario(), usuario.clave()).estado());

        // Reactivado, puede volver a entrar.
        cambiar(tokenDba(), usuario.idUsuario(), "Usuario de prueba", Rol.ADMINISTRADOR, true);
        assertEquals(200, iniciarSesion(usuario.nombreUsuario(), usuario.clave()).estado());
    }

    @Test
    void actualizarSinActivoOConRolInvalidoResponde400() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);

        RespuestaHttp respuesta = enviar("PUT", "/usuarios/" + usuario.idUsuario(),
                json(Map.of("nombreCompleto", " ", "rol", "INVITADO")), tokenDba());

        assertEquals(400, respuesta.estado());
        String mensaje = respuesta.objeto().get("mensaje").getAsString();
        assertTrue(mensaje.contains("El nombre completo es obligatorio."), mensaje);
        assertTrue(mensaje.contains("El rol debe ser"), mensaje);
        assertTrue(mensaje.contains("El campo activo es obligatorio"), mensaje);
    }

    @Test
    void unUsuarioQueNoExisteResponde404() {
        String token = tokenDba();

        assertEquals(404, cambiar(token, 999_999_999L, "Nadie", Rol.OPERADOR, true).estado());
        assertEquals(404, enviar("PUT", "/usuarios/999999999/clave",
                json(Map.of("clave", "clave-nueva-123")), token).estado());
    }

    // ------------------------------------------------------------ contraseña

    @Test
    void cambiarLaClaveCierraSusSesionesYSoloSirveLaNueva() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);
        String suToken = tokenDe(usuario);

        RespuestaHttp respuesta = enviar("PUT", "/usuarios/" + usuario.idUsuario() + "/clave",
                json(Map.of("clave", "clave-nueva-123")), tokenDba());

        assertEquals(204, respuesta.estado(), respuesta.cuerpo());
        assertEquals(401, enviar("GET", "/auth/yo", null, suToken).estado());
        assertEquals(401, iniciarSesion(usuario.nombreUsuario(), usuario.clave()).estado());
        assertEquals(200, iniciarSesion(usuario.nombreUsuario(), "clave-nueva-123").estado());
    }

    @Test
    void unaClaveCortaResponde400() {
        UsuarioPrueba usuario = crearUsuario(Rol.OPERADOR);

        RespuestaHttp respuesta = enviar("PUT", "/usuarios/" + usuario.idUsuario() + "/clave",
                json(Map.of("clave", "1234567")), tokenDba());

        assertEquals(400, respuesta.estado());
    }

    // ------------------------------------------------------------ último DBA

    /**
     * Con un solo DBA activo, no se le puede desactivar ni quitar el rol. Para
     * dejar uno solo, se desactivan un momento los demás DBA de la base de
     * pruebas y al final se reactivan.
     */
    @Test
    void siempreQuedaAlMenosUnDbaActivo() throws SQLException {
        UsuarioPrueba unico = crearUsuario(Rol.DBA);
        List<Long> otros = otrosDbaActivos(unico.idUsuario());
        cambiarActivo(otros, false);
        try {
            String token = tokenDe(unico);

            RespuestaHttp desactivar = cambiar(token, unico.idUsuario(), "Único", Rol.DBA, false);
            RespuestaHttp quitarRol = cambiar(token, unico.idUsuario(), "Único", Rol.ADMINISTRADOR, true);

            for (RespuestaHttp respuesta : List.of(desactivar, quitarRol)) {
                assertEquals(409, respuesta.estado(), respuesta.cuerpo());
                assertEquals(UsuarioService.MENSAJE_ULTIMO_DBA,
                        respuesta.objeto().get("mensaje").getAsString());
            }
            // Nada cambió: sigue siendo DBA activo y su sesión sigue sirviendo.
            assertEquals(200, enviar("GET", "/usuarios", null, token).estado());

            // Con un segundo DBA, ya se puede.
            UsuarioPrueba segundo = crearUsuario(Rol.DBA);
            assertEquals(200, cambiar(tokenDe(segundo), unico.idUsuario(), "Único", Rol.ADMINISTRADOR,
                    true).estado());
        } finally {
            cambiarActivo(otros, true);
        }
    }

    private static List<Long> otrosDbaActivos(long excepto) throws SQLException {
        List<Long> ids = new ArrayList<>();
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(
                     "SELECT u.id_usuario FROM usuario u JOIN rol r ON r.id_rol = u.id_rol"
                             + " WHERE r.nombre = 'DBA' AND u.activo = TRUE AND u.id_usuario <> ?")) {
            consulta.setLong(1, excepto);
            try (ResultSet filas = consulta.executeQuery()) {
                while (filas.next()) {
                    ids.add(filas.getLong(1));
                }
            }
        }
        return ids;
    }

    private static void cambiarActivo(List<Long> ids, boolean activo) throws SQLException {
        try (Connection conexion = conexion()) {
            for (long id : ids) {
                try (PreparedStatement cambio = conexion.prepareStatement(
                        "UPDATE usuario SET activo = ? WHERE id_usuario = ?")) {
                    cambio.setBoolean(1, activo);
                    cambio.setLong(2, id);
                    cambio.executeUpdate();
                }
            }
        }
    }
}
