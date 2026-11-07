package com.parqueadero.handler;

import com.parqueadero.service.UsuarioService;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

/**
 * Endpoints de la administración de usuarios. Todas las rutas son solo para el
 * DBA (lo exige el Router).
 *
 * <table>
 *   <caption>Rutas</caption>
 *   <tr><th>Método y ruta</th><th>Respuesta</th></tr>
 *   <tr><td>GET /api/usuarios</td><td>200 con la lista (sin contraseñas ni hashes)</td></tr>
 *   <tr><td>POST /api/usuarios</td><td>201 con el usuario creado; 409 si el nombre ya existe</td></tr>
 *   <tr><td>PUT /api/usuarios/{id}</td><td>200 con el usuario actualizado; 409 si se
 *       quedaría sin DBA activo</td></tr>
 *   <tr><td>PUT /api/usuarios/{id}/clave</td><td>204: contraseña cambiada y sesiones cerradas</td></tr>
 * </table>
 */
public final class UsuarioHandler {

    private final UsuarioService usuarioService;

    public UsuarioHandler(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    /** {@code GET /api/usuarios}. */
    public Respuesta listar(Peticion peticion) {
        return Respuesta.ok(usuarioService.listar());
    }

    /**
     * {@code POST /api/usuarios} con, por ejemplo,
     * {@code {"nombreUsuario":"ana.perez","nombreCompleto":"Ana Pérez","rol":"OPERADOR","clave":"..."}}.
     */
    public Respuesta crear(Peticion peticion) {
        UsuarioNuevo datos = peticion.cuerpoComo(UsuarioNuevo.class);
        return Respuesta.creado(usuarioService.crear(datos.nombreUsuario(), datos.nombreCompleto(),
                datos.rol(), datos.clave()));
    }

    /**
     * {@code PUT /api/usuarios/{id}} con {@code {"nombreCompleto":"...","rol":"ADMINISTRADOR","activo":true}}.
     * El nombre de usuario no se cambia.
     */
    public Respuesta actualizar(Peticion peticion) {
        long idUsuario = peticion.parametroRutaComoLong("id");
        CambioUsuario datos = peticion.cuerpoComo(CambioUsuario.class);
        return Respuesta.ok(usuarioService.actualizar(idUsuario, datos.nombreCompleto(), datos.rol(),
                datos.activo()));
    }

    /** {@code PUT /api/usuarios/{id}/clave} con {@code {"clave":"..."}}. */
    public Respuesta cambiarClave(Peticion peticion) {
        long idUsuario = peticion.parametroRutaComoLong("id");
        CambioClave datos = peticion.cuerpoComo(CambioClave.class);
        usuarioService.cambiarClave(idUsuario, datos.clave());
        return Respuesta.sinContenido();
    }

    /** Cuerpo de POST /api/usuarios. */
    record UsuarioNuevo(String nombreUsuario, String nombreCompleto, String rol, String clave) {
    }

    /** Cuerpo de PUT /api/usuarios/{id}. */
    record CambioUsuario(String nombreCompleto, String rol, Boolean activo) {
    }

    /** Cuerpo de PUT /api/usuarios/{id}/clave. */
    record CambioClave(String clave) {
    }
}
