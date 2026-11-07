package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Validaciones de {@link ZonaService} y {@link CatalogoService} que no necesitan base de datos. */
class ZonaServiceTest {

    @ParameterizedTest
    @CsvSource({"1, 1", "01, 1", " 7 , 7", "99, 99"})
    void elPisoSeGuardaSinCerosALaIzquierda(String piso, String esperado) {
        assertEquals(esperado, ZonaService.normalizarPiso(piso));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"0", "100", "-1", "P9", "1.5"})
    void unPisoFueraDe1A99NoSirve(String piso) {
        assertThrows(DatosInvalidosException.class, () -> ZonaService.normalizarPiso(piso));
    }

    @ParameterizedTest
    @CsvSource({"A, A", "a, A", " k , K"})
    void laLetraSeGuardaEnMayuscula(String letra, String esperada) {
        assertEquals(esperada, ZonaService.normalizarLetra(letra));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"AB", "1", "Ñ", "é"})
    void soloUnaLetraDeLaAALaZ(String letra) {
        assertThrows(DatosInvalidosException.class, () -> ZonaService.normalizarLetra(letra));
    }

    @Test
    void crearJuntaLosErroresAntesDeIrALaBase() {
        ZonaService servicio = new ZonaService(null, null, null);

        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> servicio.crear("0", "ab", null));

        assertEquals("El piso debe ser un número del 1 al 99. La zona debe ser una sola letra de la"
                + " A a la Z (sin Ñ). Elige el tipo de vehículo de la zona.", error.getMessage());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -3, 100})
    void laCantidadDeEspaciosVaDel1Al99(int cantidad) {
        ZonaService servicio = new ZonaService(null, null, null);

        assertThrows(DatosInvalidosException.class, () -> servicio.agregarEspacios(1, cantidad));
        assertThrows(DatosInvalidosException.class, () -> servicio.agregarEspacios(1, null));
    }

    @Test
    void elNombreDeMarcaOModeloNoQuedaVacioNiPasaDelLargo() {
        assertEquals("Kia", CatalogoService.validarNombre("  Kia ", "de la marca", 50));
        assertThrows(DatosInvalidosException.class,
                () -> CatalogoService.validarNombre(" ", "de la marca", 50));
        assertThrows(DatosInvalidosException.class,
                () -> CatalogoService.validarNombre("x".repeat(61), "del modelo", 60));
        CatalogoService catalogo = new CatalogoService(null, null, null, null, null, null);
        assertEquals("Elige la marca del modelo.", assertThrows(DatosInvalidosException.class,
                () -> catalogo.crearModelo(null, "Picanto")).getMessage());
    }
}
