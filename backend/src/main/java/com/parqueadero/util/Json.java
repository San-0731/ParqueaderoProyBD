package com.parqueadero.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import com.google.gson.Strictness;
import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;
import com.parqueadero.exception.DatosInvalidosException;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Conversión entre objetos Java y JSON para toda la API, con una única
 * instancia de Gson configurada (Gson es seguro entre hilos).
 *
 * <ul>
 *   <li>Fechas en ISO-8601: {@code LocalDateTime} como {@code "2026-11-03T14:30:00"}
 *       y {@code LocalDate} como {@code "2026-11-03"}. Gson no las soporta por defecto.</li>
 *   <li>Los campos nulos se incluyen ({@code "referencia": null}) para que el
 *       frontend siempre reciba todos los campos.</li>
 *   <li>Cualquier problema al leer un JSON se convierte en
 *       {@link DatosInvalidosException} (HTTP 400), nunca en un error 500.</li>
 * </ul>
 */
public final class Json {

    /**
     * Formato de salida de fecha y hora: siempre con segundos y sin fracciones
     * (DATETIME de MySQL tampoco guarda fracciones). {@code toString()} omitiría
     * los segundos cuando valen cero.
     */
    private static final DateTimeFormatter FORMATO_FECHA_HORA =
            DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss");

    /** Busca la ubicación del error en los mensajes de Gson, por ejemplo "path $.idTipo". */
    private static final Pattern PATRON_RUTA = Pattern.compile("path (\\$\\S*)");

    private static final Gson GSON = new GsonBuilder()
            .registerTypeAdapter(LocalDateTime.class, new AdaptadorFechaHora().nullSafe())
            .registerTypeAdapter(LocalDate.class, new AdaptadorFecha().nullSafe())
            // Gson acepta por defecto {"habilitado": "si"} y lo convierte en false
            // (Boolean.parseBoolean) sin avisar. Este adaptador solo acepta true/false.
            .registerTypeAdapter(Boolean.class, new AdaptadorBooleano().nullSafe())
            .registerTypeAdapter(boolean.class, new AdaptadorBooleano().nullSafe())
            // Incluir los campos nulos en la salida.
            .serializeNulls()
            // Sin esto Gson escribe la comilla simple y el signo = como códigos
            // unicode escapados (u0027, u003d). Ese escape solo sirve si el JSON se
            // incrusta en HTML, que no es el caso de esta API.
            .disableHtmlEscaping()
            // Por defecto Gson es tolerante (acepta {clave: valor} sin comillas);
            // en modo estricto un JSON inválido se rechaza.
            .setStrictness(Strictness.STRICT)
            .create();

    private Json() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /** Convierte un objeto (record, lista, mapa...) a texto JSON. */
    public static String aJson(Object objeto) {
        return GSON.toJson(objeto);
    }

    /**
     * Convierte el cuerpo de una petición en un objeto del tipo indicado. Los
     * campos que no vienen en el JSON quedan en {@code null} y los desconocidos
     * se ignoran; validar lo obligatorio le corresponde al servicio.
     *
     * @throws DatosInvalidosException si el cuerpo está vacío, es {@code null}
     *         o no es un JSON válido para ese tipo
     */
    public static <T> T desdeJson(String json, Class<T> tipo) {
        // Gson devuelve null (sin error) cuando el texto está vacío.
        if (json == null || json.isBlank()) {
            throw new DatosInvalidosException(
                    "El cuerpo de la petición está vacío; se esperaba un JSON.");
        }

        T objeto;
        try {
            objeto = GSON.fromJson(json, tipo);
        } catch (JsonParseException e) {
            // Incluye JsonSyntaxException (sintaxis o tipo de dato incorrecto) y
            // JsonIOException (texto sobrante después del JSON).
            throw new DatosInvalidosException(
                    "El cuerpo de la petición no es un JSON válido." + pistaDeUbicacion(e), e);
        }

        if (objeto == null) {
            throw new DatosInvalidosException("Se esperaba un objeto JSON.");
        }
        return objeto;
    }

    /**
     * Devuelve " Revisa el valor en $.campo." si Gson indicó dónde estaba el
     * error (en la excepción o en alguna de sus causas); si no, una cadena vacía.
     */
    private static String pistaDeUbicacion(Throwable error) {
        for (Throwable actual = error; actual != null; actual = actual.getCause()) {
            if (actual.getMessage() != null) {
                Matcher coincidencia = PATRON_RUTA.matcher(actual.getMessage());
                if (coincidencia.find()) {
                    // Gson a veces informa "$." (al leer un nombre de campo): se quitan
                    // los puntos finales y, si solo queda "$" (la raíz), no hay pista útil.
                    String ruta = coincidencia.group(1).replaceAll("\\.+$", "");
                    return ruta.equals("$") ? "" : " Revisa el valor en " + ruta + ".";
                }
            }
        }
        return "";
    }

    /** {@code LocalDateTime} ↔ {@code "2026-11-03T14:30:00"}. */
    private static final class AdaptadorFechaHora extends TypeAdapter<LocalDateTime> {

        @Override
        public void write(JsonWriter salida, LocalDateTime valor) throws IOException {
            salida.value(FORMATO_FECHA_HORA.format(valor));
        }

        @Override
        public LocalDateTime read(JsonReader entrada) throws IOException {
            String texto = entrada.nextString();
            try {
                // ISO_LOCAL_DATE_TIME también acepta "2026-11-03T14:30" (sin segundos),
                // que es lo que envía un <input type="datetime-local">.
                return LocalDateTime.parse(texto, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (DateTimeParseException e) {
                // Gson deja pasar esta excepción sin envolverla.
                throw new DatosInvalidosException("La fecha y hora '" + texto
                        + "' no es válida. Formato esperado: 2026-11-03T14:30:00.", e);
            }
        }
    }

    /**
     * Booleanos estrictos: solo los literales JSON {@code true} y {@code false}.
     * Un texto ({@code "si"}, {@code "true"}) o un número son un error 400.
     */
    private static final class AdaptadorBooleano extends TypeAdapter<Boolean> {

        @Override
        public void write(JsonWriter salida, Boolean valor) throws IOException {
            salida.value(valor);
        }

        @Override
        public Boolean read(JsonReader entrada) throws IOException {
            if (entrada.peek() == JsonToken.BOOLEAN) {
                return entrada.nextBoolean();
            }
            String ruta = entrada.getPath();
            String valor = switch (entrada.peek()) {
                case STRING, NUMBER -> "'" + entrada.nextString() + "'";
                default -> "recibido";
            };
            throw new DatosInvalidosException("El valor " + valor
                    + " no es válido; se esperaba true o false. Revisa el valor en " + ruta + ".");
        }
    }

    /** {@code LocalDate} ↔ {@code "2026-11-03"}. */
    private static final class AdaptadorFecha extends TypeAdapter<LocalDate> {

        @Override
        public void write(JsonWriter salida, LocalDate valor) throws IOException {
            salida.value(DateTimeFormatter.ISO_LOCAL_DATE.format(valor));
        }

        @Override
        public LocalDate read(JsonReader entrada) throws IOException {
            String texto = entrada.nextString();
            try {
                return LocalDate.parse(texto, DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                throw new DatosInvalidosException("La fecha '" + texto
                        + "' no es válida. Formato esperado: 2026-11-03.", e);
            }
        }
    }
}
