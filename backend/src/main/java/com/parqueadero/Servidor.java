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
import com.parqueadero.dao.ReporteDAO;
import com.parqueadero.dao.SesionDAO;
import com.parqueadero.dao.TarifaDAO;
import com.parqueadero.dao.TipoVehiculoDAO;
import com.parqueadero.dao.UsuarioDAO;
import com.parqueadero.dao.VehiculoDAO;
import com.parqueadero.handler.ApiHandler;
import com.parqueadero.handler.AutenticacionHandler;
import com.parqueadero.handler.CatalogoHandler;
import com.parqueadero.handler.ClienteHandler;
import com.parqueadero.handler.EspacioHandler;
import com.parqueadero.handler.RegistroHandler;
import com.parqueadero.handler.ReporteHandler;
import com.parqueadero.handler.SalidaHandler;
import com.parqueadero.handler.SaludHandler;
import com.parqueadero.handler.UsuarioHandler;
import com.parqueadero.handler.VehiculoHandler;
import com.parqueadero.model.Rol;
import com.parqueadero.service.AutenticacionService;
import com.parqueadero.service.CatalogoService;
import com.parqueadero.service.ClienteService;
import com.parqueadero.service.EspacioService;
import com.parqueadero.service.RegistroService;
import com.parqueadero.service.ReporteService;
import com.parqueadero.service.SalidaService;
import com.parqueadero.service.UsuarioService;
import com.parqueadero.service.VehiculoService;
import com.parqueadero.util.Router;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * Servidor HTTP de la API: registra las rutas y escucha en un puerto.
 *
 * <p>Está separado de {@link Main} para que las pruebas de integración puedan
 * levantar la API completa, hacerle peticiones reales y apagarla:
 *
 * <pre>{@code
 * Servidor servidor = new Servidor(configuracion);
 * servidor.iniciar(0);              // 0 = el sistema elige un puerto libre
 * int puerto = servidor.getPuerto(); // el puerto que quedó asignado
 * ...
 * servidor.detener();
 * }</pre>
 */
public final class Servidor {

    private final ConexionBD conexionBD;
    private final String origenCors;
    private HttpServer servidorHttp;

    public Servidor(Configuracion configuracion) {
        this.conexionBD = new ConexionBD(configuracion);
        this.origenCors = configuracion.getOrigenCors();
    }

    /**
     * Crea el servidor HTTP, registra las rutas y empieza a atender peticiones.
     *
     * @param puerto puerto donde escuchar; con {@code 0} el sistema operativo
     *        asigna uno libre (se consulta después con {@link #getPuerto()})
     * @throws IOException si el puerto está ocupado o no se puede abrir
     * @throws IllegalStateException si el servidor ya estaba iniciado
     */
    public synchronized void iniciar(int puerto) throws IOException {
        if (servidorHttp != null) {
            throw new IllegalStateException("El servidor ya está iniciado.");
        }
        // Backlog 0 = valor por defecto del sistema para conexiones en espera.
        HttpServer nuevo = HttpServer.create(new InetSocketAddress(puerto), 0);
        // Un solo contexto: todo lo que empiece por /api lo atiende ApiHandler.
        nuevo.createContext("/api", new ApiHandler(registrarRutas(conexionBD), origenCors));
        // Hilos virtuales (Java 21): un hilo liviano por petición; no hay que
        // dimensionar un pool de hilos.
        nuevo.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        nuevo.start();
        servidorHttp = nuevo;
    }

    /**
     * Puerto en el que quedó escuchando el servidor. Si se inició con el
     * puerto {@code 0}, es el que eligió el sistema operativo.
     *
     * @throws IllegalStateException si el servidor no está iniciado
     */
    public synchronized int getPuerto() {
        if (servidorHttp == null) {
            throw new IllegalStateException("El servidor no está iniciado.");
        }
        return servidorHttp.getAddress().getPort();
    }

    /**
     * Deja de aceptar peticiones y espera hasta 1 s a las que estén en curso.
     * Se puede llamar aunque el servidor ya esté detenido.
     */
    public synchronized void detener() {
        if (servidorHttp != null) {
            servidorHttp.stop(1);
            servidorHttp = null;
        }
    }

