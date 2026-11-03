package com.parqueadero.util;

/**
 * Cuerpo JSON de toda respuesta de error de la API:
 *
 * <pre>{@code
 * { "error": "DATOS_INVALIDOS", "mensaje": "El identificador ... es obligatorio." }
 * }</pre>
 *
 * @param error   código fijo del error (para el frontend)
 * @param mensaje explicación en español (para mostrar al usuario)
 */
public record ErrorApi(String error, String mensaje) {
}
