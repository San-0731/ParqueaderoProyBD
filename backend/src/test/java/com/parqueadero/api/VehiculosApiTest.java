package com.parqueadero.api;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static com.parqueadero.util.TipoPorPlaca.MOTO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Map;

/**
 * Registro, actualización y consulta de vehículos y propietarios por la API
 * ({@code /api/vehiculos} y {@code /api/clientes}). No hay borrado: el
 * sistema guarda el historial de cada vehículo.
 */
class VehiculosApiTest extends PruebaApi {

    private static long idTipo(String nombre) throws SQLException {
        try (Connection conexion = conexion()) {
            return idTipo(conexion, nombre);
        }
    }

    private static boolean listaContieneVehiculo(JsonArray lista, long idVehiculo) {
        for (JsonElement elemento : lista) {
            if (elemento.getAsJsonObject().get("idVehiculo").getAsLong() == idVehiculo) {
                return true;
            }
        }
        return false;
    }

    /**
     * Crear → consultar → actualizar: la placa se guarda normalizada, el tipo
     * sale de la placa y el PUT cambia color y año sin tocar placa ni tipo.
     */
    @Test
    void crearConsultarYActualizarUnVehiculo() throws SQLException {
        long propietario = crearPropietarioPorApi();
        String placa = identificadorUnico(CARRO);

        RespuestaHttp creado = post("/vehiculos", json(Map.of(
                "identificador", enMinusculasConGuion(placa), "idCliente", propietario,
                "color", "Rojo", "anio", 2020)));
        assertEquals(201, creado.estado(), creado.cuerpo());
        JsonObject vehiculo = creado.objeto();
        long id = vehiculo.get("idVehiculo").getAsLong();
        registrarVehiculoCreado(id);
        assertEquals(placa, vehiculo.get("identificador").getAsString());
        assertEquals(idTipo(CARRO), vehiculo.get("idTipo").getAsLong());

        RespuestaHttp consultado = get("/vehiculos/" + id);
        assertEquals(200, consultado.estado());
        assertEquals("Rojo", consultado.objeto().get("color").getAsString());
        assertTrue(listaContieneVehiculo(get("/vehiculos").lista(), id), "Aparece en el listado");

        RespuestaHttp actualizado = put("/vehiculos/" + id, json(Map.of(
                "idCliente", propietario, "color", "Azul", "anio", 2021)));
        assertEquals(200, actualizado.estado(), actualizado.cuerpo());
        JsonObject despues = get("/vehiculos/" + id).objeto();
        assertEquals("Azul", despues.get("color").getAsString());
        assertEquals(2021, despues.get("anio").getAsInt());
        assertEquals(placa, despues.get("identificador").getAsString(), "La placa no cambia");
        assertEquals(idTipo(CARRO), despues.get("idTipo").getAsLong(), "El tipo no cambia");
    }

    /** El tipo sale de la placa: una placa con forma ABC12D queda registrada como moto. */
    @Test
    void elTipoSeAsignaSegunLaPlaca() throws SQLException {
        JsonObject moto = crearPropietarioYVehiculoPorApi(MOTO);

        assertEquals(idTipo(MOTO), moto.get("idTipo").getAsLong());
    }

    /** La búsqueda normaliza lo escrito: 'abc-123' y 'abc 123' encuentran 'ABC123'. */
    @ParameterizedTest
    @ValueSource(strings = {"-", " "})
    void laBusquedaPorPlacaNormalizaLoEscrito(String separador) {
        JsonObject vehiculo = crearPropietarioYVehiculoPorApi(CARRO);
        String placa = vehiculo.get("identificador").getAsString();
        String escrita = placa.substring(0, 3).toLowerCase(Locale.ROOT) + separador + placa.substring(3);

        JsonArray resultado = get("/vehiculos?identificador=" + enUrl(escrita)).lista();

        assertEquals(1, resultado.size(), resultado.toString());
        assertEquals(placa, resultado.get(0).getAsJsonObject().get("identificador").getAsString());
    }

