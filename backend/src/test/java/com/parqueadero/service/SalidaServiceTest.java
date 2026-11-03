package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.ReglaNegocioException;
import com.parqueadero.model.EstadoRegistro;
import com.parqueadero.model.MetodoPago;
import com.parqueadero.model.RegistroParqueo;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/** Pruebas de las validaciones de {@link SalidaService}; no usan base de datos. */
class SalidaServiceTest {

    private static final MetodoPago NEQUI = new MetodoPago(2L, "Nequi", true);
    private static final MetodoPago EFECTIVO = new MetodoPago(4L, "Efectivo", false);

    // ---------------------------------------------------- validarReferencia

    @Test
    void validarReferencia_nequiSinReferenciaEsInvalido() {
        for (String vacia : new String[] {null, "", "   "}) {
            DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                    () -> SalidaService.validarReferencia(NEQUI, vacia));
            assertEquals("El pago con Nequi requiere la referencia (código de la transacción).",
                    error.getMessage());
        }
    }

    @Test
    void validarReferencia_quitaEspaciosDeLosExtremos() {
        assertEquals("NQ-123456", SalidaService.validarReferencia(NEQUI, "  NQ-123456 "));
    }

    @Test
    void validarReferencia_maximoSesentaCaracteres() {
        String sesenta = "A".repeat(SalidaService.MAX_REFERENCIA);

        assertEquals(sesenta, SalidaService.validarReferencia(NEQUI, sesenta));
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> SalidaService.validarReferencia(NEQUI, sesenta + "A"));
        assertEquals("La referencia no puede tener más de 60 caracteres.", error.getMessage());
    }

    @Test
    void validarReferencia_efectivoGuardaNullAunqueLlegueReferencia() {
        assertNull(SalidaService.validarReferencia(EFECTIVO, "ABC-1"));
        assertNull(SalidaService.validarReferencia(EFECTIVO, null));
    }

    // --------------------------------------------------------- exigirActivo

    @Test
    void exigirActivo_registroCerradoLanzaReglaNegocio() {
        RegistroParqueo cerrado = new RegistroParqueo(6L, 4L, 3L,
                LocalDateTime.of(2026, 9, 21, 6, 50), LocalDateTime.of(2026, 9, 21, 18, 5),
                675L, new BigDecimal("54000.00"), EstadoRegistro.PAGO);

        ReglaNegocioException error = assertThrows(ReglaNegocioException.class,
                () -> SalidaService.exigirActivo(cerrado));

        assertEquals("El parqueo 6 ya está cerrado: la salida se registró el 2026-09-21 18:05:00.",
                error.getMessage());
    }

    @Test
    void exigirActivo_registroActivoNoLanza() {
        RegistroParqueo activo = new RegistroParqueo(28L, 9L, 2L,
                LocalDateTime.of(2026, 10, 30, 12, 18, 31), null, null, null, EstadoRegistro.ACTIVO);

        assertDoesNotThrow(() -> SalidaService.exigirActivo(activo));
    }
}
