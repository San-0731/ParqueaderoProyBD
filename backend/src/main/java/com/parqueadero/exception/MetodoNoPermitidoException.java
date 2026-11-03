package com.parqueadero.exception;

import java.util.List;

/**
 * La ruta existe, pero no acepta el método HTTP usado (HTTP 405).
 * Ejemplo: {@code DELETE /api/vehiculos/5} cuando solo existen GET y PUT.
 *
 * <p>Guarda los métodos permitidos para la cabecera {@code Allow}, que HTTP
 * exige en las respuestas 405.
 */
public class MetodoNoPermitidoException extends AplicacionException {

    private final List<String> metodosPermitidos;

    public MetodoNoPermitidoException(String mensaje, List<String> metodosPermitidos) {
        super(405, "METODO_NO_PERMITIDO", mensaje);
        this.metodosPermitidos = List.copyOf(metodosPermitidos);
    }

    /** Métodos que sí acepta la ruta, por ejemplo {@code [GET, PUT]}. */
    public List<String> getMetodosPermitidos() {
        return metodosPermitidos;
    }
}
