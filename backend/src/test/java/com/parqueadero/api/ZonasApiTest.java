package com.parqueadero.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.parqueadero.model.Rol;
import com.parqueadero.util.TipoPorPlaca;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Zonas y creación de espacios ({@code /api/zonas}). Crear zonas y agregarles
 * espacios es del DBA. Las zonas de estas pruebas van en pisos del 80 al 89
 * (ni la semilla ni las zonas de prueba compartidas del piso 99 los usan) y se
 * borran al final con sus espacios.
 */
class ZonasApiTest extends PruebaApi {

    private String tokenDba;

    @BeforeEach
    void iniciarSesionComoDba() {
        tokenDba = tokenConRol(Rol.DBA);
    }

    /** Un piso del 80 al 89 y una letra que todavía no forman una zona. */
    private static String[] zonaLibre() throws SQLException {
        for (int intento = 0; intento < 200; intento++) {
            String piso = String.valueOf(80 + (int) (Math.random() * 10));
            String letra = String.valueOf((char) ('A' + (int) (Math.random() * 26)));
            try (Connection conexion = conexion();
                 PreparedStatement consulta = conexion.prepareStatement(
                         "SELECT 1 FROM zona WHERE piso = ? AND letra = ?")) {
                consulta.setString(1, piso);
                consulta.setString(2, letra);
                try (ResultSet fila = consulta.executeQuery()) {
                    if (!fila.next()) {
                        return new String[] {piso, letra};
                    }
                }
            }
        }
        throw new IllegalStateException("No se encontró una zona libre en los pisos 80 a 89.");
    }

    private RespuestaHttp crearZona(Object piso, String letra, Object idTipo) {
        Map<String, Object> datos = new HashMap<>();
        datos.put("piso", piso);
        datos.put("letra", letra);
        datos.put("idTipo", idTipo);
        RespuestaHttp respuesta = enviar("POST", "/zonas", json(datos), tokenDba);
        if (respuesta.estado() == 201) {
            registrarZonaCreada(respuesta.objeto().get("idZona").getAsLong());
        }
        return respuesta;
    }

    private RespuestaHttp agregarEspacios(long idZona, int cantidad) {
        RespuestaHttp respuesta = enviar("POST", "/zonas/" + idZona + "/espacios",
                json(Map.of("cantidad", cantidad)), tokenDba);
        if (respuesta.estado() == 201) {
            for (JsonElement espacio : respuesta.lista()) {
                registrarEspacioCreado(espacio.getAsJsonObject().get("idEspacio").getAsLong());
            }
        }
        return respuesta;
    }

    private static List<String> numeros(JsonArray espacios) {
        List<String> numeros = new ArrayList<>();
        for (JsonElement espacio : espacios) {
            numeros.add(espacio.getAsJsonObject().get("numero").getAsString());
        }
        return numeros;
    }

    private long idTipoCarro() throws SQLException {
        try (Connection conexion = conexion()) {
            return idTipo(conexion, TipoPorPlaca.CARRO);
        }
    }

    // ------------------------------------------------------------ consultar

    @Test
    void cualquierRolConsultaLasZonasConSusEspacios() {
        RespuestaHttp respuesta = enviar("GET", "/zonas", null, tokenConRol(Rol.OPERADOR));

        assertEquals(200, respuesta.estado(), respuesta.cuerpo());
        JsonObject a1 = null;
        for (JsonElement elemento : respuesta.lista()) {
            JsonObject zona = elemento.getAsJsonObject();
            if ("1".equals(zona.get("piso").getAsString()) && "A".equals(zona.get("letra").getAsString())) {
                a1 = zona;
            }
        }
        assertEquals("Carro", a1.get("tipoVehiculo").getAsString());
        assertEquals(8, a1.get("espacios").getAsInt());
        assertEquals("08", a1.get("ultimoNumero").getAsString());
    }

    // ------------------------------------------------------------ crear zonas

    @Test
    void elDbaCreaUnaZonaVaciaYAsiNaceUnPisoNuevo() throws SQLException {
        String[] libre = zonaLibre();

        // Se aceptan el piso con cero a la izquierda y la letra en minúscula.
        RespuestaHttp respuesta = crearZona("0" + libre[0], libre[1].toLowerCase(), idTipoCarro());

        assertEquals(201, respuesta.estado(), respuesta.cuerpo());
        JsonObject zona = respuesta.objeto();
        assertEquals(libre[0], zona.get("piso").getAsString());
        assertEquals(libre[1], zona.get("letra").getAsString());
        assertEquals("Carro", zona.get("tipoVehiculo").getAsString());
        assertEquals(0, zona.get("espacios").getAsInt());
        assertTrue(zona.get("ultimoNumero") == null || zona.get("ultimoNumero").isJsonNull());
    }

