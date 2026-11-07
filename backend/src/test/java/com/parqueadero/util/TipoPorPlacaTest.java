package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.exception.DatosInvalidosException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Pruebas de {@link TipoPorPlaca#nombreTipo(String)}. El frontend tiene los
 * mismos casos en {@code utils/tipoVehiculo.test.js}.
 */
class TipoPorPlacaTest {

    // Cada fila: placa tal como se escribe, tipo esperado.
    @ParameterizedTest(name = "{0} es {1}")
    @CsvSource({
        // Carros: 3 letras y 3 números.
        "KLM234, Carro",
        "abc-123, Carro",
        // Motos: 3 letras, 2 números y 1 letra.
        "ABC12D, Moto",
        "qwe 45f, Moto",
        // Camión de carga pesada: R o S y 5 números.
        "R48213, Camión",
        "S12345, Camión",
        "s-00001, Camión",
        // Todo lo demás: bicicleta.
        "WTU2024A0153, Bicicleta",
        "BICI0007, Bicicleta",
        "R1234, Bicicleta",
        "S123456, Bicicleta",
        "T12345, Bicicleta",
        "R48213X, Bicicleta",
        "ABC1234, Bicicleta",
        "AB123, Bicicleta",
        "ABC12, Bicicleta",
        "CD1234, Bicicleta",
    })
    void nombreTipo_segunLaPlaca(String placa, String tipoEsperado) {
        assertEquals(tipoEsperado, TipoPorPlaca.nombreTipo(placa));
    }

    @Test
    void nombreTipo_sinPlacaLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class, () -> TipoPorPlaca.nombreTipo(null));
        assertThrows(DatosInvalidosException.class, () -> TipoPorPlaca.nombreTipo(" - "));
    }
}
