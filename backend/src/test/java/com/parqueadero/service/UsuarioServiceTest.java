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

    @Test
    void crearJuntaTodosLosErroresAntesDeIrALaBase() {
        UsuarioService servicio = new UsuarioService(null, null, null);

        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> servicio.crear("A", "", "JEFE", "123"));

        assertEquals("El nombre de usuario debe tener de 3 a 30 caracteres: minúsculas sin tildes,"
                + " números, punto o guion bajo (por ejemplo, ana.perez). El nombre completo es"
                + " obligatorio. El rol debe ser OPERADOR, ADMINISTRADOR o DBA. La contraseña debe"
                + " tener entre 8 y 100 caracteres.", error.getMessage());
    }

    @Test
    void actualizarExigeElCampoActivo() {
        UsuarioService servicio = new UsuarioService(null, null, null);

        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> servicio.actualizar(1, "Ana", "OPERADOR", null));

        assertEquals("El campo activo es obligatorio (true o false).", error.getMessage());
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERADOR", "administrador", " Dba "})
    void elRolSeLeeSinImportarMayusculas(String rol) {
        UsuarioService.leerRol(rol);
    }

    @Test
    void elNombreCompletoNoPuedeSerMuyLargo() {
        assertEquals("Ana Pérez", UsuarioService.validarNombreCompleto("  Ana Pérez "));
        UsuarioService.validarNombreCompleto("x".repeat(100));
        assertThrows(DatosInvalidosException.class,
                () -> UsuarioService.validarNombreCompleto("x".repeat(101)));
    }
}
