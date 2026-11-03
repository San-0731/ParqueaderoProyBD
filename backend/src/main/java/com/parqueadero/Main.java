package com.parqueadero;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.config.Configuracion;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Punto de entrada del backend del parqueadero.
 *
 * <p>Aquí se iniciará el servidor HTTP (com.sun.net.httpserver.HttpServer).
 */
public class Main {

    public static void main(String[] args) {
        // PRUEBA TEMPORAL: comprueba la configuración y la conexión a MySQL.
        // Se reemplaza cuando se agregue el servidor HTTP.
        try {
            Configuracion configuracion = Configuracion.cargar();
            ConexionBD conexionBD = new ConexionBD(configuracion);

            String sql = "SELECT COUNT(*) FROM vehiculo";
            try (Connection conexion = conexionBD.obtenerConexion();
                 PreparedStatement consulta = conexion.prepareStatement(sql);
                 ResultSet resultado = consulta.executeQuery()) {
                resultado.next();
                System.out.println("Vehículos registrados: " + resultado.getLong(1));
            }
        } catch (IllegalStateException e) {
            System.err.println("Error de configuración: " + e.getMessage());
            System.exit(1);
        } catch (SQLException e) {
            System.err.println("Error de base de datos: " + e.getMessage());
            System.err.println("Revisa que MySQL esté encendido (docker compose ps) y los datos del .env.");
            System.exit(1);
        }
    }
}
