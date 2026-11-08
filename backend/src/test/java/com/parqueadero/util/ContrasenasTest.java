package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Pruebas de {@link Contrasenas}. Usan pocas iteraciones para no tardar; el
 * formato y la verificación son los mismos que con {@link Contrasenas#ITERACIONES}.
 */
class ContrasenasTest {

    private static final int POCAS = 1_000;

    @Test
    void elHashTieneElFormatoEsperadoYNoContieneLaClave() {
        String hash = Contrasenas.hash("clave-secreta-1", POCAS);

        assertTrue(hash.matches("pbkdf2_sha256\\$1000\\$[A-Za-z0-9+/=]+\\$[A-Za-z0-9+/=]+"), hash);
        assertFalse(hash.contains("clave-secreta-1"));
    }

    @Test
    void laClaveCorrectaSeVerificaYUnaDistintaNo() {
        String hash = Contrasenas.hash("clave-secreta-1", POCAS);

        assertTrue(Contrasenas.verificar("clave-secreta-1", hash));
        assertFalse(Contrasenas.verificar("clave-secreta-2", hash));
        assertFalse(Contrasenas.verificar("Clave-secreta-1", hash), "Distingue mayúsculas");
    }

    @Test
    void laMismaClaveDaHashesDistintosPorLaSal() {
        String primero = Contrasenas.hash("misma-clave", POCAS);
        String segundo = Contrasenas.hash("misma-clave", POCAS);

        assertNotEquals(primero, segundo);
        assertTrue(Contrasenas.verificar("misma-clave", primero));
        assertTrue(Contrasenas.verificar("misma-clave", segundo));
    }

    @Test
    void lasIteracionesVanDentroDelHash() {
        // Un hash viejo con otras iteraciones sigue sirviendo.
        String conOtrasIteraciones = Contrasenas.hash("clave-vieja", 2_000);

        assertTrue(conOtrasIteraciones.startsWith("pbkdf2_sha256$2000$"));
        assertTrue(Contrasenas.verificar("clave-vieja", conOtrasIteraciones));
    }

    @Test
    void conTildesYEnieTambienFunciona() {
        String hash = Contrasenas.hash("contraseña-camión", POCAS);

        assertTrue(Contrasenas.verificar("contraseña-camión", hash));
        assertFalse(Contrasenas.verificar("contrasena-camion", hash));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "texto-plano", "md5$abc$def$ghi", "pbkdf2_sha256$x$abc$def",
            "pbkdf2_sha256$0$abc$def", "pbkdf2_sha256$1000$no-es-base64!$def",
            "pbkdf2_sha256$99999999$abc$def"})
    void unHashGuardadoMalFormadoNuncaVerifica(String guardado) {
        assertFalse(Contrasenas.verificar("cualquier-clave", guardado));
    }

    @Test
    void conNullNoVerifica() {
        String hash = Contrasenas.hash("clave-secreta-1", POCAS);

        assertFalse(Contrasenas.verificar(null, hash));
        assertFalse(Contrasenas.verificar("clave-secreta-1", null));
    }

    @Test
    void iteracionesMenoresQueUnoNoSePermiten() {
        assertThrows(IllegalArgumentException.class, () -> Contrasenas.hash("clave", 0));
    }
}
