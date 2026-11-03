package com.parqueadero.handler;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.util.Peticion;
import com.parqueadero.util.Respuesta;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * {@code GET /api/salud}: indica si el servidor está vivo y si puede hablar
 * con MySQL. Lo usarán el despliegue (para saber si la aplicación arrancó
 * bien) y el equipo para revisar rápido que todo esté encendido.
 *
 * <ul>
 *   <li>200 {@code { "estado": "OK", "baseDatos": "OK" }}</li>
 *   <li>503 {@code { "estado": "OK", "baseDatos": "ERROR" }}: el servidor
 *       responde, pero MySQL no.</li>
 * </ul>
 */
public final class SaludHandler {

    private static final String SQL_PRUEBA = "SELECT 1";

    private final ConexionBD conexionBD;

    public SaludHandler(ConexionBD conexionBD) {
        this.conexionBD = conexionBD;
    }

    /** Se registra en el router como {@code router.get("/api/salud", salud::consultar)}. */
    public Respuesta consultar(Peticion peticion) {
        try (Connection conexion = conexionBD.obtenerConexion();
             PreparedStatement consulta = conexion.prepareStatement(SQL_PRUEBA);
             ResultSet resultado = consulta.executeQuery()) {
            resultado.next();
            return Respuesta.ok(new EstadoSalud("OK", "OK"));
        } catch (SQLException e) {
            // Solo la primera línea del mensaje del driver (suele ser
            // "Communications link failure"); el resto es una explicación larga.
            String causa = e.getMessage() == null ? "" : e.getMessage().lines().findFirst().orElse("");
            System.err.println("Salud: no hay conexión con MySQL (" + causa + ")");
            return new Respuesta(503, new EstadoSalud("OK", "ERROR"));
        }
    }

    /** Cuerpo de la respuesta. */
    private record EstadoSalud(String estado, String baseDatos) {
    }
}
