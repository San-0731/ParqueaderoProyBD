package com.parqueadero.bd;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static com.parqueadero.util.TipoPorPlaca.MOTO;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.Locale;

/**
 * Triggers de {@code V005__triggers.sql}:
 * <ol>
 *   <li>normalizar el identificador del vehículo (mayúsculas, sin espacios ni guiones);</li>
 *   <li>el tipo del vehículo debe coincidir con el tipo del espacio;</li>
 *   <li>solo se parquea en espacios habilitados.</li>
 * </ol>
 * Los rechazos de los triggers llegan como SQLState 45000 con un mensaje que
 * la aplicación muestra al usuario.
 */
class TriggersTest extends PruebaBaseDatos {

    /** {@code "ABC123"} → {@code "abc-123"}: como lo escribiría alguien a la carrera. */
    private static String enMinusculasConGuion(String placa) {
        return placa.substring(0, 3).toLowerCase(Locale.ROOT) + "-" + placa.substring(3);
    }

    private String identificadorGuardado(long idVehiculo) throws SQLException {
        return consultarTexto("SELECT identificador FROM vehiculo WHERE id_vehiculo = ?", idVehiculo);
    }

    // ------------------------------------------------------------ trigger 1: normalizar

    /** Trigger 1 (INSERT): 'abc-123' se guarda como 'ABC123'. */
    @Test
    void alCrearSeQuitanGuionesYSePasaAMayusculas() throws SQLException {
        String placa = identificadorUnico(CARRO);
        long propietario = crearPropietario(transaccion);

        long vehiculo = insertarVehiculo(enMinusculasConGuion(placa), CARRO, propietario);

        assertEquals(placa, identificadorGuardado(vehiculo));
    }

    /** Trigger 1 (INSERT): 'ABC 123' (con espacios, también alrededor) se guarda como 'ABC123'. */
    @Test
    void alCrearSeQuitanLosEspacios() throws SQLException {
        String placa = identificadorUnico(CARRO);
        long propietario = crearPropietario(transaccion);

        long vehiculo = insertarVehiculo(" " + placa.substring(0, 3) + " " + placa.substring(3) + " ",
                CARRO, propietario);

        assertEquals(placa, identificadorGuardado(vehiculo));
    }

    /** Trigger 1 (UPDATE): al cambiar el identificador también se normaliza. */
    @Test
    void alModificarTambienSeNormaliza() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        String nuevaPlaca = identificadorUnico(CARRO);

        ejecutar("UPDATE vehiculo SET identificador = ? WHERE id_vehiculo = ?",
                enMinusculasConGuion(nuevaPlaca), carro.idVehiculo());

        assertEquals(nuevaPlaca, identificadorGuardado(carro.idVehiculo()));
    }

    /** Trigger 1 + uq_vehiculo_identificador: 'abc-123' normalizado choca con un 'ABC123' existente. */
    @Test
    void unaPlacaEscritaDistintoNoDuplicaUnVehiculoExistente() throws SQLException {
        VehiculoPrueba existente = crearVehiculo(transaccion, CARRO);

        assertErrorMySql(ERROR_DUPLICADO, "uq_vehiculo_identificador",
                () -> insertarVehiculo(enMinusculasConGuion(existente.identificador()), CARRO,
                        existente.idCliente()));
    }

    // ------------------------------------------------------------ triggers 2 y 3 al entrar

    /** Trigger 2 (INSERT): una moto no puede entrar a un espacio de carros. */
    @Test
    void vehiculoDeOtroTipoQueElEspacioEsRechazado() throws SQLException {
        VehiculoPrueba moto = crearVehiculo(transaccion, MOTO);
        long espacioDeCarro = crearEspacio(CARRO, true);

        assertRechazoTrigger(MENSAJE_TIPO_NO_COINCIDE,
                () -> registrarEntrada(moto.idVehiculo(), espacioDeCarro));
    }

    /** Trigger 3 (INSERT): no se puede parquear en un espacio deshabilitado. */
    @Test
    void espacioDeshabilitadoEsRechazado() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long deshabilitado = crearEspacio(CARRO, false);

        assertRechazoTrigger(MENSAJE_ESPACIO_DESHABILITADO,
                () -> registrarEntrada(carro.idVehiculo(), deshabilitado));
    }

    /**
     * Trigger 3 (UPDATE): si el espacio se deshabilita con un vehículo adentro,
     * el registro sí se puede cerrar, porque cerrar no cambia el espacio.
     */
    @Test
    void sePuedeCerrarUnRegistroAunqueSuEspacioSeDeshabilite() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long espacio = crearEspacio(CARRO, true);
        long registro = registrarEntrada(carro.idVehiculo(), espacio);
        ejecutar("UPDATE espacio SET habilitado = FALSE WHERE id_espacio = ?", espacio);

        cerrarRegistro(registro, "10000");

        assertEquals("PAGO", consultarTexto(
                "SELECT estado FROM registro_parqueo WHERE id_registro = ?", registro));
    }

    // ------------------------------------------------------------ triggers 2 y 3 al mover

    /** Triggers 2 y 3 (UPDATE): mover un vehículo a otro espacio del mismo tipo y habilitado funciona. */
    @Test
    void moverAUnEspacioCompatibleYHabilitadoFunciona() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        long destino = crearEspacio(CARRO, true);

        ejecutar("UPDATE registro_parqueo SET id_espacio = ? WHERE id_registro = ?", destino, registro);

        assertEquals(String.valueOf(destino), consultarTexto(
                "SELECT id_espacio FROM registro_parqueo WHERE id_registro = ?", registro));
    }

    /** Trigger 3 (UPDATE): no se puede mover un vehículo a un espacio deshabilitado. */
    @Test
    void moverAUnEspacioDeshabilitadoEsRechazado() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        long deshabilitado = crearEspacio(CARRO, false);

        assertRechazoTrigger(MENSAJE_ESPACIO_DESHABILITADO,
                () -> ejecutar("UPDATE registro_parqueo SET id_espacio = ? WHERE id_registro = ?",
                        deshabilitado, registro));
    }

    /** Trigger 2 (UPDATE): no se puede mover un carro a un espacio de motos. */
    @Test
    void moverAUnEspacioDeOtroTipoEsRechazado() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        long espacioDeMoto = crearEspacio(MOTO, true);

        assertRechazoTrigger(MENSAJE_TIPO_NO_COINCIDE,
                () -> ejecutar("UPDATE registro_parqueo SET id_espacio = ? WHERE id_registro = ?",
                        espacioDeMoto, registro));
    }
}
