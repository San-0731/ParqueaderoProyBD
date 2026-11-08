package com.parqueadero.util;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.MetodoNoPermitidoException;
import com.parqueadero.exception.NoAutenticadoException;
import com.parqueadero.exception.RutaNoEncontradaException;
import com.parqueadero.exception.SinPermisoException;
import com.parqueadero.model.Rol;
import com.parqueadero.model.Usuario;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Decide qué {@link Manejador} atiende cada petición según el método HTTP y la
 * ruta. Los patrones pueden tener parámetros entre llaves:
 *
 * <pre>{@code
 * Router router = new Router()
 *         .get("/api/vehiculos", listar)
 *         .get("/api/vehiculos/{id}", buscar)
 *         .post("/api/registros/{id}/salida", salida);
 * }</pre>
 *
 * <ul>
 *   <li>Ruta inexistente → {@link RutaNoEncontradaException} (404).</li>
 *   <li>La ruta existe pero con otro método → {@link MetodoNoPermitidoException} (405).</li>
 *   <li>Si varias rutas coinciden, gana la que tiene más segmentos literales:
 *       {@code /api/registros/activos} le gana a {@code /api/registros/{id}}.</li>
 *   <li>La barra final se ignora: {@code /api/vehiculos/} = {@code /api/vehiculos}.</li>
 * </ul>
 *
 * <p><b>Sesión y rol.</b> Una ruta puede declarar el rol mínimo que exige
 * ({@code .get("/api/reportes", Rol.ADMINISTRADOR, manejador)}). En esas rutas,
 * antes de llamar al manejador, el router convierte el token en el usuario con
 * el {@link Autenticador}:
 * <ul>
 *   <li>sin token, o con un token que no es de una sesión vigente → 401
 *       ({@link NoAutenticadoException});</li>
 *   <li>con un rol que no alcanza → 403 ({@link SinPermisoException}).</li>
 * </ul>
 * Las rutas registradas sin rol son públicas: no se busca el usuario.
 *
 * <p>Todas las rutas se registran al arrancar, antes de iniciar el servidor;
 * después el router solo se lee, por eso la lista no necesita sincronización.
 */
public final class Router {

    /**
     * Métodos soportados, en el orden en que se listan en un 405. Es pública
     * (e inmutable) porque las cabeceras CORS anuncian esta misma lista.
     */
    public static final List<String> METODOS_SOPORTADOS =
            List.of("GET", "POST", "PUT", "PATCH", "DELETE");

    private final List<Ruta> rutas = new ArrayList<>();
    private final Autenticador autenticador;

    /** Router sin {@link Autenticador}: ningún token es válido (sirve para las pruebas). */
    public Router() {
        this(Autenticador.NINGUNO);
    }

    public Router(Autenticador autenticador) {
        this.autenticador = Objects.requireNonNull(autenticador, "El autenticador no puede ser null.");
    }

    // ---- Rutas públicas (sin sesión) ----

    public Router get(String patron, Manejador manejador) {
        return agregar("GET", patron, manejador);
    }

    public Router post(String patron, Manejador manejador) {
        return agregar("POST", patron, manejador);
    }

    public Router put(String patron, Manejador manejador) {
        return agregar("PUT", patron, manejador);
    }

    public Router patch(String patron, Manejador manejador) {
        return agregar("PATCH", patron, manejador);
    }

    public Router delete(String patron, Manejador manejador) {
        return agregar("DELETE", patron, manejador);
    }

    // ---- Rutas que exigen una sesión con al menos el rol indicado ----

    public Router get(String patron, Rol rolMinimo, Manejador manejador) {
        return agregar("GET", patron, rolMinimo, manejador);
    }

    public Router post(String patron, Rol rolMinimo, Manejador manejador) {
        return agregar("POST", patron, rolMinimo, manejador);
    }

    public Router put(String patron, Rol rolMinimo, Manejador manejador) {
        return agregar("PUT", patron, rolMinimo, manejador);
    }

    public Router patch(String patron, Rol rolMinimo, Manejador manejador) {
        return agregar("PATCH", patron, rolMinimo, manejador);
    }

