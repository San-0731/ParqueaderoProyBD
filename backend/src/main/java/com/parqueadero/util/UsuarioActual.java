package com.parqueadero.util;

import com.parqueadero.model.Usuario;

/**
 * El usuario de la petición que se está atendiendo, para que la base de datos
 * sepa quién hace cada cambio (auditoría, V008).
 *
 * <p>Cómo funciona:
 * <ol>
 *   <li>El {@link Router}, en una ruta con rol, fija el usuario antes de llamar
 *       al manejador ({@link #ejecutarCon}) y lo quita al terminar.</li>
 *   <li>{@code ConexionBD.obtenerConexion()} lo lee y ejecuta
 *       {@code SET @id_usuario_app = <id>} en cada conexión nueva.</li>
 *   <li>Los triggers de auditoría leen {@code @id_usuario_app}.</li>
 * </ol>
 * Así los servicios y los DAO no cambian: no tienen que recibir el usuario.
 *
 * <p>Se guarda en un {@link ThreadLocal}: una variable con un valor distinto por
 * hilo. Cada petición se atiende en su propio hilo virtual, así que el usuario
 * de una petición nunca se mezcla con el de otra.
 */
public final class UsuarioActual {

    private static final ThreadLocal<Usuario> USUARIO = new ThreadLocal<>();

    private UsuarioActual() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /** Id del usuario de la petición actual, o {@code null} si no hay (ruta pública, pruebas). */
    public static Long id() {
        Usuario usuario = USUARIO.get();
        return usuario == null ? null : usuario.idUsuario();
    }

    /**
     * Ejecuta {@code accion} con {@code usuario} como usuario actual y, pase lo
     * que pase, lo quita al terminar (el {@code finally}), para que el hilo
     * quede limpio.
     */
    public static Respuesta ejecutarCon(Usuario usuario, Manejador accion, Peticion peticion) {
        USUARIO.set(usuario);
        try {
            return accion.manejar(peticion);
        } finally {
            USUARIO.remove();
        }
    }
}
