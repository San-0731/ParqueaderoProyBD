package com.parqueadero.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.MetodoNoPermitidoException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.exception.ReglaNegocioException;
import com.parqueadero.exception.RutaNoEncontradaException;
import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Pruebas de {@link Respuesta#deError}: el mapeo excepción → código HTTP y
 * cuerpo JSON. No necesitan servidor ni base de datos.
 */
class RespuestaTest {

    /** Comprueba estado, código de error y que el mensaje llegue sin cambios. */
    private static void verificar(Respuesta respuesta, int estado, String codigo, String mensaje) {
        assertEquals(estado, respuesta.estado());
        assertEquals(new ErrorApi(codigo, mensaje), respuesta.cuerpo());
    }

    @Test
    void deError_datosInvalidosDa400() {
        String mensaje = "El identificador (placa o código) del vehículo es obligatorio.";

        verificar(Respuesta.deError(new DatosInvalidosException(mensaje)),
                400, "DATOS_INVALIDOS", mensaje);
    }

    @Test
    void deError_noEncontradoDa404() {
        String mensaje = "No existe un vehículo con id 999.";

        verificar(Respuesta.deError(new NoEncontradoException(mensaje)),
                404, "NO_ENCONTRADO", mensaje);
    }

    @Test
    void deError_rutaNoEncontradaDa404() {
        String mensaje = "No existe la ruta GET /api/xyz.";

        verificar(Respuesta.deError(new RutaNoEncontradaException(mensaje)),
                404, "RUTA_NO_ENCONTRADA", mensaje);
    }

    @Test
    void deError_metodoNoPermitidoDa405() {
        String mensaje = "El método DELETE no está permitido en /api/vehiculos/5."
                + " Métodos permitidos: GET, PUT.";

        verificar(Respuesta.deError(new MetodoNoPermitidoException(mensaje, List.of("GET", "PUT"))),
                405, "METODO_NO_PERMITIDO", mensaje);
    }

    @Test
    void deError_reglaNegocioDa409() {
        String mensaje = "El vehículo ya tiene un parqueo activo.";

        verificar(Respuesta.deError(new ReglaNegocioException(mensaje)),
                409, "REGLA_NEGOCIO", mensaje);
    }

    @Test
    void deError_errorInesperadoDa500ConMensajeGenerico() {
        RuntimeException inesperada = new RuntimeException(
                "Error inesperado de base de datos (SQLState 08S01, código 0): tabla vehiculo");

        Respuesta respuesta = Respuesta.deError(inesperada);

        verificar(respuesta, 500, "ERROR_INTERNO", Respuesta.MENSAJE_ERROR_INTERNO);
        // El detalle interno nunca debe llegar al cliente.
        String json = Json.aJson(respuesta.cuerpo());
        assertFalse(json.contains("SQLState"), json);
        assertFalse(json.contains("vehiculo"), json);
    }

    @Test
    void deError_errorDeProgramacionTambienDa500() {
        verificar(Respuesta.deError(new NullPointerException()),
                500, "ERROR_INTERNO", Respuesta.MENSAJE_ERROR_INTERNO);
    }

    @Test
    void deError_cuerpoJsonConTildes() {
        Respuesta respuesta = Respuesta.deError(
                new ReglaNegocioException("El espacio ya está ocupado por otro vehículo."));

        assertEquals("{\"error\":\"REGLA_NEGOCIO\","
                        + "\"mensaje\":\"El espacio ya está ocupado por otro vehículo.\"}",
                Json.aJson(respuesta.cuerpo()));
    }

    @Test
    void deError_traductorSqlDuplicadoDa409() {
        // Mismo mensaje que envía MySQL al violar el UNIQUE del espacio activo.
        SQLException duplicado = new SQLException(
                "Duplicate entry '3-1' for key 'registro_parqueo.uq_registro_espacio_activo'",
                "23000", 1062);

        Respuesta respuesta = Respuesta.deError(TraductorErroresSQL.traducir(duplicado));

        verificar(respuesta, 409, "REGLA_NEGOCIO", "El espacio ya está ocupado por otro vehículo.");
    }
}
