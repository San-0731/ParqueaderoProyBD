package com.parqueadero.util;

import com.parqueadero.model.Usuario;

import java.util.Optional;

/**
 * Convierte el token de la cabecera {@code Authorization} en el usuario de una
 * sesión vigente. El {@link Router} lo usa solo en las rutas que exigen un rol;
 * en la aplicación es {@code AutenticacionService::usuarioDeToken}.
 */
@FunctionalInterface
public interface Autenticador {

    /** No reconoce ningún token: para un {@link Router} sin rutas protegidas. */
    Autenticador NINGUNO = token -> Optional.empty();

    /**
     * @param token el token tal como llegó (nunca {@code null})
     * @return el usuario de la sesión, o {@code Optional.empty()} si el token
     *         no corresponde a una sesión vigente de un usuario activo
     */
    Optional<Usuario> autenticar(String token);
}