    public Router delete(String patron, Rol rolMinimo, Manejador manejador) {
        return agregar("DELETE", patron, rolMinimo, manejador);
    }

    /** Registra una ruta pública (sin sesión). */
    public Router agregar(String metodo, String patron, Manejador manejador) {
        return agregar(metodo, patron, null, manejador);
    }

    /**
     * Registra una ruta. Devuelve el mismo router para poder encadenar llamadas.
     *
     * @param rolMinimo rol que exige la ruta, o {@code null} si es pública
     * @throws IllegalArgumentException si el método no está soportado, el patrón
     *         no empieza con "/" o la misma ruta ya estaba registrada
     */
    public Router agregar(String metodo, String patron, Rol rolMinimo, Manejador manejador) {
        String metodoMayusculas = metodo.toUpperCase(Locale.ROOT);
        if (!METODOS_SOPORTADOS.contains(metodoMayusculas)) {
            throw new IllegalArgumentException("Método HTTP no soportado: " + metodo);
        }
        if (patron == null || !patron.startsWith("/")) {
            throw new IllegalArgumentException("El patrón debe empezar con '/': " + patron);
        }
        Objects.requireNonNull(manejador, "El manejador no puede ser null.");

        Ruta nueva = new Ruta(metodoMayusculas, patron, cortarEnSegmentos(patron), rolMinimo,
                manejador);
        for (Ruta existente : rutas) {
            if (existente.metodo().equals(nueva.metodo()) && existente.forma().equals(nueva.forma())) {
                throw new IllegalArgumentException("Ruta registrada dos veces: "
                        + metodoMayusculas + " " + patron + " (ya existe " + existente.patron() + ").");
            }
        }
        rutas.add(nueva);
        return this;
    }

    /**
     * Las rutas públicas (sin rol), como {@code "GET /api/salud"}. Sirve para
     * comprobar en una prueba que ninguna ruta quedó abierta por olvido.
     */
    public List<String> rutasPublicas() {
        return rutas.stream()
                .filter(ruta -> ruta.rolMinimo() == null)
                .map(ruta -> ruta.metodo() + " " + ruta.patron())
                .toList();
    }

    /**
     * Atiende una petición: busca la ruta, lee la query, arma la
     * {@link Peticion} y llama al manejador.
     *
     * <p>Recibe valores simples (y no {@code HttpExchange}) para poder probarlo
     * sin levantar el servidor.
     *
     * @param metodo método HTTP (GET, POST, ...)
     * @param uri    URI de la petición (ruta y query sin decodificar)
     * @param cuerpo cuerpo de la petición; puede ser {@code null}
     * @param token  token de la cabecera {@code Authorization}, o {@code null}
     * @return la respuesta del manejador
     * @throws RutaNoEncontradaException  si no existe la ruta (404)
     * @throws MetodoNoPermitidoException si la ruta no acepta el método (405)
     * @throws DatosInvalidosException    si la URL está mal codificada (400)
     * @throws NoAutenticadoException     si la ruta exige sesión y no la hay (401)
     * @throws SinPermisoException        si el rol no alcanza (403)
     */
    public Respuesta despachar(String metodo, URI uri, String cuerpo, String token) {
        String rutaCruda = uri.getRawPath() != null ? uri.getRawPath() : "/";
        Coincidencia coincidencia = resolver(metodo, rutaCruda);
        Usuario usuario = comprobarSesion(coincidencia.rolMinimo(), token);
        Map<String, String> parametrosQuery = parsearQuery(uri.getRawQuery());
        Peticion peticion = new Peticion(metodo.toUpperCase(Locale.ROOT), rutaCruda,
                coincidencia.parametrosRuta(), parametrosQuery, cuerpo, token, usuario);
        // Mientras se atiende, el usuario queda como "usuario actual": ConexionBD
        // se lo pasa a MySQL (@id_usuario_app) para la auditoría.
        return UsuarioActual.ejecutarCon(usuario, coincidencia.manejador(), peticion);
    }

    /** Igual que {@link #despachar(String, URI, String, String)}, sin token. */
    public Respuesta despachar(String metodo, URI uri, String cuerpo) {
        return despachar(metodo, uri, cuerpo, null);
    }

