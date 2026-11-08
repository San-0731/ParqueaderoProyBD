package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.parqueadero.model.Rol;
import com.parqueadero.util.Fechas;
import com.parqueadero.util.TipoPorPlaca;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * Auditoría de punta a punta: los cambios se hacen por la API (el backend pasa
 * el usuario a MySQL en {@code @id_usuario_app}) y se consultan con
 * {@code GET /api/auditoria}.
 */
class AuditoriaApiTest extends PruebaApi {

    /** Registra por la API, con el token dado, un propietario y su carro; devuelve la placa. */
    private String registrarCarro(String token) {
        RespuestaHttp propietario = enviar("POST", "/clientes", json(Map.of(
                "documento", documentoUnico(), "nombres", "Prueba", "apellidos", "Auditoría")), token);
        long idCliente = propietario.objeto().get("idCliente").getAsLong();
        registrarPropietarioCreado(idCliente);
        String placa = identificadorUnico(TipoPorPlaca.CARRO);
        RespuestaHttp vehiculo = enviar("POST", "/vehiculos",
                json(Map.of("identificador", placa, "idCliente", idCliente)), token);
        assertEquals(201, vehiculo.estado(), vehiculo.cuerpo());
        registrarVehiculoCreado(vehiculo.objeto().get("idVehiculo").getAsLong());
        return placa;
    }

    private static JsonArray auditoria(String token, String filtros) {
        RespuestaHttp respuesta = enviar("GET", "/auditoria" + filtros, null, token);
        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        return respuesta.lista();
    }

    /** Los registros de la auditoría de la tabla vehiculo con esa placa en sus datos. */
    private static List<JsonObject> deLaPlaca(JsonArray registros, String placa) {
        return registros.asList().stream()
                .map(JsonElement::getAsJsonObject)
                .filter(r -> "vehiculo".equals(r.get("tabla").getAsString()))
                .filter(r -> placa.equals(r.getAsJsonObject("datosDespues").get("placa").getAsString()))
                .toList();
    }

    @Test
    void loQueHaceUnOperadorLoVenElAdministradorYElDba() {
        UsuarioPrueba operador = crearUsuario(Rol.OPERADOR);
        String placa = registrarCarro(tokenDe(operador));

        for (Rol rol : List.of(Rol.ADMINISTRADOR, Rol.DBA)) {
            List<JsonObject> registros = deLaPlaca(auditoria(tokenConRol(rol), "?tabla=vehiculo"), placa);
            assertEquals(1, registros.size(), rol + " debía ver el vehículo que creó el operador");
            JsonObject registro = registros.get(0);
            assertEquals("INSERT", registro.get("operacion").getAsString());
            assertEquals(operador.nombreUsuario(), registro.get("nombreUsuario").getAsString());
            assertEquals("OPERADOR", registro.get("rol").getAsString());
            assertEquals("Carro", registro.getAsJsonObject("datosDespues").get("tipo").getAsString());
        }
    }

    @Test
    void elAdministradorNoVeLoDeOtrosAdministradoresPeroElDbaSi() {
        UsuarioPrueba administrador = crearUsuario(Rol.ADMINISTRADOR);
        String placa = registrarCarro(tokenDe(administrador));

        assertEquals(List.of(), deLaPlaca(auditoria(tokenConRol(Rol.ADMINISTRADOR), ""), placa));
        List<JsonObject> paraElDba = deLaPlaca(auditoria(tokenConRol(Rol.DBA), ""), placa);
        assertEquals(1, paraElDba.size());
        assertEquals("ADMINISTRADOR", paraElDba.get(0).get("rol").getAsString());
    }

    @Test
    void loQueHaceElDbaNoQuedaEnLaAuditoria() throws SQLException {
        UsuarioPrueba dba = crearUsuario(Rol.DBA);
        String placa = registrarCarro(tokenDe(dba));

        assertEquals(List.of(), deLaPlaca(auditoria(tokenDe(dba), ""), placa));
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(
                     "SELECT COUNT(*) FROM auditoria WHERE id_usuario = ?")) {
            consulta.setLong(1, dba.idUsuario());
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                assertEquals(0, fila.getInt(1));
            }
        }
    }

    @Test
    void cadaPeticionQuedaConSuPropioUsuario() {
        UsuarioPrueba primero = crearUsuario(Rol.OPERADOR);
        UsuarioPrueba segundo = crearUsuario(Rol.OPERADOR);

        String placaPrimero = registrarCarro(tokenDe(primero));
        String placaSegundo = registrarCarro(tokenDe(segundo));

        JsonArray registros = auditoria(tokenConRol(Rol.DBA), "?tabla=vehiculo");
        assertEquals(primero.nombreUsuario(),
                deLaPlaca(registros, placaPrimero).get(0).get("nombreUsuario").getAsString());
        assertEquals(segundo.nombreUsuario(),
                deLaPlaca(registros, placaSegundo).get(0).get("nombreUsuario").getAsString());
    }

    @Test
    void losFiltrosDeFechaYTablaFuncionan() {
        UsuarioPrueba operador = crearUsuario(Rol.OPERADOR);
        String placa = registrarCarro(tokenDe(operador));
        String token = tokenConRol(Rol.ADMINISTRADOR);

        // Ayer no hubo nada de esta prueba; hoy sí. "Hoy" es el de Bogotá (Fechas.hoy()), igual
        // que en MySQL y en la aplicación: con LocalDate.now() la prueba dependería de la zona
        // horaria de la máquina (en GitHub Actions es UTC, y después de las 7 p. m. de Bogotá
        // ya sería el día siguiente).
        String hoy = Fechas.hoy().toString();
        String ayer = Fechas.hoy().minusDays(1).toString();
        assertEquals(List.of(), deLaPlaca(auditoria(token, "?desde=" + ayer + "&hasta=" + ayer), placa));
        assertEquals(1, deLaPlaca(auditoria(token, "?desde=" + hoy + "&hasta=" + hoy), placa).size());
        // Con otra tabla, el vehículo no aparece.
        assertFalse(auditoria(token, "?tabla=pago").asList().stream()
                .anyMatch(r -> "vehiculo".equals(r.getAsJsonObject().get("tabla").getAsString())));
    }

    @Test
    void filtrosInvalidosResponden400() {
        String token = tokenConRol(Rol.ADMINISTRADOR);

        assertEquals(400, enviar("GET", "/auditoria?tabla=usuario", null, token).estado());
        assertEquals(400, enviar("GET", "/auditoria?desde=2026-11-07&hasta=2026-11-01", null, token)
                .estado());
    }

    @Test
    void elOperadorNoVeLaAuditoria() {
        RespuestaHttp respuesta = enviar("GET", "/auditoria", null, tokenConRol(Rol.OPERADOR));

        assertEquals(403, respuesta.estado());
        assertTrue(respuesta.objeto().get("mensaje").getAsString().contains("Administrador o DBA"));
    }
}
