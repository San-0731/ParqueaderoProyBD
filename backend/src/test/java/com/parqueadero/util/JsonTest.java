package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.EstadoRegistro;
import com.parqueadero.model.Pago;
import com.parqueadero.model.RegistroParqueo;
import com.parqueadero.model.Tarifa;
import com.parqueadero.model.Vehiculo;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/** Pruebas de {@link Json}. No necesitan base de datos ni servidor. */
class JsonTest {

    private static final LocalDateTime FECHA_HORA = LocalDateTime.of(2026, 11, 3, 14, 30);

    private static Pago pagoEnEfectivo() {
        return new Pago(1L, 2L, 3L, new BigDecimal("4500.00"), FECHA_HORA, null);
    }

    // ---------------------------------------------------------------- aJson

    @Test
    void idaYVuelta_recordConFechaDecimalYNulo() {
        Pago original = pagoEnEfectivo();

        assertEquals(original, Json.desdeJson(Json.aJson(original), Pago.class));
    }

    @Test
    void aJson_fechaHoraEnFormatoIsoConSegundos() {
        String json = Json.aJson(pagoEnEfectivo());

        assertTrue(json.contains("\"fechaPago\":\"2026-11-03T14:30:00\""), json);
    }

    @Test
    void aJson_fechaHoraSinFraccionDeSegundo() {
        Pago conFraccion = new Pago(1L, 2L, 3L, BigDecimal.ONE,
                LocalDateTime.of(2026, 11, 3, 14, 30, 5, 123_000_000), null);

        String json = Json.aJson(conFraccion);

        assertTrue(json.contains("\"fechaPago\":\"2026-11-03T14:30:05\""), json);
    }

    @Test
    void aJson_fechaEnFormatoIso() {
        Tarifa tarifa = new Tarifa(1L, 3L, new BigDecimal("4000.00"), LocalDate.of(2026, 11, 3));

        String json = Json.aJson(tarifa);

        assertTrue(json.contains("\"vigenteDesde\":\"2026-11-03\""), json);
    }

    @Test
    void aJson_incluyeCamposNulos() {
        String json = Json.aJson(pagoEnEfectivo());

        assertTrue(json.contains("\"referencia\":null"), json);
    }

    @Test
    void aJson_enumComoTexto() {
        RegistroParqueo activo = new RegistroParqueo(1L, 2L, 3L, FECHA_HORA, null, null, null,
                EstadoRegistro.ACTIVO);

        String json = Json.aJson(activo);

        assertTrue(json.contains("\"estado\":\"ACTIVO\""), json);
    }

    @Test
    void aJson_noEscapaTildesNiComillasSimples() {
        String json = Json.aJson(new Vehiculo(1L, "KLM234", 3L, null, 1L,
                "vehículo 'KLM234' = rojo", null));

        assertTrue(json.contains("\"color\":\"vehículo 'KLM234' = rojo\""), json);
    }

    // ------------------------------------------------------------ desdeJson

    @Test
    void desdeJson_aceptaFechaHoraSinSegundos() {
        Pago pago = Json.desdeJson("{\"fechaPago\":\"2026-11-03T14:30\"}", Pago.class);

        assertEquals(FECHA_HORA, pago.fechaPago());
    }

    @Test
    void desdeJson_fechaInvalidaLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{\"fechaPago\":\"2026-13-45T10:00\"}", Pago.class));

        assertEquals("La fecha y hora '2026-13-45T10:00' no es válida."
                + " Formato esperado: 2026-11-03T14:30:00.", error.getMessage());
    }

    @Test
    void desdeJson_fechaSinHoraInvalidaLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{\"vigenteDesde\":\"03/11/2026\"}", Tarifa.class));
    }

    @Test
    void desdeJson_jsonMalFormadoLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{\"identificador\": ", Vehiculo.class));

        assertTrue(error.getMessage().startsWith("El cuerpo de la petición no es un JSON válido."),
                error.getMessage());
    }

    @Test
    void desdeJson_jsonSinComillasLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{identificador: abc}", Vehiculo.class));

        // Gson informa la ruta "$." en este caso: no debe quedar una pista como "$..".
        assertEquals("El cuerpo de la petición no es un JSON válido.", error.getMessage());
    }

    @Test
    void desdeJson_tipoIncorrectoIndicaElCampo() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{\"idTipo\":\"abc\"}", Vehiculo.class));

        assertEquals("El cuerpo de la petición no es un JSON válido. Revisa el valor en $.idTipo.",
                error.getMessage());
    }

    @Test
    void desdeJson_textoSobranteLanzaDatosInvalidos() {
        assertThrows(DatosInvalidosException.class, () -> Json.desdeJson("{} {}", Vehiculo.class));
    }

    @Test
    void desdeJson_cuerpoVacioLanzaDatosInvalidos() {
        for (String vacio : new String[] {null, "", "   "}) {
            DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                    () -> Json.desdeJson(vacio, Vehiculo.class));
            assertEquals("El cuerpo de la petición está vacío; se esperaba un JSON.",
                    error.getMessage());
        }
    }

    @Test
    void desdeJson_literalNullLanzaDatosInvalidos() {
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("null", Vehiculo.class));

        assertEquals("Se esperaba un objeto JSON.", error.getMessage());
    }

    /** Forma de prueba con un booleano, como el cuerpo del PATCH de espacios. */
    private record ConBooleano(Boolean habilitado) {
    }

    @Test
    void desdeJson_booleanoAceptaTrueFalseYNull() {
        assertEquals(true, Json.desdeJson("{\"habilitado\":true}", ConBooleano.class).habilitado());
        assertEquals(false, Json.desdeJson("{\"habilitado\":false}", ConBooleano.class).habilitado());
        assertEquals(null, Json.desdeJson("{\"habilitado\":null}", ConBooleano.class).habilitado());
    }

    @Test
    void desdeJson_booleanoComoTextoLanzaDatosInvalidos() {
        // Sin el adaptador estricto, Gson convertiría "si" en false sin avisar.
        DatosInvalidosException error = assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{\"habilitado\":\"si\"}", ConBooleano.class));

        assertEquals("El valor 'si' no es válido; se esperaba true o false."
                + " Revisa el valor en $.habilitado.", error.getMessage());
        assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{\"habilitado\":\"true\"}", ConBooleano.class));
        assertThrows(DatosInvalidosException.class,
                () -> Json.desdeJson("{\"habilitado\":1}", ConBooleano.class));
    }

    @Test
    void aJson_booleanoSaleComoLiteral() {
        assertEquals("{\"habilitado\":false}", Json.aJson(new ConBooleano(false)));
    }

    @Test
    void desdeJson_camposFaltantesQuedanNulos() {
        Vehiculo vehiculo = Json.desdeJson("{\"identificador\":\"ABC123\"}", Vehiculo.class);

        assertEquals(new Vehiculo(null, "ABC123", null, null, null, null, null), vehiculo);
    }
}
