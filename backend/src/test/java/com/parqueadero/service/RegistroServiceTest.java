package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Pruebas de las validaciones de {@link RegistroService}; no usan base de datos. */
class RegistroServiceTest {

    // ------------------------------------------------------- validarEntrada

    @Test
    void validarEntrada_normalizaElIdentificador() {
        assertEquals("KLM234", RegistroService.validarEntrada(" klm-234 ", 3L));
    }

    @Test
    void validarEntrada_juntaLosDosErrores() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> RegistroService.validarEntrada(null, null));

        assertEquals("El identificador (placa o código) del vehículo es obligatorio."
                + " El espacio (idEspacio) es obligatorio.", error.getMessage());
    }

    @Test
    void validarEntrada_identificadorQueQuedaVacioEsInvalido() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> RegistroService.validarEntrada(" - ", 3L));

        assertEquals("El identificador (placa o código) del vehículo es obligatorio.",
                error.getMessage());
    }

    @Test
    void validarEntrada_sinEspacioEsInvalido() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> RegistroService.validarEntrada("KLM234", null));

        assertEquals("El espacio (idEspacio) es obligatorio.", error.getMessage());
    }

    @Test
    void registrarEntrada_validaAntesDeIrALaBase() {
        // Sin conexión ni DAO: si la validación no fallara primero, daría NullPointerException.
        RegistroService servicio = new RegistroService(null, null, null, null);

        assertThrows(DatosInvalidosException.class, () -> servicio.registrarEntrada("", 3L));
    }

    // --------------------------------------------------------- validarRango

    @Test
    void validarRango_desdePosteriorAHastaEsInvalido() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> RegistroService.validarRango(LocalDate.of(2026, 10, 31),
                        LocalDate.of(2026, 10, 1)));

        assertEquals("La fecha 'desde' (2026-10-31) no puede ser posterior a la fecha"
                + " 'hasta' (2026-10-01).", error.getMessage());
    }

    @Test
    void validarRango_casosValidos() {
        LocalDate dia = LocalDate.of(2026, 10, 15);

        assertDoesNotThrow(() -> RegistroService.validarRango(dia, dia));          // un solo día
        assertDoesNotThrow(() -> RegistroService.validarRango(dia, dia.plusDays(1)));
        assertDoesNotThrow(() -> RegistroService.validarRango(dia, null));
        assertDoesNotThrow(() -> RegistroService.validarRango(null, dia));
        assertDoesNotThrow(() -> RegistroService.validarRango(null, null));
    }

    @Test
    void listarHistorial_validaElRangoAntesDeIrALaBase() {
        RegistroService servicio = new RegistroService(null, null, null, null);

        assertThrows(DatosInvalidosException.class, () -> servicio.listarHistorial(
                LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 1), null, null));
    }
}