    /** Una placa que ya existe, aunque se escriba distinto, responde 409. */
    @Test
    void crearUnaPlacaRepetidaResponde409() {
        JsonObject existente = crearPropietarioYVehiculoPorApi(CARRO);
        String placa = existente.get("identificador").getAsString();

        RespuestaHttp respuesta = post("/vehiculos", json(Map.of(
                "identificador", enMinusculasConGuion(placa),
                "idCliente", existente.get("idCliente").getAsLong())));

        String mensaje = assertError(respuesta, 409, "REGLA_NEGOCIO");
        assertTrue(mensaje.contains(placa), mensaje);
    }

    /** Un id que no existe responde 404, al consultar y al actualizar. */
    @Test
    void unIdInexistenteResponde404() {
        assertError(get("/vehiculos/999999999"), 404, "NO_ENCONTRADO");
        assertError(put("/vehiculos/999999999", json(Map.of("idCliente", 1))), 404, "NO_ENCONTRADO");
    }

    /** Un JSON mal formado responde 400, nunca 500. */
    @Test
    void unJsonMalFormadoResponde400() {
        assertError(post("/vehiculos", "{ \"identificador\": "), 400, "DATOS_INVALIDOS");
    }

    /** Faltan campos obligatorios (placa o propietario) → 400 con un mensaje que dice cuál. */
    @Test
    void sinCamposObligatoriosResponde400() {
        String sinPropietario = assertError(post("/vehiculos",
                json(Map.of("identificador", identificadorUnico(CARRO)))), 400, "DATOS_INVALIDOS");
        assertTrue(sinPropietario.contains("idCliente"), sinPropietario);

        String sinPlaca = assertError(post("/vehiculos",
                json(Map.of("idCliente", crearPropietarioPorApi()))), 400, "DATOS_INVALIDOS");
        assertTrue(sinPlaca.toLowerCase().contains("identificador"), sinPlaca);
    }

    /** No se puede cambiar la placa de un vehículo registrado (400). */
    @Test
    void noSePuedeCambiarLaPlaca() {
        JsonObject vehiculo = crearPropietarioYVehiculoPorApi(CARRO);

        assertError(put("/vehiculos/" + vehiculo.get("idVehiculo").getAsLong(), json(Map.of(
                "identificador", identificadorUnico(CARRO),
                "idCliente", vehiculo.get("idCliente").getAsLong()))), 400, "DATOS_INVALIDOS");
    }

    /**
     * Propietario: se crea, se busca por documento con puntos y se actualiza; un
     * documento repetido responde 409.
     */
    @Test
    void crearBuscarYActualizarUnPropietario() {
        String documento = documentoUnico();
        RespuestaHttp creado = post("/clientes", json(Map.of("documento", documento,
                "nombres", "Ana", "apellidos", "Prueba", "telefono", "310 000-0001")));
        assertEquals(201, creado.estado(), creado.cuerpo());
        long id = creado.objeto().get("idCliente").getAsLong();
        registrarPropietarioCreado(id);

        // 9912345678 → "99.123.456.78": la búsqueda quita los puntos.
        String conPuntos = documento.substring(0, 2) + "." + documento.substring(2, 5) + "."
                + documento.substring(5, 8) + "." + documento.substring(8);
        JsonArray encontrados = get("/clientes?documento=" + enUrl(conPuntos)).lista();
        assertEquals(1, encontrados.size(), encontrados.toString());

        RespuestaHttp actualizado = put("/clientes/" + id, json(Map.of("documento", documento,
                "nombres", "Ana María", "apellidos", "Prueba", "telefono", "3209999999")));
        assertEquals(200, actualizado.estado(), actualizado.cuerpo());
        assertEquals("Ana María", get("/clientes/" + id).objeto().get("nombres").getAsString());

        assertError(post("/clientes", json(Map.of("documento", documento,
                "nombres", "Otra", "apellidos", "Persona"))), 409, "REGLA_NEGOCIO");
    }
}
