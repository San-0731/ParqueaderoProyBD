package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.Vehiculo;
import org.junit.jupiter.api.Test;

/**
 * Pruebas de las validaciones de {@link VehiculoService#validar(Vehiculo)}.
 * No necesitan base de datos: {@code validar} no abre conexiones.
 */
class VehiculoServiceTest {

    /** Vehículo con todos los datos válidos; cada prueba cambia solo lo que necesita. */
    private static Vehiculo vehiculo(String identificador, Long idTipo, Long idCliente, String color) {
        return new Vehiculo(null, identificador, idTipo, 5L, idCliente, color, 2020);
    }

    @Test
    void validar_datosCompletosPasan() {
        Vehiculo validado = VehiculoService.validar(vehiculo("ABC123", 3L, 1L, "Rojo"));

        assertEquals(new Vehiculo(null, "ABC123", 3L, 5L, 1L, "Rojo", 2020), validado);
    }

    @Test
    void validar_normalizaElIdentificador() {
        Vehiculo validado = VehiculoService.validar(vehiculo(" abc-123 ", 3L, 1L, "Rojo"));

        assertEquals("ABC123", validado.identificador());
    }

    @Test
    void validar_colorEnBlancoQuedaNulo() {
        assertNull(VehiculoService.validar(vehiculo("ABC123", 3L, 1L, "   ")).color());
    }

    @Test
    void validar_quitaEspaciosDelColor() {
        assertEquals("Rojo", VehiculoService.validar(vehiculo("ABC123", 3L, 1L, "  Rojo ")).color());
    }

    @Test
    void validar_camposOpcionalesNulosPasan() {
        Vehiculo sinOpcionales = new Vehiculo(null, "BICI0007", 2L, null, 8L, null, null);

        assertEquals(sinOpcionales, VehiculoService.validar(sinOpcionales));
    }

    @Test
    void validar_datosNulosLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class, () -> VehiculoService.validar(null));
    }

    @Test
    void validar_sinIdentificadorLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.validar(vehiculo(null, 3L, 1L, "Rojo")));
    }

    @Test
    void validar_identificadorSoloConGuionesLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.validar(vehiculo(" - ", 3L, 1L, "Rojo")));
    }

    @Test
    void validar_sinTipoLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.validar(vehiculo("ABC123", null, 1L, "Rojo")));
        assertEquals("El tipo de vehículo (idTipo) es obligatorio.", error.getMessage());
    }

    @Test
    void validar_sinPropietarioLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.validar(vehiculo("ABC123", 3L, null, "Rojo")));
        assertEquals("El propietario (idCliente) es obligatorio.", error.getMessage());
    }

    @Test
    void validar_identificadorDe40CaracteresPasa() {
        String cuarenta = "A".repeat(40);

        assertEquals(cuarenta,
                VehiculoService.validar(vehiculo(cuarenta, 3L, 1L, null)).identificador());
    }

    @Test
    void validar_identificadorDe41CaracteresLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.validar(vehiculo("A".repeat(41), 3L, 1L, null)));
    }

    @Test
    void validar_longitudSeMideDespuesDeNormalizar() {
        // 44 caracteres con 4 guiones: normalizado queda en 40 y debe pasar.
        String conGuiones = "AAAAAAAAAA-AAAAAAAAAA-AAAAAAAAAA-AAAAAAAAAA-";
        assertEquals(44, conGuiones.length());

        assertEquals(40,
                VehiculoService.validar(vehiculo(conGuiones, 3L, 1L, null)).identificador().length());
    }

    @Test
    void validar_colorDe30CaracteresPasa() {
        String treinta = "x".repeat(30);

        assertEquals(treinta, VehiculoService.validar(vehiculo("ABC123", 3L, 1L, treinta)).color());
    }

    @Test
    void validar_colorDe31CaracteresLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.validar(vehiculo("ABC123", 3L, 1L, "x".repeat(31))));
    }

    @Test
    void validar_variosErroresSeReportanJuntos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.validar(vehiculo("", null, null, "x".repeat(31))));

        String mensaje = error.getMessage();
        assertTrue(mensaje.contains("identificador"), mensaje);
        assertTrue(mensaje.contains("idTipo"), mensaje);
        assertTrue(mensaje.contains("idCliente"), mensaje);
        assertTrue(mensaje.contains("color"), mensaje);
    }
}