    /**
     * En una ruta con rol, busca el usuario del token y comprueba su rol.
     *
     * @return el usuario, o {@code null} si la ruta es pública
     */
    private Usuario comprobarSesion(Rol rolMinimo, String token) {
        if (rolMinimo == null) {
            return null;
        }
        if (token == null) {
            throw new NoAutenticadoException(Peticion.MENSAJE_SIN_SESION);
        }
        Usuario usuario = autenticador.autenticar(token)
                .orElseThrow(() -> new NoAutenticadoException(Peticion.MENSAJE_SESION_INVALIDA));
        if (!usuario.rol().alcanza(rolMinimo)) {
            throw new SinPermisoException(mensajeSinPermiso(rolMinimo));
        }
        return usuario;
    }

    /** "Solo un usuario Administrador o DBA puede hacer esto." */
    static String mensajeSinPermiso(Rol rolMinimo) {
        List<String> roles = new ArrayList<>();
        for (Rol rol : Rol.values()) {
            if (rol.alcanza(rolMinimo)) {
                roles.add(rol.getNombreVisible());
            }
        }
        return "Solo un usuario " + String.join(" o ", roles) + " puede hacer esto.";
    }

    /**
     * Busca la ruta que corresponde a la petición.
     *
     * <p>Primero se buscan las rutas cuyo camino coincide y se quedan las más
     * específicas (más segmentos literales). Entre esas se busca el método:
     * si ninguna lo tiene, es un 405. Así {@code GET /api/registros/entrada}
     * responde 405 (esa ruta solo acepta POST) en vez de tratar "entrada"
     * como si fuera un {@code {id}}.
     *
     * <p>Es package-private para poder probarlo sin servidor.
     */
    Coincidencia resolver(String metodo, String rutaCruda) {
        String metodoMayusculas = metodo.toUpperCase(Locale.ROOT);
        List<String> segmentos = new ArrayList<>();
        for (String segmento : cortarEnSegmentos(rutaCruda)) {
            segmentos.add(decodificarSegmento(segmento));
        }

        // Rutas cuyo camino coincide, quedándose solo con las más específicas.
        List<Ruta> masEspecificas = new ArrayList<>();
        List<Map<String, String>> parametrosDeCadaUna = new ArrayList<>();
        int maxLiterales = -1;
        for (Ruta ruta : rutas) {
            Map<String, String> parametros = ruta.coincidir(segmentos);
            if (parametros == null) {
                continue;
            }
            if (ruta.literales() > maxLiterales) {
                maxLiterales = ruta.literales();
                masEspecificas.clear();
                parametrosDeCadaUna.clear();
            }
            if (ruta.literales() == maxLiterales) {
                masEspecificas.add(ruta);
                parametrosDeCadaUna.add(parametros);
            }
        }

        if (masEspecificas.isEmpty()) {
            throw new RutaNoEncontradaException(
                    "No existe la ruta " + metodoMayusculas + " " + rutaCruda + ".");
        }

        Set<String> metodosDelCamino = new HashSet<>();
        for (int i = 0; i < masEspecificas.size(); i++) {
            Ruta ruta = masEspecificas.get(i);
            if (ruta.metodo().equals(metodoMayusculas)) {
                return new Coincidencia(ruta.manejador(), parametrosDeCadaUna.get(i),
                        ruta.rolMinimo());
            }
            metodosDelCamino.add(ruta.metodo());
        }

        List<String> permitidos = METODOS_SOPORTADOS.stream()
                .filter(metodosDelCamino::contains)
                .toList();
        throw new MetodoNoPermitidoException("El método " + metodoMayusculas
                + " no está permitido en " + rutaCruda + ". Métodos permitidos: "
                + String.join(", ", permitidos) + ".", permitidos);
    }

