package com.parqueadero.util;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Hash y verificación de contraseñas con PBKDF2-HMAC-SHA256, que viene en el
 * JDK (no hace falta ninguna librería).
 *
 * <p>Una contraseña nunca se guarda: se guarda el resultado de aplicarle
 * PBKDF2 con una <b>sal</b> aleatoria (16 bytes distintos para cada usuario)
 * muchas veces seguidas ({@value #ITERACIONES} iteraciones, lo que recomienda
 * OWASP para este algoritmo). Así:
 * <ul>
 *   <li>Del hash no se puede volver a la contraseña.</li>
 *   <li>Dos usuarios con la misma contraseña tienen hashes distintos (por la
 *       sal), así que no se nota que la repiten.</li>
 *   <li>Probar contraseñas a la fuerza es muy lento: cada intento cuesta
 *       {@value #ITERACIONES} rondas de HMAC.</li>
 * </ul>
 *
 * <p>Formato guardado en {@code usuario.clave_hash}:
 * {@code pbkdf2_sha256$<iteraciones>$<sal en Base64>$<hash en Base64>}. Las
 * iteraciones van dentro del texto para poder subirlas en el futuro sin
 * invalidar las contraseñas que ya existen.
 */
public final class Contrasenas {

    /** Iteraciones para las contraseñas nuevas. */
    public static final int ITERACIONES = 600_000;

    /** Largo mínimo de una contraseña. */
    public static final int LARGO_MINIMO = 8;

    /** Largo máximo de una contraseña (solo para no procesar textos absurdos). */
    public static final int LARGO_MAXIMO = 100;

    private static final String ALGORITMO = "PBKDF2WithHmacSHA256";
    private static final String PREFIJO = "pbkdf2_sha256";
    private static final String SEPARADOR = "$";
    private static final int BYTES_SAL = 16;
    private static final int BITS_HASH = 256;

    /** Límite al leer un hash guardado, para que un valor dañado no deje el servidor calculando. */
    private static final int ITERACIONES_MAXIMAS = 10_000_000;

    private static final SecureRandom AZAR = new SecureRandom();

    private Contrasenas() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /** Hash de una contraseña nueva, con {@value #ITERACIONES} iteraciones. */
    public static String hash(String clave) {
        return hash(clave, ITERACIONES);
    }

    /**
     * Hash con un número de iteraciones dado. Las pruebas usan pocas para no
     * tardar; la aplicación siempre usa {@link #hash(String)}.
     */
    public static String hash(String clave, int iteraciones) {
        if (iteraciones < 1) {
            throw new IllegalArgumentException("Las iteraciones deben ser al menos 1.");
        }
        byte[] sal = new byte[BYTES_SAL];
        AZAR.nextBytes(sal);
        byte[] hash = pbkdf2(clave, sal, iteraciones);
        Base64.Encoder base64 = Base64.getEncoder();
        return String.join(SEPARADOR, PREFIJO, String.valueOf(iteraciones),
                base64.encodeToString(sal), base64.encodeToString(hash));
    }

    /**
     * Si {@code clave} es la contraseña que produjo {@code guardado}. Repite el
     * cálculo con la misma sal y las mismas iteraciones y compara los bytes en
     * tiempo constante ({@link MessageDigest#isEqual}), para que el tiempo de
     * respuesta no revele cuántos bytes coincidieron.
     *
     * @return {@code false} también si {@code guardado} no tiene el formato esperado
     */
    public static boolean verificar(String clave, String guardado) {
        if (clave == null || guardado == null) {
            return false;
        }
        String[] partes = guardado.split("\\$");
        if (partes.length != 4 || !PREFIJO.equals(partes[0])) {
            return false;
        }
        try {
            int iteraciones = Integer.parseInt(partes[1]);
            if (iteraciones < 1 || iteraciones > ITERACIONES_MAXIMAS) {
                return false;
            }
            byte[] sal = Base64.getDecoder().decode(partes[2]);
            byte[] esperado = Base64.getDecoder().decode(partes[3]);
            byte[] calculado = pbkdf2(clave, sal, iteraciones);
            return MessageDigest.isEqual(esperado, calculado);
        } catch (IllegalArgumentException e) {
            // Número o Base64 mal formados: el hash guardado no es válido.
            return false;
        }
    }

    private static byte[] pbkdf2(String clave, byte[] sal, int iteraciones) {
        // PBEKeySpec recibe un char[] (no un String) para poder borrarlo después.
        char[] caracteres = clave.toCharArray();
        PBEKeySpec especificacion = new PBEKeySpec(caracteres, sal, iteraciones, BITS_HASH);
        try {
            return SecretKeyFactory.getInstance(ALGORITMO).generateSecret(especificacion).getEncoded();
        } catch (GeneralSecurityException e) {
            // Todo JDK 21 trae PBKDF2WithHmacSHA256: si falta, el entorno está roto.
            throw new IllegalStateException("El JDK no tiene " + ALGORITMO + ".", e);
        } finally {
            especificacion.clearPassword();
            Arrays.fill(caracteres, '\0');
        }
    }
}
