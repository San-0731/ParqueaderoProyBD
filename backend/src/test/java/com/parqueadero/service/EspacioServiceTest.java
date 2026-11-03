package com.parqueadero.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import org.junit.jupiter.api.Test;

/** Pruebas de {@link EspacioService} que no necesitan base de datos. */
class EspacioServiceTest {

    @Test
    void cambiarHabilitado_sinValorLanzaDatosInvalidos() {
        // Sin conexión ni DAO: la validación ocurre antes de ir a la base,
        // así que no se llega a usarlos.
        EspacioService servicio = new EspacioService(null, null);

        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> servicio.cambiarHabilitado(1, null));

        assertEquals("El campo habilitado es obligatorio (true o false).", error.getMessage());
    }
}
