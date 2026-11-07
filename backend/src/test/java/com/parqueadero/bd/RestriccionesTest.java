package com.parqueadero.bd;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.sql.SQLException;

/**
 * Restricciones de las tablas (V001): UNIQUE, CHECK y llaves foráneas. Cada
 * prueba comprueba el código de error de MySQL y el nombre de la restricción
 * que lo produce.
 */
class RestriccionesTest extends PruebaBaseDatos {

    /** Registro cerrado (con cobro) de un carro nuevo, para pruebas de pagos. */
    private long registroCerrado() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        cerrarRegistro(registro, "10000");
        return registro;
    }

    // ------------------------------------------------------------ vehículo

    /** uq_vehiculo_identificador: dos vehículos no pueden tener la misma placa o código. */
    @Test
    void identificadorDuplicadoFalla() throws SQLException {
        VehiculoPrueba existente = crearVehiculo(transaccion, CARRO);

        assertErrorMySql(ERROR_DUPLICADO, "uq_vehiculo_identificador",
                () -> insertarVehiculo(existente.identificador(), CARRO, existente.idCliente()));
    }

    /**
     * chk_vehiculo_identificador_formato: solo letras mayúsculas y números. El
     * trigger quita espacios y guiones, pero no puntos ni guiones bajos, y un
     * identificador vacío tampoco pasa.
     */
    @ParameterizedTest
    @ValueSource(strings = {"ABC.123", "ABC_123", ""})
    void identificadorConFormatoInvalidoFalla(String identificador) throws SQLException {
        long propietario = crearPropietario(transaccion);

        assertErrorMySql(ERROR_CHECK, "chk_vehiculo_identificador_formato",
                () -> insertarVehiculo(identificador, CARRO, propietario));
    }

    /** chk_vehiculo_anio_rango: el año del vehículo va de 1900 a 2100. */
    @ParameterizedTest
    @ValueSource(ints = {1800, 2101})
    void anioFueraDeRangoFalla(int anio) throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);

        assertErrorMySql(ERROR_CHECK, "chk_vehiculo_anio_rango",
                () -> ejecutar("UPDATE vehiculo SET anio = ? WHERE id_vehiculo = ?", anio,
                        carro.idVehiculo()));
    }

    // ------------------------------------------------------------ registro de parqueo

    /** chk_registro_salida_posterior: la salida no puede ser igual a la entrada. */
    @Test
    void salidaIgualALaEntradaFalla() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertErrorMySql(ERROR_CHECK, "chk_registro_salida_posterior",
                () -> ejecutar("UPDATE registro_parqueo SET salida = entrada, minutos_totales = 0,"
                        + " valor_total = 0, estado = 'PAGO' WHERE id_registro = ?", registro));
    }

    /**
     * La salida no puede ser anterior a la entrada. Aquí fallan dos CHECK a la
     * vez (chk_registro_salida_posterior y chk_registro_minutos_coherentes,
     * porque los minutos serían negativos) y MySQL informa el primero que
     * revisa; por eso solo se exige que sea un CHECK del registro.
     */
    @Test
    void salidaAnteriorALaEntradaFalla() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertErrorMySql(ERROR_CHECK, "chk_registro_",
                () -> ejecutar("UPDATE registro_parqueo SET salida = entrada - INTERVAL 1 HOUR,"
                        + " minutos_totales = 0, valor_total = 0, estado = 'PAGO'"
                        + " WHERE id_registro = ?", registro));
    }

    /** chk_registro_valor_total_no_negativo: el cobro puede ser 0, pero nunca negativo. */
    @Test
    void valorTotalNegativoFalla() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertErrorMySql(ERROR_CHECK, "chk_registro_valor_total_no_negativo",
                () -> cerrarRegistro(registro, "-1"));
    }

    /**
     * Solo existen los estados 'ACTIVO' y 'PAGO', en mayúsculas. Un estado
     * distinto viola chk_registro_estado_valido y chk_registro_estado_coherente;
     * MySQL informa uno de los dos.
     */
    @ParameterizedTest
    @ValueSource(strings = {"activo", "FINAL"})
    void estadoQueNoExisteFalla(String estado) throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertErrorMySql(ERROR_CHECK, "chk_registro_estado_",
                () -> ejecutar("UPDATE registro_parqueo SET estado = ? WHERE id_registro = ?",
                        estado, registro));
    }

    /** chk_registro_estado_coherente: no se puede marcar 'PAGO' sin salida ni cobro. */
    @Test
    void pagoSinSalidaNiCobroFalla() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertErrorMySql(ERROR_CHECK, "chk_registro_estado_coherente",
                () -> ejecutar("UPDATE registro_parqueo SET estado = 'PAGO' WHERE id_registro = ?",
                        registro));
    }

    /** chk_registro_minutos_coherentes: los minutos guardados deben ser los que hay entre entrada y salida. */
    @Test
    void minutosQueNoCuadranFallan() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertErrorMySql(ERROR_CHECK, "chk_registro_minutos_coherentes",
                () -> ejecutar("UPDATE registro_parqueo SET salida = NOW(), minutos_totales = 5,"
                        + " valor_total = 1000, estado = 'PAGO' WHERE id_registro = ?", registro));
    }

    // ------------------------------------------------------------ tarifas y pagos

    /** chk_tarifa_valor_hora_positivo: el valor por hora debe ser mayor que cero. */
    @ParameterizedTest
    @ValueSource(strings = {"0", "-1000"})
    void tarifaConValorCeroONegativoFalla(String valorHora) throws SQLException {
        long tipoCarro = idTipo(transaccion, CARRO);

        assertErrorMySql(ERROR_CHECK, "chk_tarifa_valor_hora_positivo",
                () -> ejecutar("INSERT INTO tarifa (id_tipo, valor_hora, vigente_desde)"
                        + " VALUES (?, ?, '2099-01-01')", tipoCarro, new BigDecimal(valorHora)));
    }

    /** chk_pago_monto_positivo: todo pago debe ser por un monto mayor que cero. */
    @ParameterizedTest
    @ValueSource(strings = {"0", "-500"})
    void pagoConMontoCeroONegativoFalla(String monto) throws SQLException {
        long registro = registroCerrado();

        assertErrorMySql(ERROR_CHECK, "chk_pago_monto_positivo",
                () -> insertarPago(registro, "Efectivo", monto, null));
    }

    /** uq_pago_referencia: un código de transacción no se puede registrar dos veces. */
    @Test
    void referenciaDePagoRepetidaFalla() throws SQLException {
        long registro = registroCerrado();
        insertarPago(registro, "Nequi", "5000", "PRB-REF-REPETIDA");

        assertErrorMySql(ERROR_DUPLICADO, "uq_pago_referencia",
                () -> insertarPago(registro, "Nequi", "5000", "PRB-REF-REPETIDA"));
    }

    /** Los pagos en efectivo no llevan referencia (NULL) y un UNIQUE admite muchos NULL. */
    @Test
    void variosPagosEnEfectivoSinReferenciaSiConviven() throws SQLException {
        long registro = registroCerrado();
        insertarPago(registro, "Efectivo", "4000", null);
        insertarPago(registro, "Efectivo", "6000", null);

        assertEquals("2", consultarTexto("SELECT COUNT(*) FROM pago WHERE id_registro = ?"
                + " AND referencia IS NULL", registro));
    }

    // ------------------------------------------------------------ llaves foráneas

    /** fk_vehiculo_cliente: el propietario del vehículo debe existir. */
    @Test
    void vehiculoConPropietarioInexistenteFalla() {
        assertErrorMySql(ERROR_PADRE_INEXISTENTE, "fk_vehiculo_cliente",
                () -> insertarVehiculo(identificadorUnico(CARRO), CARRO, 999_999_999L));
    }

    /**
     * fk_registro_espacio: el espacio debe existir. El trigger de entrada no
     * estorba: con un espacio inexistente no lanza su SIGNAL y responde la llave foránea.
     */
    @Test
    void registroEnEspacioInexistenteFalla() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);

        assertErrorMySql(ERROR_PADRE_INEXISTENTE, "fk_registro_espacio",
                () -> registrarEntrada(carro.idVehiculo(), 999_999_999L));
    }

    /** fk_pago_registro: un pago debe pertenecer a un registro de parqueo existente. */
    @Test
    void pagoDeRegistroInexistenteFalla() {
        assertErrorMySql(ERROR_PADRE_INEXISTENTE, "fk_pago_registro",
                () -> insertarPago(999_999_999L, "Efectivo", "1000", null));
    }

    /** fk_registro_vehiculo (ON DELETE RESTRICT): no se borra un vehículo con historial, para no perderlo. */
    @Test
    void borrarUnVehiculoConHistorialFalla() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));

        assertErrorMySql(ERROR_PADRE_EN_USO, "fk_registro_vehiculo",
                () -> ejecutar("DELETE FROM vehiculo WHERE id_vehiculo = ?", carro.idVehiculo()));
    }
}
