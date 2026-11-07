package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.TipoVehiculo;
import com.parqueadero.model.Vehiculo;
import org.junit.jupiter.api.Test;

/**
 * Pruebas de las validaciones de {@link VehiculoService}: {@code validar},
 * {@code revisarTipoEnviado} y {@code revisarCambiosNoPermitidos}. No necesitan
 * base de datos: ninguno de esos métodos abre conexiones.
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
    void validar_sinTipoPasa() {
        // El tipo ya no es obligatorio: VehiculoService.crear lo asigna según la placa.
        assertNull(VehiculoService.validar(vehiculo("ABC123", null, 1L, "Rojo")).idTipo());
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
        assertTrue(mensaje.contains("idCliente"), mensaje);
        assertTrue(mensaje.contains("color"), mensaje);
    }

    // ----- Tipo según la placa (al registrar) -----

    private static final TipoVehiculo MOTO = new TipoVehiculo(1L, "Moto");

    @Test
    void revisarTipoEnviado_sinTipoPasa() {
        assertDoesNotThrow(() -> VehiculoService.revisarTipoEnviado("ABC12D", null, MOTO));
    }

    @Test
    void revisarTipoEnviado_mismoTipoPasa() {
        assertDoesNotThrow(() -> VehiculoService.revisarTipoEnviado("ABC12D", 1L, MOTO));
    }

    @Test
    void revisarTipoEnviado_otroTipoLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.revisarTipoEnviado("ABC12D", 3L, MOTO));
        assertEquals("Por su placa, ABC12D es Moto (idTipo 1); no se puede registrar con idTipo 3.",
                error.getMessage());
    }

    // ----- Placa y tipo no se cambian (al actualizar) -----

    /** Vehículo como está guardado: KLM234, carro (idTipo 3). */
    private static final Vehiculo GUARDADO = new Vehiculo(1L, "KLM234", 3L, 5L, 1L, "Gris", 2020);

    @Test
    void revisarCambios_sinPlacaNiTipoPasa() {
        Vehiculo datos = new Vehiculo(null, null, null, 6L, 2L, "Azul", 2021);
        assertDoesNotThrow(() -> VehiculoService.revisarCambiosNoPermitidos(GUARDADO, datos));
    }

    @Test
    void revisarCambios_mismaPlacaEscritaDistintoPasa() {
        // "klm-234" normalizado es KLM234: no es un cambio.
        Vehiculo datos = new Vehiculo(null, "klm-234", 3L, 6L, 2L, null, null);
        assertDoesNotThrow(() -> VehiculoService.revisarCambiosNoPermitidos(GUARDADO, datos));
    }

    @Test
    void revisarCambios_otraPlacaLanzaDatosInvalidos() {
        Vehiculo datos = new Vehiculo(null, "KLM243", null, 6L, 2L, null, null);
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.revisarCambiosNoPermitidos(GUARDADO, datos));
        assertEquals("La placa no se puede cambiar.", error.getMessage());
    }

    @Test
    void revisarCambios_otroTipoLanzaDatosInvalidos() {
        Vehiculo datos = new Vehiculo(null, null, 1L, 6L, 2L, null, null);
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> VehiculoService.revisarCambiosNoPermitidos(GUARDADO, datos));
        assertEquals("El tipo no se puede cambiar: sale de la placa.", error.getMessage());
    }
}
