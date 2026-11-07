package com.parqueadero;

import com.parqueadero.config.Configuracion;

import java.io.IOException;

/**
 * Punto de entrada del backend del parqueadero: carga la configuración e
 * inicia el {@link Servidor} HTTP en el puerto configurado.
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

        Servidor servidor = new Servidor(configuracion);
        int puerto = configuracion.getPuertoServidor();
        try {
            servidor.iniciar(puerto);
        } catch (IOException e) {
            System.err.println("No se pudo iniciar el servidor en el puerto " + puerto + ": "
                    + e.getMessage() + ". ¿Hay otro programa usando ese puerto?"
                    + " Cámbialo con la variable PORT.");
            System.exit(1);
            return;
        }

        // Ctrl+C o kill: deja de aceptar peticiones y espera hasta 1 s a las que
        // estén en curso.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Deteniendo el servidor...");
            servidor.detener();
        }));

        System.out.println("Servidor escuchando en http://localhost:" + puerto + "/api");
        System.out.println("Origen CORS permitido: " + configuracion.getOrigenCors());
        System.out.println("Prueba: curl http://localhost:" + puerto + "/api/salud");
    }
}
