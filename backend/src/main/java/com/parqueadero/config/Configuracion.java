package com.parqueadero.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Configuración de la aplicación (datos de MySQL, conexión cifrada, puerto del
 * servidor HTTP y origen permitido por CORS).
 *
 * <p>Cada variable se busca primero en las variables de entorno del sistema
 * ({@link System#getenv(String)}). Si no existe o está vacía, se toma del
 * archivo {@code .env} de la raíz del repositorio. Así las credenciales nunca
 * se escriben en el código. En producción (el contenedor de Render) no hay
 * archivo {@code .env}: todo llega por variables de entorno.
 *
 * <p>Uso: {@code Configuracion configuracion = Configuracion.cargar();}
 */
public final class Configuracion {

    /** Variables que deben existir para que la aplicación arranque. */
    private static final List<String> VARIABLES_OBLIGATORIAS = List.of(
            "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD");

    /**
     * Variables opcionales y su valor por defecto. En local sirven los valores
     * por defecto; en el despliegue se definen con variables de entorno.
     * <ul>
     *   <li>{@code PORT}: puerto del servidor HTTP del backend.</li>
     *   <li>{@code CORS_ORIGIN}: dirección del frontend que puede llamar a la
     *       API desde el navegador (Vite usa el puerto 5173).</li>
     *   <li>{@code DB_SSL}: {@code true} para cifrar la conexión con MySQL (base
     *       en la nube, como Aiven); {@code false} en local (MySQL de Docker).</li>
     * </ul>
     */
    private static final Map<String, String> VARIABLES_OPCIONALES = Map.of(
            "PORT", "8080",
            "CORS_ORIGIN", "http://localhost:5173",
            "DB_SSL", "false");

    /**
     * Variables opcionales sin valor por defecto (si faltan, quedan en
     * {@code null}):
     * <ul>
     *   <li>{@code DBA_USUARIO} y {@code DBA_CLAVE_INICIAL}: con ellas el backend
     *       crea el primer DBA al arrancar, si todavía no hay ninguno activo.</li>
     * </ul>
     */
    private static final List<String> VARIABLES_OPCIONALES_SIN_DEFECTO = List.of(
            "DBA_USUARIO", "DBA_CLAVE_INICIAL");

    private final String dbHost;
    private final int dbPuerto;
    private final String dbNombre;
    private final String dbUsuario;
    private final String dbContrasena;
    private final boolean dbSsl;
    private final int puertoServidor;
    private final String origenCors;
    private final String dbaUsuario;
    private final String dbaClaveInicial;

    // Privado: la única forma de crear la configuración es con cargar(),
    // que garantiza que ninguna variable obligatoria falte.
    private Configuracion(Map<String, String> valores) {
        this.dbHost = valores.get("DB_HOST");
        this.dbPuerto = leerPuerto("DB_PORT", valores.get("DB_PORT"));
        this.dbNombre = valores.get("DB_NAME");
        this.dbUsuario = valores.get("DB_USER");
        this.dbContrasena = valores.get("DB_PASSWORD");
        this.dbSsl = leerBooleano("DB_SSL", valores.get("DB_SSL"));
        this.puertoServidor = leerPuerto("PORT", valores.get("PORT"));
        this.origenCors = leerOrigenCors(valores.get("CORS_ORIGIN"));
        this.dbaUsuario = valores.get("DBA_USUARIO");
        this.dbaClaveInicial = valores.get("DBA_CLAVE_INICIAL");
    }

    /**
     * Lee las variables del sistema o del archivo {@code .env}. Las opcionales
     * que no estén definidas toman su valor por defecto.
     *
     * @return la configuración completa
     * @throws IllegalStateException si falta alguna variable obligatoria, si un
     *         valor no es válido o si el archivo {@code .env} no se puede leer
     */
    public static Configuracion cargar() {
        Path carpetaActual = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        Path archivoEnv = buscarArchivoEnv(carpetaActual);
        Map<String, String> valoresArchivo =
                archivoEnv != null ? leerArchivoEnv(archivoEnv) : Map.of();

        Map<String, String> valores = new HashMap<>();
        List<String> faltantes = new ArrayList<>();
        for (String nombre : VARIABLES_OBLIGATORIAS) {
            String valor = buscarVariable(nombre, valoresArchivo);
            if (valor == null) {
                faltantes.add(nombre);
            } else {
                valores.put(nombre, valor);
            }
        }
        VARIABLES_OPCIONALES.forEach((nombre, porDefecto) -> {
            String valor = buscarVariable(nombre, valoresArchivo);
            valores.put(nombre, valor != null ? valor : porDefecto);
        });
        for (String nombre : VARIABLES_OPCIONALES_SIN_DEFECTO) {
            String valor = buscarVariable(nombre, valoresArchivo);
            if (valor != null) {
                valores.put(nombre, valor);
            }
        }

        if (!faltantes.isEmpty()) {
            String origen = archivoEnv != null
                    ? "Archivo .env usado: " + archivoEnv
                    : "No se encontró el archivo .env (se buscó en " + carpetaActual
                            + " y en su carpeta padre).";
            throw new IllegalStateException("Faltan variables obligatorias: "
                    + String.join(", ", faltantes)
                    + ". Defínelas en el sistema o en el archivo .env de la raíz del"
                    + " repositorio (copia .env.example). " + origen);
        }

        return new Configuracion(valores);
    }

    /**
     * Busca una variable: 1.º en las variables del sistema; 2.º en el archivo
     * {@code .env}.
     *
     * @return el valor sin espacios alrededor, o {@code null} si no está o está vacía
     */
    private static String buscarVariable(String nombre, Map<String, String> valoresArchivo) {
        String valor = System.getenv(nombre);
        if (estaVacio(valor)) {
            valor = valoresArchivo.get(nombre);
        }
        return estaVacio(valor) ? null : valor.strip();
    }

    /**
     * Busca el {@code .env} en la carpeta actual y, si no está, en la carpeta
     * padre. Así funciona al ejecutar desde la raíz del repositorio y también
     * desde {@code backend/}.
     *
     * @return la ruta del archivo, o {@code null} si no existe
     */
    private static Path buscarArchivoEnv(Path carpetaActual) {
        Path enCarpetaActual = carpetaActual.resolve(".env");
        if (Files.isRegularFile(enCarpetaActual)) {
            return enCarpetaActual;
        }

        Path carpetaPadre = carpetaActual.getParent();
        if (carpetaPadre != null) {
            Path enCarpetaPadre = carpetaPadre.resolve(".env");
            if (Files.isRegularFile(enCarpetaPadre)) {
                return enCarpetaPadre;
            }
        }
        return null;
    }

    private static Map<String, String> leerArchivoEnv(Path archivo) {
        try {
            return parsearEnv(Files.readAllLines(archivo, StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new IllegalStateException(
                    "No se pudo leer el archivo " + archivo + ": " + e.getMessage(), e);
        }
    }

    /**
     * Convierte las líneas de un {@code .env} en un mapa nombre → valor.
     *
     * <ul>
     *   <li>Ignora las líneas vacías y las que empiezan con {@code #}.</li>
     *   <li>Corta en el primer {@code =}: el valor puede contener {@code =}.</li>
     *   <li>Quita las comillas que envuelvan el valor ({@code "..."} o {@code '...'}).</li>
     *   <li>Un {@code #} en medio del valor es parte del valor (una contraseña
     *       puede tenerlo), no un comentario.</li>
     * </ul>
     *
     * <p>Es package-private (sin {@code public}) para poder probarlo desde las
     * pruebas del mismo paquete.
     *
     * @throws IllegalStateException si una línea no tiene el formato NOMBRE=valor
     */
    static Map<String, String> parsearEnv(List<String> lineas) {
        Map<String, String> valores = new HashMap<>();
        for (int i = 0; i < lineas.size(); i++) {
            String linea = lineas.get(i);
            // Algunos editores de Windows agregan una marca invisible (BOM) al inicio.
            if (i == 0 && linea.startsWith("﻿")) {
                linea = linea.substring(1);
            }
            linea = linea.strip();

            if (linea.isEmpty() || linea.startsWith("#")) {
                continue;
            }

            int posicionIgual = linea.indexOf('=');
            if (posicionIgual <= 0) {
                // Solo se informa el número de línea: el contenido podría ser una contraseña.
                throw new IllegalStateException("La línea " + (i + 1)
                        + " del archivo .env no tiene el formato NOMBRE=valor.");
            }

            String nombre = linea.substring(0, posicionIgual).strip();
            String valor = quitarComillas(linea.substring(posicionIgual + 1).strip());
            valores.put(nombre, valor);
        }
        return valores;
    }

    private static String quitarComillas(String valor) {
        if (valor.length() >= 2) {
            char primero = valor.charAt(0);
            char ultimo = valor.charAt(valor.length() - 1);
            if ((primero == '"' || primero == '\'') && primero == ultimo) {
                return valor.substring(1, valor.length() - 1);
            }
        }
        return valor;
    }

    private static int leerPuerto(String nombre, String valor) {
        try {
            int puerto = Integer.parseInt(valor);
            if (puerto >= 1 && puerto <= 65535) {
                return puerto;
            }
        } catch (NumberFormatException e) {
            // No es un número: se informa abajo con el mismo mensaje.
        }
        throw new IllegalStateException("La variable " + nombre
                + " debe ser un número entre 1 y 65535, pero vale '" + valor + "'.");
    }

    /**
     * Lee una variable de tipo sí/no. Solo acepta {@code true} o {@code false}
     * (sin importar mayúsculas): un valor como {@code si} o {@code 1} es un
     * error, para no apagar el cifrado por una equivocación al escribirlo.
     *
     * <p>Es package-private para poder probarlo sin variables de entorno.
     *
     * @throws IllegalStateException si el valor no es true ni false
     */
    static boolean leerBooleano(String nombre, String valor) {
        if ("true".equalsIgnoreCase(valor)) {
            return true;
        }
        if ("false".equalsIgnoreCase(valor)) {
            return false;
        }
        throw new IllegalStateException("La variable " + nombre
                + " debe valer true o false, pero vale '" + valor + "'.");
    }

    /**
     * Valida el origen CORS. Debe ser una dirección como
     * {@code http://localhost:5173} o {@code *} (cualquier origen). Se quita la
     * barra final porque el navegador envía el origen sin ella, y con la barra
     * no coincidiría.
     */
    private static String leerOrigenCors(String valor) {
        if (valor.equals("*")) {
            return valor;
        }
        String sinBarraFinal = valor.replaceAll("/+$", "");
        boolean esDireccion = sinBarraFinal.matches("https?://\\S+");
        if (!esDireccion) {
            throw new IllegalStateException("La variable CORS_ORIGIN debe ser la dirección del"
                    + " frontend, por ejemplo http://localhost:5173 (o * para permitir"
                    + " cualquier origen), pero vale '" + valor + "'.");
        }
        return sinBarraFinal;
    }

    private static boolean estaVacio(String valor) {
        return valor == null || valor.isBlank();
    }

    // No se define toString() a propósito: así la contraseña nunca termina
    // impresa en la consola o en un log por accidente.

    public String getDbHost() {
        return dbHost;
    }

    public int getDbPuerto() {
        return dbPuerto;
    }

    public String getDbNombre() {
        return dbNombre;
    }

    public String getDbUsuario() {
        return dbUsuario;
    }

    public String getDbContrasena() {
        return dbContrasena;
    }

    /**
     * {@code true} si la conexión con MySQL debe ir cifrada (DB_SSL=true, en
     * producción); {@code false} en local.
     */
    public boolean isDbSsl() {
        return dbSsl;
    }

    public int getPuertoServidor() {
        return puertoServidor;
    }

    /** Origen permitido por CORS, por ejemplo {@code http://localhost:5173}. */
    public String getOrigenCors() {
        return origenCors;
    }

    /** Usuario del primer DBA (DBA_USUARIO), o {@code null} si no está definido. */
    public String getDbaUsuario() {
        return dbaUsuario;
    }

    /** Contraseña inicial del primer DBA (DBA_CLAVE_INICIAL), o {@code null} si no está definida. */
    public String getDbaClaveInicial() {
        return dbaClaveInicial;
    }
}
