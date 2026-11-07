package com.parqueadero.api;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.parqueadero.util.Fechas;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * El flujo completo de un parqueo por la API, que recorre todo el enunciado:
 * registrar propietario y vehículo → entrada → aparece entre los activos → el
 * espacio deja de estar disponible → liquidación → salida con pago → aparece
 * en el historial con el método y la referencia → el espacio vuelve a estar
 * disponible → el ingreso aparece en el reporte. Se repite con cada forma de
 * pago (PSE, Nequi, Daviplata y efectivo).
 */
class FlujoParqueoApiTest extends PruebaApi {

    /** 125 minutos adentro = 3 horas cobradas (se cobra por hora o fracción). */
    private static final int MINUTOS_ADENTRO = 125;

    private static JsonObject buscarPorId(JsonArray lista, String campoId, long id) {
        for (JsonElement elemento : lista) {
            if (elemento.getAsJsonObject().get(campoId).getAsLong() == id) {
                return elemento.getAsJsonObject();
            }
        }
        return null;
    }

    /** Total recaudado del reporte de hoy para un método ({@code 0} si no tiene pagos). */
    private static BigDecimal recaudadoHoyCon(JsonObject reporte, String metodo) {
        for (JsonElement fila : reporte.getAsJsonArray("porMetodo")) {
            if (fila.getAsJsonObject().get("metodoPago").getAsString().equals(metodo)) {
                return fila.getAsJsonObject().get("totalRecaudado").getAsBigDecimal();
            }
        }
        return BigDecimal.ZERO;
    }

    private static JsonObject reporteDeHoy() {
        LocalDate hoy = Fechas.hoy();
        RespuestaHttp respuesta = get("/reportes/ingresos?desde=" + hoy + "&hasta=" + hoy);
        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        return respuesta.objeto();
    }

