package com.parqueadero;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.config.Configuracion;
import com.parqueadero.dao.ClienteDAO;
import com.parqueadero.dao.EspacioDAO;
import com.parqueadero.dao.MarcaDAO;
import com.parqueadero.dao.MetodoPagoDAO;
import com.parqueadero.dao.ModeloDAO;
import com.parqueadero.dao.PagoDAO;
import com.parqueadero.dao.RegistroDAO;
import com.parqueadero.dao.TarifaDAO;
import com.parqueadero.dao.TipoVehiculoDAO;
import com.parqueadero.dao.VehiculoDAO;
import com.parqueadero.handler.ApiHandler;
import com.parqueadero.handler.CatalogoHandler;
import com.parqueadero.handler.ClienteHandler;
import com.parqueadero.handler.EspacioHandler;
import com.parqueadero.handler.RegistroHandler;
import com.parqueadero.handler.SaludHandler;
import com.parqueadero.handler.VehiculoHandler;
import com.parqueadero.service.CatalogoService;
import com.parqueadero.service.ClienteService;
import com.parqueadero.service.EspacioService;
import com.parqueadero.service.RegistroService;
import com.parqueadero.service.VehiculoService;
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

    /**
     * Crea los handlers (con sus servicios y DAO) y registra todas las rutas de
     * la API. Los pasos siguientes agregan las suyas aquí.
     */
    private static Router registrarRutas(ConexionBD conexionBD) {
        SaludHandler salud = new SaludHandler(conexionBD);
        VehiculoHandler vehiculos = new VehiculoHandler(
                new VehiculoService(conexionBD, new VehiculoDAO()));
        CatalogoHandler catalogos = new CatalogoHandler(new CatalogoService(conexionBD,
                new TipoVehiculoDAO(), new MetodoPagoDAO(), new TarifaDAO(), new MarcaDAO(),
                new ModeloDAO()));
        ClienteHandler clientes = new ClienteHandler(
                new ClienteService(conexionBD, new ClienteDAO()));
        EspacioHandler espacios = new EspacioHandler(
                new EspacioService(conexionBD, new EspacioDAO()));
        RegistroHandler registros = new RegistroHandler(new RegistroService(conexionBD,
                new VehiculoDAO(), new RegistroDAO(), new PagoDAO()));

        return new Router()
                .get("/api/salud", salud::consultar)

                .get("/api/vehiculos", vehiculos::listar)
                .get("/api/vehiculos/{id}", vehiculos::buscarPorId)
                .post("/api/vehiculos", vehiculos::crear)
                .put("/api/vehiculos/{id}", vehiculos::actualizar)

                .get("/api/tipos-vehiculo", catalogos::tiposVehiculo)
                .get("/api/metodos-pago", catalogos::metodosPago)
                .get("/api/tarifas/vigente", catalogos::tarifasVigentes)
                .get("/api/marcas", catalogos::marcas)
                .get("/api/modelos", catalogos::modelos)

                .get("/api/clientes", clientes::listar)
                .get("/api/clientes/{id}", clientes::buscarPorId)
                .post("/api/clientes", clientes::crear)
                .put("/api/clientes/{id}", clientes::actualizar)

                .get("/api/espacios", espacios::listar)
                .get("/api/espacios/{id}", espacios::buscarPorId)
                .patch("/api/espacios/{id}/habilitado", espacios::cambiarHabilitado)

                // /registros/activos tiene prioridad sobre /registros/{id}: el
                // Router prefiere el segmento literal sobre el parámetro.
                .post("/api/registros/entrada", registros::registrarEntrada)
                .get("/api/registros/activos", registros::activos)
                .get("/api/registros", registros::historial)
                .get("/api/registros/{id}", registros::buscarPorId);
    }
}
