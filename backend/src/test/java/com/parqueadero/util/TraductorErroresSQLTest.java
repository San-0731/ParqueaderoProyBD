package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertSame;

import com.parqueadero.exception.DatosInvalidosException;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;

/**
 * Pruebas de {@link TraductorErroresSQL} para los errores que nombran una
 * columna. Las {@link SQLException} se arman a mano con el mensaje real de
 * MySQL 8.4, así que no se necesita la base de datos.
 */
class TraductorErroresSQLTest {

    /** Traduce y comprueba que el resultado sea un 400 con el mensaje esperado. */
    private static void verificar400(SQLException error, String mensajeEsperado) {
        RuntimeException traducida = TraductorErroresSQL.traducir(error);

        DatosInvalidosException datosInvalidos =
                assertInstanceOf(DatosInvalidosException.class, traducida);
        assertEquals(400, datosInvalidos.getEstadoHttp());
        assertEquals(mensajeEsperado, datosInvalidos.getMessage());
        assertSame(error, datosInvalidos.getCause());
    }

    @Test
    void traducir_fueraDeRangoDa400ConLaColumna() {
        // Lo que responde MySQL al insertar id_tipo = -1 en un INT UNSIGNED.
        verificar400(new SQLException(
                        "Out of range value for column 'id_tipo' at row 1", "22003", 1264),
                "El valor de 'id_tipo' está fuera del rango permitido.");
    }

    @Test
    void traducir_fueraDeRangoSinColumnaUsaMensajeGenerico() {
        verificar400(new SQLException("Out of range value", "22003", 1264),
                "Un valor numérico está fuera del rango permitido.");
    }

    @Test
    void traducir_demasiadoLargoDa400ConLaColumna() {
        verificar400(new SQLException(
                        "Data too long for column 'color' at row 1", "22001", 1406),
                "El valor de 'color' es demasiado largo.");
    }

    @Test
    void traducir_columnaNulaSigueIgual() {
        verificar400(new SQLException("Column 'id_cliente' cannot be null", "23000", 1048),
                "Falta un dato obligatorio: id_cliente.");
    }
}
