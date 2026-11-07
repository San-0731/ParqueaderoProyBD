package com.parqueadero;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.config.Configuracion;
import com.parqueadero.dao.UsuarioDAO;
import com.parqueadero.service.UsuarioService;

import java.io.IOException;

/**
 * Punto de entrada del backend del parqueadero: carga la configuración, crea
 * el primer DBA si todavía no hay ninguno e inicia el {@link Servidor} HTTP en
 * el puerto configurado.
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

        prepararDbaInicial(configuracion);

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

    /**
     * Si no hay ningún DBA activo, lo crea con DBA_USUARIO y DBA_CLAVE_INICIAL.
     * Si algo falla (por ejemplo, MySQL apagado), solo avisa: el servidor
     * arranca igual y {@code /api/salud} muestra el problema.
     */
    private static void prepararDbaInicial(Configuracion configuracion) {
        UsuarioService usuarios = new UsuarioService(new ConexionBD(configuracion), new UsuarioDAO());
        try {
            switch (usuarios.crearDbaInicialSiFalta(configuracion.getDbaUsuario(),
                    configuracion.getDbaClaveInicial())) {
                case CREADO -> System.out.println("Se creó el primer DBA: '"
                        + configuracion.getDbaUsuario() + "'. Cambia su contraseña inicial.");
                case YA_EXISTE -> {
                    // Lo normal: no hay nada que avisar.
                }
                case FALTAN_DATOS -> System.out.println("AVISO: no hay ningún DBA activo. Define"
                        + " DBA_USUARIO y DBA_CLAVE_INICIAL en el .env y reinicia el backend.");
            }
        } catch (RuntimeException e) {
            // Nunca se imprime la contraseña: solo el motivo.
            System.err.println("AVISO: no se pudo revisar o crear el primer DBA: " + e.getMessage());
        }
    }
}
