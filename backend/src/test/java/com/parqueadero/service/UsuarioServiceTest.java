package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Validaciones de {@link UsuarioService} y {@link AutenticacionService} que no necesitan base de datos. */
class UsuarioServiceTest {

    @ParameterizedTest
    @ValueSource(strings = {"dba", "ana.perez", "operador_2", "a.b", "abcdefghijklmnopqrstuvwxyz1234"})
    void nombresDeUsuarioValidos(String nombre) {
        assertEquals(nombre, UsuarioService.validarNombreUsuario("  " + nombre + " "));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"ab", "Ana", "ana perez", "ana-perez", "josé", "abcdefghijklmnopqrstuvwxyz12345"})
    void nombresDeUsuarioInvalidos(String nombre) {
        assertThrows(DatosInvalidosException.class, () -> UsuarioService.validarNombreUsuario(nombre));
    }

    @Test
    void laClaveDebeTenerAlMenos8Caracteres() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> UsuarioService.validarClave("1234567"));

        assertEquals("La contraseña debe tener entre 8 y 100 caracteres.", error.getMessage());
        UsuarioService.validarClave("12345678");
        UsuarioService.validarClave("x".repeat(100));
        assertThrows(DatosInvalidosException.class, () -> UsuarioService.validarClave("x".repeat(101)));
        assertThrows(DatosInvalidosException.class, () -> UsuarioService.validarClave(null));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void iniciarSesionSinUsuarioOClaveEsDatoInvalido(String vacio) {
        // Sin conexión ni DAO: la validación ocurre antes de ir a la base.
        AutenticacionService servicio = new AutenticacionService(null, null, null);

        assertThrows(DatosInvalidosException.class, () -> servicio.iniciarSesion(vacio, "clave-123"));
        assertThrows(DatosInvalidosException.class, () -> servicio.iniciarSesion("dba", vacio == null ? null : ""));
    }
}
