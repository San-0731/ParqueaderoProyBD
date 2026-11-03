package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.Cliente;
import org.junit.jupiter.api.Test;

/**
 * Pruebas de las validaciones de {@link ClienteService#validar(Cliente)} y de
 * {@link ClienteService#normalizarDocumento(String)}. No necesitan base de
 * datos: no abren conexiones.
 */
class ClienteServiceTest {

    /** Cliente con todos los datos válidos; cada prueba cambia solo lo que necesita. */
    private static Cliente cliente(String documento, String nombres, String apellidos,
            String telefono) {
        return new Cliente(null, documento, nombres, apellidos, telefono);
    }

    /** Valida y devuelve el mensaje del error. */
    private static String error(Cliente datos) {
        return assertThrows(DatosInvalidosException.class, () -> ClienteService.validar(datos))
                .getMessage();
    }

    // ------------------------------------------------------------ datos válidos

    @Test
    void validar_datosCompletosPasan() {
        Cliente validado = ClienteService.validar(
                cliente("1012345678", "Laura Camila", "Gómez Rojas", "3104567890"));

        assertEquals(new Cliente(null, "1012345678", "Laura Camila", "Gómez Rojas", "3104567890"),
                validado);
    }

    @Test
    void validar_limpiaDocumentoNombresYTelefono() {
        Cliente validado = ClienteService.validar(
                cliente(" 1.012.345.678 ", "  Laura Camila ", " Gómez Rojas  ", "310 456-7890"));

        assertEquals(new Cliente(null, "1012345678", "Laura Camila", "Gómez Rojas", "3104567890"),
                validado);
    }

    @Test
    void validar_documentoConLetrasQuedaEnMayusculas() {
        // Un pasaporte o una cédula de extranjería pueden tener letras.
        assertEquals("AB123456",
                ClienteService.validar(cliente("ab-123456", "Ana", "Pérez", null)).documento());
    }

    @Test
    void validar_conservaElId() {
        Cliente conId = new Cliente(7L, "1012345678", "Ana", "Pérez", null);

        assertEquals(7L, ClienteService.validar(conId).idCliente());
    }

    // ----------------------------------------------------------------- documento

    @Test
    void validar_nullLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class, () -> ClienteService.validar(null));
    }

    @Test
    void validar_documentoObligatorio() {
        assertEquals("El documento del cliente es obligatorio.",
                error(cliente(null, "Ana", "Pérez", null)));
        assertEquals("El documento del cliente es obligatorio.",
                error(cliente(" .- ", "Ana", "Pérez", null)));
    }

    @Test
    void validar_documentoConCaracteresInvalidos() {
        assertEquals("El documento solo puede tener letras (A-Z) y números.",
                error(cliente("123@456", "Ana", "Pérez", null)));
        assertEquals("El documento solo puede tener letras (A-Z) y números.",
                error(cliente("ÑA123", "Ana", "Pérez", null)));
    }

    @Test
    void validar_documentoDemasiadoLargo() {
        // 21 dígitos: se mide después de quitar los puntos.
        assertEquals("El documento no puede tener más de 20 caracteres.",
                error(cliente("123.456.789.012.345.678.901", "Ana", "Pérez", null)));
    }

    @Test
    void validar_documentoDeVeinteCaracteresPasa() {
        assertEquals("12345678901234567890",
                ClienteService.validar(cliente("12345678901234567890", "Ana", "Pérez", null))
                        .documento());
    }

    // ------------------------------------------------------- nombres y apellidos

    @Test
    void validar_nombresYApellidosObligatorios() {
        assertEquals("Los nombres son obligatorios. Los apellidos son obligatorios.",
                error(cliente("1012345678", "   ", null, null)));
    }

    @Test
    void validar_nombresYApellidosDemasiadoLargos() {
        String largo = "a".repeat(81);

        assertEquals("Los nombres no pueden tener más de 80 caracteres."
                        + " Los apellidos no pueden tener más de 80 caracteres.",
                error(cliente("1012345678", largo, largo, null)));
    }

    // ------------------------------------------------------------------ teléfono

    @Test
    void validar_telefonoEnBlancoQuedaNulo() {
        assertNull(ClienteService.validar(cliente("1012345678", "Ana", "Pérez", " - ")).telefono());
        assertNull(ClienteService.validar(cliente("1012345678", "Ana", "Pérez", null)).telefono());
    }

    @Test
    void validar_telefonoConIndicativoPasa() {
        assertEquals("+573104567890", ClienteService.validar(
                cliente("1012345678", "Ana", "Pérez", "+57 310 456 7890")).telefono());
    }

    @Test
    void validar_telefonoConLetrasFalla() {
        assertEquals("El teléfono solo puede tener números (y un + al inicio).",
                error(cliente("1012345678", "Ana", "Pérez", "310-ABC-7890")));
        assertEquals("El teléfono solo puede tener números (y un + al inicio).",
                error(cliente("1012345678", "Ana", "Pérez", "310+4567890")));
    }

    @Test
    void validar_telefonoDemasiadoLargo() {
        assertEquals("El teléfono no puede tener más de 15 caracteres.",
                error(cliente("1012345678", "Ana", "Pérez", "1234567890123456")));
    }

    // ------------------------------------------------------------ varios errores

    @Test
    void validar_juntaTodosLosErrores() {
        String mensaje = error(cliente("", "", "", "abc"));

        assertTrue(mensaje.contains("documento"), mensaje);
        assertTrue(mensaje.contains("nombres"), mensaje);
        assertTrue(mensaje.contains("apellidos"), mensaje);
        assertTrue(mensaje.contains("teléfono"), mensaje);
    }

    // ------------------------------------------------------ normalizarDocumento

    @Test
    void normalizarDocumento_quitaPuntosEspaciosYGuiones() {
        assertEquals("1012345678", ClienteService.normalizarDocumento("1.012.345.678"));
        assertEquals("1012345678", ClienteService.normalizarDocumento(" 1012 345 678 "));
        assertEquals("CE123", ClienteService.normalizarDocumento("ce-123"));
    }

    @Test
    void normalizarDocumento_vacioLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class, () -> ClienteService.normalizarDocumento("."));
        assertThrows(DatosInvalidosException.class, () -> ClienteService.normalizarDocumento(null));
    }
}
