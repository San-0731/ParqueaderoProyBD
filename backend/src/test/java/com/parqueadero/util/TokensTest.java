package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** Pruebas de {@link Tokens}. */
class TokensTest {

    @Test
    void elTokenTiene43CaracteresSeguros() {
        String token = Tokens.generar();

        assertEquals(43, token.length());
        assertTrue(token.matches("[A-Za-z0-9_-]+"), "Solo caracteres de Base64 para URL: " + token);
    }

    @Test
    void cadaTokenEsDistinto() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 1_000; i++) {
            tokens.add(Tokens.generar());
        }
        assertEquals(1_000, tokens.size());
    }

    @Test
    void elHashEsSha256EnHexadecimal() {
        // Valor conocido de SHA-256("abc").
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
                Tokens.hash("abc"));
    }

    @Test
    void elMismoTokenDaElMismoHashYOtroNo() {
        String token = Tokens.generar();

        assertEquals(Tokens.hash(token), Tokens.hash(token));
        assertNotEquals(Tokens.hash(token), Tokens.hash(Tokens.generar()));
        assertTrue(Tokens.hash(token).matches("[0-9a-f]{64}"));
    }
}
