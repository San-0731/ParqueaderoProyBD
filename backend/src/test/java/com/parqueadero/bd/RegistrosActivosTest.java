package com.parqueadero.bd;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.Map;

/**
 * Regla de los registros activos (V001): un espacio no puede tener dos
 * vehículos a la vez y un vehículo no puede estar adentro dos veces. La
 * garantizan los índices UNIQUE funcionales {@code uq_registro_espacio_activo}
 * y {@code uq_registro_vehiculo_activo}, que solo comparan los registros en
 * estado 'ACTIVO'; los pagados valen NULL en el índice y nunca chocan.
 */
class RegistrosActivosTest extends PruebaBaseDatos {

    /** Una entrada nueva queda en 'ACTIVO' por defecto, sin salida ni cobro. */
    @Test
    void entradaNuevaQuedaActivaSinSalidaNiCobro() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        Map<String, Object> fila = consultarFila("SELECT estado, salida, minutos_totales, valor_total"
                + " FROM registro_parqueo WHERE id_registro = ?", registro);
        assertEquals("ACTIVO", fila.get("estado"));
        assertNull(fila.get("salida"));
        assertNull(fila.get("minutos_totales"));
        assertNull(fila.get("valor_total"));
    }

    /** uq_registro_espacio_activo: un espacio ocupado no recibe otro vehículo. */
    @Test
    void segundoRegistroActivoEnElMismoEspacioFalla() throws SQLException {
        VehiculoPrueba primero = crearVehiculo(transaccion, CARRO);
        VehiculoPrueba segundo = crearVehiculo(transaccion, CARRO);
        long espacio = crearEspacio(CARRO, true);
        registrarEntrada(primero.idVehiculo(), espacio);

        assertErrorMySql(ERROR_DUPLICADO, "uq_registro_espacio_activo",
                () -> registrarEntrada(segundo.idVehiculo(), espacio));
    }

    /** uq_registro_vehiculo_activo: un vehículo que ya está adentro no puede entrar otra vez. */
    @Test
    void elMismoVehiculoNoPuedeEstarActivoDosVeces() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        long otroEspacio = crearEspacio(CARRO, true);

        assertErrorMySql(ERROR_DUPLICADO, "uq_registro_vehiculo_activo",
                () -> registrarEntrada(carro.idVehiculo(), otroEspacio));
    }

    /** Al cerrar (cobrar) un registro, el espacio queda libre y recibe a otro vehículo. */
    @Test
    void alCerrarElRegistroElEspacioPuedeVolverAUsarse() throws SQLException {
        VehiculoPrueba primero = crearVehiculo(transaccion, CARRO);
        VehiculoPrueba segundo = crearVehiculo(transaccion, CARRO);
        long espacio = crearEspacio(CARRO, true);
        long registroPrimero = registrarEntrada(primero.idVehiculo(), espacio);

        cerrarRegistro(registroPrimero, "10000");
        long registroSegundo = registrarEntrada(segundo.idVehiculo(), espacio);

        assertEquals("PAGO", consultarTexto(
                "SELECT estado FROM registro_parqueo WHERE id_registro = ?", registroPrimero));
        assertEquals("ACTIVO", consultarTexto(
                "SELECT estado FROM registro_parqueo WHERE id_registro = ?", registroSegundo));
    }

    /**
     * Al cerrar un registro, el vehículo puede volver a entrar: su historial
     * pagado y su nuevo registro activo conviven.
     */
    @Test
    void alCerrarElRegistroElVehiculoPuedeVolverAEntrar() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long primerRegistro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        cerrarRegistro(primerRegistro, "10000");

        registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertEquals("ACTIVO=1, PAGO=1", consultarTexto(
                "SELECT CONCAT('ACTIVO=', SUM(estado = 'ACTIVO'), ', PAGO=', SUM(estado = 'PAGO'))"
                        + " FROM registro_parqueo WHERE id_vehiculo = ?", carro.idVehiculo()));
    }
}
