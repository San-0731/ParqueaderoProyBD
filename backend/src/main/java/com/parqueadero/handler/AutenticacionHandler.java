package com.parqueadero.handler;

import com.parqueadero.service.AutenticacionService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de la sesión.
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>POST /api/auth/login (pública)</td><td>200 con {@code {token, usuario}};
 *       401 si el usuario o la contraseña no son correctos</td></tr>
 *   <tr><td>POST /api/auth/logout</td><td>204: la sesión se cerró</td></tr>
 *   <tr><td>GET /api/auth/yo</td><td>200 con el usuario de la sesión</td></tr>
 * </table>
 */
public final class AutenticacionHandler {

    private final AutenticacionService autenticacionService;

    public AutenticacionHandler(AutenticacionService autenticacionService) {
        this.autenticacionService = autenticacionService;
    }

    /** {@code POST /api/auth/login} con {@code {"nombreUsuario": "...", "clave": "..."}}. */
    public Respuesta iniciarSesion(Peticion peticion) {
        Credenciales credenciales = peticion.cuerpoComo(Credenciales.class);
        return Respuesta.ok(autenticacionService.iniciarSesion(
                credenciales.nombreUsuario(), credenciales.clave()));
    }

    /** {@code POST /api/auth/logout}: el Router ya comprobó que la sesión es válida. */
    public Respuesta cerrarSesion(Peticion peticion) {
        autenticacionService.cerrarSesion(peticion.token());
        return Respuesta.sinContenido();
    }

    /** {@code GET /api/auth/yo}: quién es el usuario de la sesión (al recargar la página). */
    public Respuesta yo(Peticion peticion) {
        return Respuesta.ok(peticion.usuarioAutenticado());
    }

    /** Forma del cuerpo del login. */
    record Credenciales(String nombreUsuario, String clave) {
    }
}
