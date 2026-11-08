package com.parqueadero.integracion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.parqueadero.Servidor;
import com.parqueadero.util.TipoPorPlaca;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.Set;

/**
 * Comprueba que el entorno de las pruebas de integración está listo: la base
 * {@code parqueadero_test} recreada desde las migraciones, las utilidades de
 * {@link PruebaIntegracion} y el {@link Servidor} en un puerto libre.
 */
class EntornoPruebasTest extends PruebaIntegracion {

    /** Las pruebas nunca deben conectarse a la base de desarrollo. */
    @Test
    void laConexionUsaLaBaseDePruebas() throws SQLException {
        assertEquals(Set.of("parqueadero_test"), consultarNombres("SELECT DATABASE()"));
    }

    /** El script recrear-bd-pruebas.sh aplicó todas las migraciones (V001 a V009). */
    @Test
    void laBaseDePruebasTieneTodasLasTablasVistasYTriggers() throws SQLException {
        assertEquals(Set.of("tipo_vehiculo", "tarifa", "marca", "modelo", "cliente", "vehiculo",
                        "zona", "espacio", "registro_parqueo", "metodo_pago", "pago",
                        "rol", "usuario", "sesion", "auditoria"),
                consultarNombres("SELECT TABLE_NAME FROM information_schema.TABLES"
                        + " WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"));
        assertEquals(Set.of("vw_espacios_disponibles", "vw_parqueos_activos",
                        "vw_historial_parqueos", "vw_ingresos_por_metodo",
                        "vw_auditoria", "vw_auditoria_operadores"),
                consultarNombres("SELECT TABLE_NAME FROM information_schema.VIEWS"
                        + " WHERE TABLE_SCHEMA = DATABASE()"));
        assertEquals(Set.of("trg_vehiculo_normalizar_insert", "trg_vehiculo_normalizar_update",
                        "trg_registro_validar_insert", "trg_registro_validar_update",
                        "trg_cliente_auditar_insert", "trg_cliente_auditar_update",
                        "trg_vehiculo_auditar_insert", "trg_vehiculo_auditar_update",
                        "trg_registro_parqueo_auditar_insert", "trg_registro_parqueo_auditar_update",
                        "trg_pago_auditar_insert", "trg_espacio_auditar_update"),
                consultarNombres("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS"
                        + " WHERE TRIGGER_SCHEMA = DATABASE()"));
    }

    /**
     * La placa generada corresponde al tipo pedido (misma regla que
     * TipoPorPlaca) y lo creado se borra al limpiar.
     */
    @ParameterizedTest
    @ValueSource(strings = {TipoPorPlaca.CARRO, TipoPorPlaca.MOTO, TipoPorPlaca.CAMION,
            TipoPorPlaca.BICICLETA})
    void crearVehiculoUsaUnaPlacaDelTipoYLimpiarLoBorra(String tipo) throws SQLException {
        VehiculoPrueba vehiculo;
        try (Connection conexion = conexion()) {
            vehiculo = crearVehiculo(conexion, tipo);
        }

        assertEquals(tipo, TipoPorPlaca.nombreTipo(vehiculo.identificador()));
        assertTrue(existeFila("SELECT 1 FROM vehiculo WHERE id_vehiculo = ? AND identificador = ?",
                vehiculo.idVehiculo(), vehiculo.identificador()));

        limpiarDatosCreados();

        assertFalse(existeFila("SELECT 1 FROM vehiculo WHERE id_vehiculo = ? AND identificador = ?",
                vehiculo.idVehiculo(), vehiculo.identificador()));
        assertFalse(existeFila("SELECT 1 FROM cliente WHERE id_cliente = ?", vehiculo.idCliente()));
    }

    /** Con el puerto 0 el sistema asigna uno libre; la API responde ahí y se puede detener. */
    @Test
    void servidorEnPuertoCeroUsaUnPuertoLibreYResponde() throws Exception {
        Servidor servidor = new Servidor(configuracion());
        servidor.iniciar(0);
        try (HttpClient cliente = HttpClient.newHttpClient()) {
            int puerto = servidor.getPuerto();
            assertTrue(puerto > 0, "El sistema debe asignar un puerto real");

            HttpRequest peticion = HttpRequest.newBuilder(
                    URI.create("http://localhost:" + puerto + "/api/salud")).GET().build();
            HttpResponse<String> respuesta = cliente.send(peticion, HttpResponse.BodyHandlers.ofString());

            assertEquals(200, respuesta.statusCode());
        } finally {
            servidor.detener();
        }
        assertThrows(IllegalStateException.class, servidor::getPuerto);
    }

    // ---------------------------------------------------------------- auxiliares

    private static Set<String> consultarNombres(String sql) throws SQLException {
        Set<String> nombres = new HashSet<>();
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(sql);
             ResultSet filas = consulta.executeQuery()) {
            while (filas.next()) {
                nombres.add(filas.getString(1));
            }
        }
        return nombres;
    }

    private static boolean existeFila(String sql, Object... parametros) throws SQLException {
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(sql)) {
            for (int i = 0; i < parametros.length; i++) {
                consulta.setObject(i + 1, parametros[i]);
            }
            try (ResultSet fila = consulta.executeQuery()) {
                return fila.next();
            }
        }
    }
}