    @ParameterizedTest(name = "flujo completo pagando con {0}")
    @ValueSource(strings = {"PSE", "Nequi", "Daviplata", "Efectivo"})
    void flujoCompletoDeUnParqueo(String metodo) throws SQLException {
        // 1. Propietario y vehículo nuevos, y un espacio de carro libre.
        JsonObject vehiculo = crearPropietarioYVehiculoPorApi(CARRO);
        String placa = vehiculo.get("identificador").getAsString();
        long espacio = espacioNuevo(CARRO, true);
        JsonArray disponibles = get("/espacios?idTipo=" + vehiculo.get("idTipo").getAsLong()
                + "&disponible=true").lista();
        assertNotNull(buscarPorId(disponibles, "idEspacio", espacio), "El espacio empieza disponible");
        JsonObject reporteAntes = reporteDeHoy();

        // 2. Entrada (la placa escrita en minúsculas y con guion).
        JsonObject entrada = registrarEntradaPorApi(enMinusculasConGuion(placa), espacio);
        long registro = entrada.get("idRegistro").getAsLong();
        assertEquals("ACTIVO", entrada.get("estado").getAsString());
        assertEquals(placa, entrada.get("identificador").getAsString());
        assertEquals(0, entrada.getAsJsonArray("pagos").size());

        // 3. Aparece entre los vehículos que están adentro.
        JsonArray activos = get("/registros/activos?identificador=" + placa).lista();
        assertEquals(1, activos.size(), activos.toString());
        assertEquals(registro, activos.get(0).getAsJsonObject().get("idRegistro").getAsLong());
        assertEquals(espacio, activos.get(0).getAsJsonObject().get("idEspacio").getAsLong());

        // 4. El espacio queda ocupado y ya no está disponible.
        JsonObject espacioOcupado = get("/espacios/" + espacio).objeto();
        assertTrue(espacioOcupado.get("ocupado").getAsBoolean());
        assertFalse(espacioOcupado.get("disponible").getAsBoolean());
        assertNull(buscarPorId(get("/espacios?disponible=true").lista(), "idEspacio", espacio),
                "Un espacio ocupado no está en la lista de disponibles");

        // 5. Liquidación (vista previa del cobro) después de 125 minutos: 3 horas.
        simularTiempoAdentro(registro, MINUTOS_ADENTRO);
        RespuestaHttp respuestaLiquidacion = get("/registros/" + registro + "/liquidacion");
        assertEquals(200, respuestaLiquidacion.estado(), respuestaLiquidacion.cuerpo());
        JsonObject liquidacion = respuestaLiquidacion.objeto();
        assertEquals(3, liquidacion.get("horasCobradas").getAsLong());
        BigDecimal valorHora = liquidacion.get("valorHora").getAsBigDecimal();
        BigDecimal valorTotal = liquidacion.get("valorTotal").getAsBigDecimal();
        assertEquals(0, valorHora.multiply(BigDecimal.valueOf(3)).compareTo(valorTotal),
                "valorTotal = horas cobradas × valor de la hora");

        // 6. Salida con pago (la referencia solo para PSE, Nequi y Daviplata).
        boolean llevaReferencia = !metodo.equals("Efectivo");
        String referencia = "PRB-" + metodo.toUpperCase(Locale.ROOT) + "-" + placa;
        Map<String, Object> pago = new HashMap<>();
        pago.put("idMetodoPago", idMetodoPago(metodo));
        if (llevaReferencia) {
            pago.put("referencia", referencia);
        }
        RespuestaHttp respuestaSalida = post("/registros/" + registro + "/salida", json(pago));
        assertEquals(200, respuestaSalida.estado(), respuestaSalida.cuerpo());
        JsonObject cerrado = respuestaSalida.objeto();
        assertEquals("PAGO", cerrado.get("estado").getAsString());
        assertNotNull(cerrado.get("salida").getAsString());
        assertEquals(0, valorTotal.compareTo(cerrado.get("valorTotal").getAsBigDecimal()),
                "Se cobra lo mismo que mostró la liquidación");
        JsonArray pagos = cerrado.getAsJsonArray("pagos");
        assertEquals(1, pagos.size());
        JsonObject pagoGuardado = pagos.get(0).getAsJsonObject();
        assertEquals(idMetodoPago(metodo), pagoGuardado.get("idMetodo").getAsLong());
        assertEquals(0, valorTotal.compareTo(pagoGuardado.get("monto").getAsBigDecimal()));
        if (llevaReferencia) {
            assertEquals(referencia, pagoGuardado.get("referencia").getAsString());
        } else {
            assertTrue(pagoGuardado.get("referencia").isJsonNull(), "El efectivo no lleva referencia");
        }

        // 7. Aparece en el historial con el método y la referencia.
        JsonObject enHistorial = buscarPorId(get("/registros?identificador=" + placa).lista(),
                "idRegistro", registro);
        assertNotNull(enHistorial, "El parqueo cerrado está en el historial");
        assertEquals(metodo, enHistorial.get("metodosPago").getAsString());
        if (llevaReferencia) {
            assertEquals(referencia, enHistorial.get("referencias").getAsString());
        } else {
            assertTrue(enHistorial.get("referencias").isJsonNull());
        }
        assertTrue(get("/registros/activos?identificador=" + placa).lista().isEmpty(),
                "Ya no está entre los activos");

        // 8. El espacio vuelve a estar disponible.
        JsonObject espacioLibre = get("/espacios/" + espacio).objeto();
        assertFalse(espacioLibre.get("ocupado").getAsBoolean());
        assertTrue(espacioLibre.get("disponible").getAsBoolean());

        // 9. El ingreso aparece en el reporte de hoy, en su método.
        JsonObject reporteDespues = reporteDeHoy();
        assertEquals(reporteAntes.get("cantidadPagos").getAsLong() + 1,
                reporteDespues.get("cantidadPagos").getAsLong());
        assertEquals(0, reporteAntes.get("totalGeneral").getAsBigDecimal().add(valorTotal)
                .compareTo(reporteDespues.get("totalGeneral").getAsBigDecimal()));
        assertEquals(0, recaudadoHoyCon(reporteAntes, metodo).add(valorTotal)
                .compareTo(recaudadoHoyCon(reporteDespues, metodo)));
    }
}
