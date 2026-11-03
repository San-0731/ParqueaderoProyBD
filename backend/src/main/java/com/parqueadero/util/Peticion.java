package com.parqueadero.util;

import com.parqueadero.exception.DatosInvalidosException;

import java.util.Map;

/**
 * Una petición HTTP ya procesada por el {@link Router}: método, ruta,
 * parámetros de ruta ({@code {id}}) y de query ({@code ?identificador=...}),
 * ambos ya decodificados, y el cuerpo sin procesar.
 *
 * @param metodo          método HTTP en mayúsculas (GET, POST, ...)
 * @param ruta            ruta tal como llegó, sin la query
 * @param parametrosRuta  valores de los {@code {parametros}} del patrón
 * @param parametrosQuery parámetros de la query string
 * @param cuerpo          cuerpo de la petición; puede ser {@code null} o vacío
 */
public record Peticion(String metodo, String ruta, Map<String, String> parametrosRuta,
        Map<String, String> parametrosQuery, String cuerpo) {

    public Peticion {
        // Copias inmutables: nadie puede cambiar los parámetros después.
        parametrosRuta = Map.copyOf(parametrosRuta);
        parametrosQuery = Map.copyOf(parametrosQuery);
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
