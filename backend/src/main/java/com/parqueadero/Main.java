package com.parqueadero;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.config.Configuracion;
import com.parqueadero.handler.ApiHandler;
import com.parqueadero.handler.SaludHandler;
import com.parqueadero.util.Router;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * Punto de entrada del backend del parqueadero: carga la configuración,
 * registra las rutas de la API e inicia el servidor HTTP del JDK.
 */
public class Main {

    public static void main(String[] args) {
        Configuracion configuracion;
        try {
            configuracion = Configuracion.cargar();
        } catch (IllegalStateException e) {
            System.err.println("Error de configuración: " + e.getMessage());
            System.exit(1);
            return;
        }

        ConexionBD conexionBD = new ConexionBD(configuracion);
        Router router = registrarRutas(conexionBD);
        int puerto = configuracion.getPuertoServidor();

        HttpServer servidor;
        try {
            // Backlog 0 = valor por defecto del sistema para conexiones en espera.
            servidor = HttpServer.create(new InetSocketAddress(puerto), 0);
        } catch (IOException e) {
            System.err.println("No se pudo iniciar el servidor en el puerto " + puerto + ": "
                    + e.getMessage() + ". ¿Hay otro programa usando ese puerto?"
                    + " Cámbialo con la variable PORT.");
            System.exit(1);
            return;
        }

        // Un solo contexto: todo lo que empiece por /api lo atiende ApiHandler.
        servidor.createContext("/api", new ApiHandler(router, configuracion.getOrigenCors()));
        // Hilos virtuales (Java 21): un hilo liviano por petición; no hay que
        // dimensionar un pool de hilos.
        servidor.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        servidor.start();

        // Ctrl+C o kill: deja de aceptar peticiones y espera hasta 1 s a las que
        // estén en curso.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Deteniendo el servidor...");
            servidor.stop(1);
        }));

        System.out.println("Servidor escuchando en http://localhost:" + puerto + "/api");
        System.out.println("Origen CORS permitido: " + configuracion.getOrigenCors());
        System.out.println("Prueba: curl http://localhost:" + puerto + "/api/salud");
    }

    /** Registra todas las rutas de la API. Los pasos siguientes agregan las suyas aquí. */
    private static Router registrarRutas(ConexionBD conexionBD) {
        SaludHandler salud = new SaludHandler(conexionBD);

        return new Router()
                .get("/api/salud", salud::consultar);
    }
}
