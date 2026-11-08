package com.parqueadero.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Tokens de sesión.
 *
 * <ul>
 *   <li>{@link #generar()}: 32 bytes de {@link SecureRandom} (generador
 *       criptográfico, imposible de adivinar) en Base64 para URL, sin relleno:
 *       43 caracteres.</li>
 *   <li>{@link #hash(String)}: SHA-256 del token en hexadecimal (64
 *       caracteres). Es lo único que se guarda en {@code sesion.token_hash}.</li>
 * </ul>
 *
 * <p>A diferencia de las contraseñas, aquí basta un SHA-256 sin sal ni
 * iteraciones: el token ya es aleatorio y larguísimo, así que no se puede
 * adivinar probando, y el hash debe ser rápido porque se calcula en cada
 * petición.
 */
public final class Tokens {

    private static final int BYTES_TOKEN = 32;
    private static final SecureRandom AZAR = new SecureRandom();

    private Tokens() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /** Un token nuevo, aleatorio. */
    public static String generar() {
        byte[] bytes = new byte[BYTES_TOKEN];
        AZAR.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** SHA-256 del token, en hexadecimal en minúscula. */
    public static String hash(String token) {
        try {
            byte[] resumen = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumen);
        } catch (NoSuchAlgorithmException e) {
            // Todo JDK trae SHA-256: si falta, el entorno está roto.
            throw new IllegalStateException("El JDK no tiene SHA-256.", e);
        }
    }
}