    @Test
    void laMismaLetraEnElMismoPisoResponde409() throws SQLException {
        String[] libre = zonaLibre();
        crearZona(libre[0], libre[1], idTipoCarro());

        RespuestaHttp repetida = crearZona(libre[0], libre[1], idTipoCarro());

        assertEquals(409, repetida.estado(), repetida.cuerpo());
        assertEquals("Ya existe una zona con esa letra en ese piso.",
                repetida.objeto().get("mensaje").getAsString());
    }

    @Test
    void conDatosInvalidosResponde400ConTodosLosErrores() {
        RespuestaHttp respuesta = crearZona("100", "Ñ", null);

        assertEquals(400, respuesta.estado(), respuesta.cuerpo());
        String mensaje = respuesta.objeto().get("mensaje").getAsString();
        assertTrue(mensaje.contains("El piso debe ser un número del 1 al 99."), mensaje);
        assertTrue(mensaje.contains("La zona debe ser una sola letra de la A a la Z"), mensaje);
        assertTrue(mensaje.contains("Elige el tipo de vehículo de la zona."), mensaje);
    }

    @Test
    void conUnTipoQueNoExisteResponde400() throws SQLException {
        String[] libre = zonaLibre();

        RespuestaHttp respuesta = crearZona(libre[0], libre[1], 999_999);

        assertEquals(400, respuesta.estado(), respuesta.cuerpo());
        assertEquals("El tipo de vehículo indicado no existe.",
                respuesta.objeto().get("mensaje").getAsString());
    }

    // ------------------------------------------------------------ agregar espacios

    @Test
    void losEspaciosNuevosSiguenLaNumeracionDeLaZona() throws SQLException {
        String[] libre = zonaLibre();
        long idZona = crearZona(libre[0], libre[1], idTipoCarro()).objeto().get("idZona").getAsLong();

        RespuestaHttp primeros = agregarEspacios(idZona, 3);
        RespuestaHttp siguientes = agregarEspacios(idZona, 2);

        assertEquals(201, primeros.estado(), primeros.cuerpo());
        assertEquals(List.of("01", "02", "03"), numeros(primeros.lista()));
        assertEquals(List.of("04", "05"), numeros(siguientes.lista()));
        JsonObject uno = primeros.lista().get(0).getAsJsonObject();
        assertEquals(libre[0], uno.get("piso").getAsString());
        assertEquals(libre[1], uno.get("zona").getAsString());
        assertTrue(uno.get("habilitado").getAsBoolean());
        assertTrue(uno.get("disponible").getAsBoolean());

        // La zona ya tiene 5 y el piso nuevo aparece en la lista de espacios.
        RespuestaHttp espacios = enviar("GET", "/espacios", null, tokenDba);
        long enEsaZona = espacios.lista().asList().stream()
                .map(JsonElement::getAsJsonObject)
                .filter(e -> libre[0].equals(e.get("piso").getAsString())
                        && libre[1].equals(e.get("zona").getAsString()))
                .count();
        assertEquals(5, enEsaZona);
    }

    @Test
    void unVehiculoPuedeEntrarAUnEspacioNuevo() throws SQLException {
        String[] libre = zonaLibre();
        long idZona = crearZona(libre[0], libre[1], idTipoCarro()).objeto().get("idZona").getAsLong();
        long idEspacio = agregarEspacios(idZona, 1).lista().get(0).getAsJsonObject()
                .get("idEspacio").getAsLong();
        VehiculoPrueba carro;
        try (Connection conexion = conexion()) {
            carro = crearVehiculo(conexion, TipoPorPlaca.CARRO);
        }

        RespuestaHttp entrada = enviar("POST", "/registros/entrada", json(Map.of(
                "identificador", carro.identificador(), "idEspacio", idEspacio)),
                tokenConRol(Rol.OPERADOR));

        assertEquals(201, entrada.estado(), entrada.cuerpo());
        assertEquals(libre[0], entrada.objeto().get("piso").getAsString());
    }

    @Test
    void noSePasaDelEspacio99() throws SQLException {
        String[] libre = zonaLibre();
        long idZona = crearZona(libre[0], libre[1], idTipoCarro()).objeto().get("idZona").getAsLong();
        assertEquals(201, agregarEspacios(idZona, 98).estado());

        RespuestaHttp respuesta = agregarEspacios(idZona, 2);

        assertEquals(409, respuesta.estado(), respuesta.cuerpo());
        assertEquals("La zona " + libre[1] + libre[0] + " llega hasta el espacio 98: solo le caben 1"
                + " más (el último número es el 99).", respuesta.objeto().get("mensaje").getAsString());
        // El último sí cabe.
        assertEquals(List.of("99"), numeros(agregarEspacios(idZona, 1).lista()));
    }

    @Test
    void cantidadInvalidaOZonaQueNoExiste() throws SQLException {
        String[] libre = zonaLibre();
        long idZona = crearZona(libre[0], libre[1], idTipoCarro()).objeto().get("idZona").getAsLong();

        assertEquals(400, agregarEspacios(idZona, 0).estado());
        assertEquals(400, agregarEspacios(idZona, 100).estado());
        assertEquals(404, agregarEspacios(999_999_999L, 1).estado());
    }
}