    /**
     * Crea los handlers (con sus servicios y DAO) y registra todas las rutas de
     * la API con el rol que exige cada una. Es package-private para que una
     * prueba compruebe que solo las rutas previstas quedaron públicas.
     */
    static Router registrarRutas(ConexionBD conexionBD) {
        AutenticacionService autenticacionService =
                new AutenticacionService(conexionBD, new UsuarioDAO(), new SesionDAO());
        AutenticacionHandler autenticacion = new AutenticacionHandler(autenticacionService);
        SaludHandler salud = new SaludHandler(conexionBD);
        VehiculoHandler vehiculos = new VehiculoHandler(
                new VehiculoService(conexionBD, new VehiculoDAO(), new TipoVehiculoDAO()));
        CatalogoHandler catalogos = new CatalogoHandler(new CatalogoService(conexionBD,
                new TipoVehiculoDAO(), new MetodoPagoDAO(), new TarifaDAO(), new MarcaDAO(),
                new ModeloDAO()));
        ClienteHandler clientes = new ClienteHandler(
                new ClienteService(conexionBD, new ClienteDAO()));
        EspacioHandler espacios = new EspacioHandler(
                new EspacioService(conexionBD, new EspacioDAO()));
        RegistroService registroService = new RegistroService(conexionBD,
                new VehiculoDAO(), new RegistroDAO(), new PagoDAO());
        RegistroHandler registros = new RegistroHandler(registroService);
        SalidaHandler salidas = new SalidaHandler(new SalidaService(conexionBD, new RegistroDAO(),
                new TarifaDAO(), new MetodoPagoDAO(), new PagoDAO(), registroService));
        ReporteHandler reportes = new ReporteHandler(
                new ReporteService(conexionBD, new ReporteDAO()));
        UsuarioHandler usuarios = new UsuarioHandler(
                new UsuarioService(conexionBD, new UsuarioDAO(), new SesionDAO()));

        // Permisos (sección 4 de la Fase 5). Cada ruta declara el rol mínimo que
        // exige; los roles superiores también pasan (DBA ⊇ ADMINISTRADOR ⊇ OPERADOR).
        // Solo /salud y /auth/login son públicas. El Router usa el servicio de
        // autenticación para convertir el token en el usuario.
        Rol operador = Rol.OPERADOR;
        Rol administrador = Rol.ADMINISTRADOR;
        Rol dba = Rol.DBA;
        return new Router(autenticacionService::usuarioDeToken)
                .get("/api/salud", salud::consultar)

                .post("/api/auth/login", autenticacion::iniciarSesion)
                .post("/api/auth/logout", operador, autenticacion::cerrarSesion)
                .get("/api/auth/yo", operador, autenticacion::yo)

                // El operador registra vehículos y propietarios nuevos; solo el
                // administrador los edita.
                .get("/api/vehiculos", operador, vehiculos::listar)
                .get("/api/vehiculos/{id}", operador, vehiculos::buscarPorId)
                .post("/api/vehiculos", operador, vehiculos::crear)
                .put("/api/vehiculos/{id}", administrador, vehiculos::actualizar)

                .get("/api/tipos-vehiculo", operador, catalogos::tiposVehiculo)
                .get("/api/metodos-pago", operador, catalogos::metodosPago)
                .get("/api/tarifas/vigente", operador, catalogos::tarifasVigentes)
                .get("/api/marcas", operador, catalogos::marcas)
                .get("/api/modelos", operador, catalogos::modelos)

                .get("/api/clientes", operador, clientes::listar)
                .get("/api/clientes/{id}", operador, clientes::buscarPorId)
                .post("/api/clientes", operador, clientes::crear)
                .put("/api/clientes/{id}", administrador, clientes::actualizar)

                // El operador ve los espacios; habilitarlos o deshabilitarlos es del administrador.
                .get("/api/espacios", operador, espacios::listar)
                .get("/api/espacios/{id}", operador, espacios::buscarPorId)
                .patch("/api/espacios/{id}/habilitado", administrador, espacios::cambiarHabilitado)

                // /registros/activos tiene prioridad sobre /registros/{id}: el
                // Router prefiere el segmento literal sobre el parámetro.
                .post("/api/registros/entrada", operador, registros::registrarEntrada)
                .get("/api/registros/activos", operador, registros::activos)
                .get("/api/registros", operador, registros::historial)
                .get("/api/registros/{id}", operador, registros::buscarPorId)
                .get("/api/registros/{id}/liquidacion", operador, salidas::liquidar)
                .post("/api/registros/{id}/salida", operador, salidas::registrarSalida)

                // Los ingresos (dinero) son solo del administrador. La ocupación la
                // usa también el tablero del operador (cupos libres por tipo).
                .get("/api/reportes/ingresos", administrador, reportes::ingresos)
                .get("/api/reportes/ocupacion", operador, reportes::ocupacion)

                // Pestaña Sistema: solo el DBA administra las cuentas.
                .get("/api/usuarios", dba, usuarios::listar)
                .post("/api/usuarios", dba, usuarios::crear)
                .put("/api/usuarios/{id}", dba, usuarios::actualizar)
                .put("/api/usuarios/{id}/clave", dba, usuarios::cambiarClave);
    }
}