    /**
     * Convierte la query ({@code identificador=abc%2D123&desde=2026-11-01}) en
     * un mapa con los valores decodificados en UTF-8. En la query el "+"
     * significa espacio. Una clave sin "=" vale ""; los pares vacíos se
     * ignoran; si una clave se repite, gana la primera.
     *
     * <p>Es package-private para poder probarlo sin servidor.
     */
    static Map<String, String> parsearQuery(String queryCruda) {
        Map<String, String> parametros = new LinkedHashMap<>();
        if (queryCruda == null || queryCruda.isEmpty()) {
            return parametros;
        }
        for (String par : queryCruda.split("&")) {
            if (par.isEmpty()) {
                continue;
            }
            int posicionIgual = par.indexOf('=');
            String clave = decodificar(posicionIgual >= 0 ? par.substring(0, posicionIgual) : par, par);
            String valor = posicionIgual >= 0 ? decodificar(par.substring(posicionIgual + 1), par) : "";
            if (!clave.isEmpty()) {
                parametros.putIfAbsent(clave, valor);
            }
        }
        return parametros;
    }

    /**
     * Corta una ruta en segmentos: {@code "/api/vehiculos/15"} →
     * {@code [api, vehiculos, 15]}. Ignora una barra final y conserva los
     * segmentos vacíos del medio ({@code "//"}), que no coinciden con nada.
     */
    private static List<String> cortarEnSegmentos(String ruta) {
        String sinBarraInicial = ruta.startsWith("/") ? ruta.substring(1) : ruta;
        String limpia = sinBarraInicial.endsWith("/")
                ? sinBarraInicial.substring(0, sinBarraInicial.length() - 1)
                : sinBarraInicial;
        if (limpia.isEmpty()) {
            return List.of();
        }
        // El -1 hace que split conserve los segmentos vacíos.
        return List.of(limpia.split("/", -1));
    }

    /**
     * Decodifica un segmento de la ruta. Se hace después de cortar por "/",
     * para que un "%2F" no cree segmentos nuevos. En la ruta el "+" es un
     * carácter normal (URLDecoder lo convertiría en espacio).
     */
    private static String decodificarSegmento(String segmento) {
        return decodificar(segmento.replace("+", "%2B"), segmento);
    }

    private static String decodificar(String texto, String original) {
        try {
            return URLDecoder.decode(texto, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw new DatosInvalidosException(
                    "La URL tiene caracteres mal codificados: '" + original + "'.", e);
        }
    }

    /**
     * Resultado de {@link #resolver}: el manejador, los parámetros de la ruta y
     * el rol que exige ({@code null} si es pública).
     */
    record Coincidencia(Manejador manejador, Map<String, String> parametrosRuta, Rol rolMinimo) {
    }

    /** Una ruta registrada, con su patrón ya cortado en segmentos. */
    private record Ruta(String metodo, String patron, List<String> segmentos, Rol rolMinimo,
            Manejador manejador) {

        private static boolean esParametro(String segmento) {
            return segmento.length() > 2 && segmento.startsWith("{") && segmento.endsWith("}");
        }

        /** Cantidad de segmentos fijos (no parámetros): sirve para la prioridad. */
        int literales() {
            return (int) segmentos.stream().filter(segmento -> !esParametro(segmento)).count();
        }

        /** Patrón con los parámetros sin nombre, para detectar rutas repetidas. */
        String forma() {
            return String.join("/", segmentos.stream()
                    .map(segmento -> esParametro(segmento) ? "{}" : segmento)
                    .toList());
        }

        /**
         * Compara con los segmentos de una petición.
         *
         * @return los parámetros extraídos, o {@code null} si no coincide
         */
        Map<String, String> coincidir(List<String> segmentosPeticion) {
            if (segmentosPeticion.size() != segmentos.size()) {
                return null;
            }
            Map<String, String> parametros = new LinkedHashMap<>();
            for (int i = 0; i < segmentos.size(); i++) {
                String delPatron = segmentos.get(i);
                String deLaPeticion = segmentosPeticion.get(i);
                if (esParametro(delPatron)) {
                    if (deLaPeticion.isEmpty()) {
                        return null;
                    }
                    parametros.put(delPatron.substring(1, delPatron.length() - 1), deLaPeticion);
                } else if (!delPatron.equals(deLaPeticion)) {
                    return null;
                }
            }
            return parametros;
        }
    }
}
