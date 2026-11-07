package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.SesionDAO;
import com.parqueadero.dao.UsuarioDAO;
import com.parqueadero.dao.UsuarioDAO.UsuarioConClave;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoAutenticadoException;
import com.parqueadero.model.SesionIniciada;
import com.parqueadero.model.Usuario;
import com.parqueadero.util.Contrasenas;
import com.parqueadero.util.Tokens;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Optional;

/**
 * Inicio y cierre de sesión, y reconocimiento del usuario de cada petición.
 *
 * <p>Flujo:
 * <ol>
 *   <li>{@link #iniciarSesion}: verifica usuario y contraseña, genera un token
 *       aleatorio, guarda su hash en {@code sesion} (vence en
 *       {@value #DURACION_SESION_HORAS} horas) y le entrega el token al
 *       frontend.</li>
 *   <li>El frontend envía el token en cada petición; {@link #usuarioDeToken}
 *       lo convierte en el usuario (el {@code Router} lo llama en las rutas
 *       con rol).</li>
 *   <li>{@link #cerrarSesion} borra la sesión: el token deja de servir.</li>
 * </ol>
 */
public final class AutenticacionService {

    /** Duración de una sesión: un turno. */
    public static final int DURACION_SESION_HORAS = 8;

    /**
     * Mismo mensaje si el usuario no existe, si está desactivado o si la
     * contraseña está mal: así no se puede averiguar qué usuarios existen.
     */
    public static final String MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos.";

    private final ConexionBD conexionBD;
    private final UsuarioDAO usuarioDAO;
    private final SesionDAO sesionDAO;

    public AutenticacionService(ConexionBD conexionBD, UsuarioDAO usuarioDAO, SesionDAO sesionDAO) {
        this.conexionBD = conexionBD;
        this.usuarioDAO = usuarioDAO;
        this.sesionDAO = sesionDAO;
    }

    /**
     * Inicia sesión.
     *
     * @return el token (solo existe aquí; en la base queda su hash) y el usuario
     * @throws DatosInvalidosException si falta el usuario o la contraseña
     * @throws NoAutenticadoException  si no coinciden con un usuario activo
     */
    public SesionIniciada iniciarSesion(String nombreUsuario, String clave) {
        if (nombreUsuario == null || nombreUsuario.isBlank() || clave == null || clave.isEmpty()) {
            throw new DatosInvalidosException("Escribe el usuario y la contraseña.");
        }
        // Los nombres de usuario se guardan en minúscula (CHECK de V007).
        String nombre = nombreUsuario.strip().toLowerCase(Locale.ROOT);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            Optional<UsuarioConClave> encontrado = usuarioDAO.buscarConClave(conexion, nombre);
            // Si el usuario no existe se verifica igual, contra un hash de relleno: así la
            // respuesta tarda lo mismo y el tiempo no revela qué usuarios existen.
            String hash = encontrado.map(UsuarioConClave::claveHash).orElseGet(HashDeRelleno::valor);
            boolean claveCorrecta = Contrasenas.verificar(clave, hash);
            if (encontrado.isEmpty() || !claveCorrecta || !encontrado.get().usuario().activo()) {
                throw new NoAutenticadoException(MENSAJE_CREDENCIALES);
            }

            Usuario usuario = encontrado.get().usuario();
            String token = Tokens.generar();
            // De paso se limpian las sesiones vencidas de todos, para que la tabla no crezca.
            sesionDAO.borrarVencidas(conexion);
            sesionDAO.insertar(conexion, Tokens.hash(token), usuario.idUsuario(), DURACION_SESION_HORAS);
            return new SesionIniciada(token, usuario);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * El usuario de la sesión del token.
     *
     * @return el usuario, o {@code Optional.empty()} si el token no es de una
     *         sesión vigente de un usuario activo
     */
    public Optional<Usuario> usuarioDeToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return sesionDAO.buscarUsuario(conexion, Tokens.hash(token));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /** Cierra la sesión del token. No pasa nada si ya no existía. */
    public void cerrarSesion(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        try (Connection conexion = conexionBD.obtenerConexion()) {
            sesionDAO.borrar(conexion, Tokens.hash(token));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Hash de una contraseña cualquiera, para gastar el mismo tiempo cuando el
     * usuario no existe. Se calcula una sola vez, la primera vez que hace falta
     * (patrón "holder": la clase interna se carga solo cuando se usa).
     */
    private static final class HashDeRelleno {
        private static final String VALOR = Contrasenas.hash("relleno-para-igualar-el-tiempo");

        static String valor() {
            return VALOR;
        }
    }
}
