package com.parqueadero.api;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Dos operarios cobran la salida del mismo vehículo al mismo tiempo. El
 * servicio lee el registro con {@code SELECT ... FOR UPDATE}: la primera
 * transacción lo bloquea y lo cierra; las demás esperan y, cuando lo leen, ya
 * está cerrado. Resultado: un solo cobro.
 */
class ConcurrenciaApiTest extends PruebaApi {

    private static final int PETICIONES = 10;

    private static long pagosDelRegistro(long idRegistro) throws SQLException {
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(
                     "SELECT COUNT(*) FROM pago WHERE id_registro = ?")) {
            consulta.setLong(1, idRegistro);
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                return fila.getLong(1);
            }
        }
    }

    /** 10 salidas simultáneas del mismo registro: exactamente una 200, nueve 409 y un solo pago. */
    @Test
    void salidasSimultaneasDelMismoRegistroCobranUnaSolaVez() throws Exception {
        JsonObject carro = crearPropietarioYVehiculoPorApi(CARRO);
        long registro = registrarEntradaPorApi(carro.get("identificador").getAsString(),
                espacioNuevo(CARRO, true)).get("idRegistro").getAsLong();
        simularTiempoAdentro(registro, 60);
        String pagoEnEfectivo = json(Map.of("idMetodoPago", idMetodoPago("Efectivo")));

        // Cada hilo (virtual) espera la "señal de salida" para que todas las
        // peticiones lleguen al servidor prácticamente al mismo tiempo.
        CountDownLatch senalDeSalida = new CountDownLatch(1);
        List<Future<RespuestaHttp>> respuestas = new ArrayList<>();
        try (ExecutorService hilos = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < PETICIONES; i++) {
                respuestas.add(hilos.submit(() -> {
                    senalDeSalida.await();
                    return post("/registros/" + registro + "/salida", pagoEnEfectivo);
                }));
            }
            senalDeSalida.countDown();
        } // close() espera a que terminen todas.

        int exitosas = 0;
        int rechazadas = 0;
        for (Future<RespuestaHttp> futura : respuestas) {
            RespuestaHttp respuesta = futura.get();
            if (respuesta.estado() == 200) {
                exitosas++;
            } else {
                assertError(respuesta, 409, "REGLA_NEGOCIO");
                rechazadas++;
            }
        }
        assertEquals(1, exitosas, "Solo una salida puede cerrar el registro");
        assertEquals(PETICIONES - 1, rechazadas, "Las demás encuentran el registro ya cerrado");
        assertEquals(1, pagosDelRegistro(registro), "En la base queda un solo pago");
    }
}
