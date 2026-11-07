package com.parqueadero.api;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static com.parqueadero.util.TipoPorPlaca.MOTO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.Map;

/**
 * Reglas del negocio vistas desde la API. Las de la entrada las aplica la base
 * de datos (triggers e índices únicos) y la API las traduce a 409 con un
 * mensaje claro. Las del pago las valida el servicio antes de escribir.
 */
class ReglasApiTest extends PruebaApi {

    private static RespuestaHttp entrada(String identificador, long idEspacio) {
        return post("/registros/entrada", json(Map.of(
                "identificador", identificador, "idEspacio", idEspacio)));
    }

    private static String placa(JsonObject vehiculo) {
        return vehiculo.get("identificador").getAsString();
    }

    /** Trigger 2: una moto en un espacio de carro → 409 con el mensaje del trigger. */
    @Test
    void vehiculoDeOtroTipoQueElEspacioResponde409() throws SQLException {
        JsonObject moto = crearPropietarioYVehiculoPorApi(MOTO);

        String mensaje = assertError(entrada(placa(moto), espacioNuevo(CARRO, true)),
                409, "REGLA_NEGOCIO");
        assertEquals("El tipo del vehículo no coincide con el tipo del espacio", mensaje);
    }

    /** Trigger 3: un espacio deshabilitado → 409 con el mensaje del trigger. */
    @Test
    void espacioDeshabilitadoResponde409() throws SQLException {
        JsonObject carro = crearPropietarioYVehiculoPorApi(CARRO);

        String mensaje = assertError(entrada(placa(carro), espacioNuevo(CARRO, false)),
                409, "REGLA_NEGOCIO");
        assertEquals("El espacio no está habilitado", mensaje);
    }

    /** uq_registro_espacio_activo: un espacio ocupado no recibe otro vehículo → 409. */
    @Test
    void espacioOcupadoResponde409() throws SQLException {
        JsonObject primero = crearPropietarioYVehiculoPorApi(CARRO);
        JsonObject segundo = crearPropietarioYVehiculoPorApi(CARRO);
        long espacio = espacioNuevo(CARRO, true);
        registrarEntradaPorApi(placa(primero), espacio);

        String mensaje = assertError(entrada(placa(segundo), espacio), 409, "REGLA_NEGOCIO");
        assertEquals("El espacio ya está ocupado por otro vehículo.", mensaje);
    }

    /** uq_registro_vehiculo_activo: un vehículo que ya está adentro no entra otra vez → 409. */
    @Test
    void vehiculoQueYaEstaAdentroResponde409() throws SQLException {
        JsonObject carro = crearPropietarioYVehiculoPorApi(CARRO);
        registrarEntradaPorApi(placa(carro), espacioNuevo(CARRO, true));

        String mensaje = assertError(entrada(placa(carro), espacioNuevo(CARRO, true)),
                409, "REGLA_NEGOCIO");
        assertEquals("El vehículo ya tiene un parqueo activo.", mensaje);
    }

    /**
     * PSE exige la referencia: sin ella responde 400 y el registro sigue
     * abierto, sin salida ni pagos (no se escribe nada).
     */
    @Test
    void pseSinReferenciaResponde400YElRegistroSigueAbierto() throws SQLException {
        JsonObject carro = crearPropietarioYVehiculoPorApi(CARRO);
        long registro = registrarEntradaPorApi(placa(carro), espacioNuevo(CARRO, true))
                .get("idRegistro").getAsLong();
        simularTiempoAdentro(registro, 60);

        String mensaje = assertError(post("/registros/" + registro + "/salida",
                json(Map.of("idMetodoPago", idMetodoPago("PSE")))), 400, "DATOS_INVALIDOS");
        assertTrue(mensaje.contains("referencia"), mensaje);

        JsonObject sigueAbierto = get("/registros/" + registro).objeto();
        assertEquals("ACTIVO", sigueAbierto.get("estado").getAsString());
        assertTrue(sigueAbierto.get("salida").isJsonNull());
        assertEquals(0, sigueAbierto.getAsJsonArray("pagos").size());
    }

    /** Un parqueo ya cerrado no se puede cerrar otra vez → 409, y queda un solo pago. */
    @Test
    void cerrarDosVecesElMismoParqueoResponde409() throws SQLException {
        JsonObject carro = crearPropietarioYVehiculoPorApi(CARRO);
        long registro = registrarEntradaPorApi(placa(carro), espacioNuevo(CARRO, true))
                .get("idRegistro").getAsLong();
        simularTiempoAdentro(registro, 60);
        String pagoEnEfectivo = json(Map.of("idMetodoPago", idMetodoPago("Efectivo")));

        assertEquals(200, post("/registros/" + registro + "/salida", pagoEnEfectivo).estado());
        String mensaje = assertError(post("/registros/" + registro + "/salida", pagoEnEfectivo),
                409, "REGLA_NEGOCIO");
        assertTrue(mensaje.contains("ya está cerrado"), mensaje);
        assertEquals(1, get("/registros/" + registro).objeto().getAsJsonArray("pagos").size());
    }
}
