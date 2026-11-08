package com.parqueadero.util;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoAutenticadoException;
import com.parqueadero.model.Usuario;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * Una petición HTTP ya procesada por el {@link Router}: método, ruta,
 * parámetros de ruta ({@code {id}}) y de query ({@code ?identificador=...}),
 * ambos ya decodificados, el cuerpo sin procesar y la sesión.
 *
 * @param metodo          método HTTP en mayúsculas (GET, POST, ...)
 * @param ruta            ruta tal como llegó, sin la query
 * @param parametrosRuta  valores de los {@code {parametros}} del patrón
 * @param parametrosQuery parámetros de la query string
 * @param cuerpo          cuerpo de la petición; puede ser {@code null} o vacío
 * @param token           token de la cabecera {@code Authorization: Bearer ...},
 *                        o {@code null} si no vino
 * @param usuario         usuario de la sesión. El {@link Router} solo lo busca en
 *                        las rutas que exigen un rol; en las públicas es {@code null}
 */
public record Peticion(String metodo, String ruta, Map<String, String> parametrosRuta,
        Map<String, String> parametrosQuery, String cuerpo, String token, Usuario usuario) {

    /** Respuesta cuando la petición no trae token. */
    public static final String MENSAJE_SIN_SESION = "Inicia sesión para continuar.";

    /** Respuesta cuando el token no corresponde a una sesión vigente. */
    public static final String MENSAJE_SESION_INVALIDA =
            "Tu sesión terminó o no es válida. Inicia sesión de nuevo.";

    public Peticion {
        // Copias inmutables: nadie puede cambiar los parámetros después.
        parametrosRuta = Map.copyOf(parametrosRuta);
        parametrosQuery = Map.copyOf(parametrosQuery);
    }

    /**
     * El usuario de la sesión. En las rutas con rol el {@link Router} ya lo
     * comprobó, así que nunca falla ahí.
     *
     * @throws NoAutenticadoException si la petición no tiene una sesión válida
     */
    public Usuario usuarioAutenticado() {
        if (usuario != null) {
            return usuario;
        }
        throw new NoAutenticadoException(token == null ? MENSAJE_SIN_SESION : MENSAJE_SESION_INVALIDA);
    }

    /**
     * Valor de un parámetro de la ruta, por ejemplo {@code "id"} en
     * {@code /api/vehiculos/{id}}.
     *
     * @throws IllegalArgumentException si el patrón no tiene ese parámetro
     *         (es un error de programación, no del usuario)
     */
    public String parametroRuta(String nombre) {
        String valor = parametrosRuta.get(nombre);
        if (valor == null) {
            throw new IllegalArgumentException(
                    "La ruta " + ruta + " no tiene el parámetro {" + nombre + "}.");
        }
        return valor;
    }

    /**
     * Valor de un parámetro de la ruta convertido a número.
     *
     * @throws DatosInvalidosException si no es un número entero (por ejemplo,
     *         {@code /api/vehiculos/abc})
     */
    public long parametroRutaComoLong(String nombre) {
        return aLong(parametroRuta(nombre), "El parámetro '" + nombre + "' de la ruta");
    }

    /** Valor de un parámetro de la query, o {@code null} si no viene. */
    public String parametroQuery(String nombre) {
        return parametrosQuery.get(nombre);
    }

    /**
     * Valor de un parámetro de la query convertido a número.
     *
     * @return el número, o {@code null} si el parámetro no viene o está vacío
     * @throws DatosInvalidosException si viene pero no es un número entero
     */
    public Long parametroQueryComoLong(String nombre) {
        String valor = parametroQuery(nombre);
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return aLong(valor, "El parámetro '" + nombre + "'");
    }

    /**
     * Valor de un parámetro de la query como booleano. Solo acepta
     * {@code true} o {@code false} (sin importar mayúsculas).
     *
     * @return el valor, o {@code null} si el parámetro no viene o está vacío
     * @throws DatosInvalidosException si viene con otro valor (por ejemplo {@code si})
     */
    public Boolean parametroQueryComoBoolean(String nombre) {
        String valor = parametroQuery(nombre);
        if (valor == null || valor.isBlank()) {
            return null;
        }
        String limpio = valor.strip();
        if (limpio.equalsIgnoreCase("true")) {
            return true;
        }
        if (limpio.equalsIgnoreCase("false")) {
            return false;
        }
        throw new DatosInvalidosException("El parámetro '" + nombre
                + "' debe ser true o false; se recibió '" + valor + "'.");
    }

    /**
     * Valor de un parámetro de la query como fecha en formato ISO
     * ({@code 2026-11-03}).
     *
     * @return la fecha, o {@code null} si el parámetro no viene o está vacío
     * @throws DatosInvalidosException si viene con otro formato o con una fecha
     *         que no existe (por ejemplo {@code 31-10-2026} o {@code 2026-02-30})
     */
    public LocalDate parametroQueryComoFecha(String nombre) {
        String valor = parametroQuery(nombre);
        if (valor == null || valor.isBlank()) {
            return null;
        }
        String limpio = valor.strip();
        // LocalDate.parse también aceptaría años como +20000 o +999999999, que
        // MySQL no maneja; se exige exactamente AAAA-MM-DD.
        if (limpio.matches("\\d{4}-\\d{2}-\\d{2}")) {
            try {
                return LocalDate.parse(limpio);
            } catch (DateTimeParseException e) {
                // Formato correcto pero fecha inexistente (2026-02-30): mismo mensaje.
            }
        }
        throw new DatosInvalidosException("El parámetro '" + nombre
                + "' debe ser una fecha con formato 2026-11-03; se recibió '" + valor + "'.");
    }

    /**
     * Convierte el cuerpo JSON en un objeto del tipo indicado (ver {@link Json#desdeJson}).
     *
     * @throws DatosInvalidosException si el cuerpo está vacío o no es un JSON válido
     */
    public <T> T cuerpoComo(Class<T> tipo) {
        return Json.desdeJson(cuerpo, tipo);
    }

    private static long aLong(String valor, String descripcion) {
        try {
            return Long.parseLong(valor.strip());
        } catch (NumberFormatException e) {
            throw new DatosInvalidosException(
                    descripcion + " debe ser un número entero; se recibió '" + valor + "'.");
        }
    }
}
