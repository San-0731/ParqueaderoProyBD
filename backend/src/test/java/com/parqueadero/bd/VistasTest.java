package com.parqueadero.bd;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static com.parqueadero.util.TipoPorPlaca.MOTO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * Vistas de {@code V004__vistas.sql}. Cada prueba crea sus propios datos
 * (espacios, vehículos, registros y pagos) y consulta la vista filtrando por
 * ellos, así el resultado no depende de los datos de la semilla.
 */
class VistasTest extends PruebaBaseDatos {

    private boolean estaDisponible(long idEspacio) throws SQLException {
        return hayFilas("SELECT 1 FROM vw_espacios_disponibles WHERE id_espacio = ?", idEspacio);
    }

    /**
     * vw_espacios_disponibles: muestra los espacios habilitados y sin registro
     * activo. Un espacio ocupado desaparece y vuelve cuando el vehículo sale.
     */
    @Test
    void espaciosDisponiblesSoloMuestraLosHabilitadosYLibres() throws SQLException {
        long libre = crearEspacio(CARRO, true);
        long deshabilitado = crearEspacio(CARRO, false);
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);

        assertTrue(estaDisponible(libre), "Un espacio habilitado y libre está disponible");
        assertFalse(estaDisponible(deshabilitado), "Un espacio deshabilitado no está disponible");
        assertEquals(CARRO, consultarTexto(
                "SELECT tipo_vehiculo FROM vw_espacios_disponibles WHERE id_espacio = ?", libre));

        long registro = registrarEntrada(carro.idVehiculo(), libre);
        assertFalse(estaDisponible(libre), "Un espacio ocupado no está disponible");

        cerrarRegistro(registro, "10000");
        assertTrue(estaDisponible(libre), "Al salir el vehículo, el espacio vuelve a estar disponible");
    }

    /**
     * vw_parqueos_activos: muestra el vehículo que está adentro con su tipo,
     * propietario, ubicación y el tiempo que lleva (calculado con NOW()).
     */
    @Test
    void parqueosActivosMuestraElVehiculoAdentroConSuTiempo() throws SQLException {
        VehiculoPrueba moto = crearVehiculo(transaccion, MOTO);
        long espacio = crearEspacio(MOTO, true);
        long registro = registrarEntrada(moto.idVehiculo(), espacio); // entró hace 2 horas
        String documento = consultarTexto("SELECT documento FROM cliente WHERE id_cliente = ?",
                moto.idCliente());

        Map<String, Object> fila = consultarFila(
                "SELECT * FROM vw_parqueos_activos WHERE id_registro = ?", registro);

        assertEquals(moto.identificador(), fila.get("placa"));
        assertEquals(MOTO, fila.get("tipo_vehiculo"));
        assertEquals(documento, fila.get("documento_cliente"));
        assertEquals("Prueba Integración", fila.get("nombre_cliente"));
        assertEquals("P9", fila.get("piso"));
        assertEquals("PRB", fila.get("zona"));
        assertEquals(espacio, ((Number) fila.get("id_espacio")).longValue());
        long minutos = ((Number) fila.get("minutos_transcurridos")).longValue();
        assertTrue(minutos >= 120 && minutos <= 121, "Lleva unos 120 minutos, pero la vista dice " + minutos);

        cerrarRegistro(registro, "4000");
        assertFalse(hayFilas("SELECT 1 FROM vw_parqueos_activos WHERE id_registro = ?", registro),
                "Un registro cerrado ya no aparece entre los activos");
    }

    /**
     * vw_historial_parqueos: un parqueo cerrado aparece una sola vez aunque se
     * haya pagado con dos métodos; los métodos se unen con ' + ' y el efectivo
     * no aporta referencia. Un parqueo activo no aparece.
     */
    @Test
    void historialMuestraUnaFilaPorParqueoConSusMetodosDePago() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long cerrado = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        cerrarRegistro(cerrado, "10000");
        String referenciaNequi = "PRB-NEQ-" + carro.identificador();
        insertarPago(cerrado, "Efectivo", "4000", null);
        insertarPago(cerrado, "Nequi", "6000", referenciaNequi);
        VehiculoPrueba otroCarro = crearVehiculo(transaccion, CARRO);
        long activo = registrarEntrada(otroCarro.idVehiculo(), crearEspacio(CARRO, true));

        Map<String, Object> fila = consultarFila(
                "SELECT * FROM vw_historial_parqueos WHERE id_registro = ?", cerrado);

        assertEquals(carro.identificador(), fila.get("placa"));
        assertEquals(CARRO, fila.get("tipo_vehiculo"));
        assertEquals("Efectivo + Nequi", fila.get("metodos_pago"));
        assertEquals(referenciaNequi, fila.get("referencias"));
        assertMonto("10000", fila.get("valor_total"));
        long minutos = ((Number) fila.get("minutos_totales")).longValue();
        assertTrue(minutos >= 120 && minutos <= 121, "Estuvo unos 120 minutos, pero dice " + minutos);
        assertFalse(hayFilas("SELECT 1 FROM vw_historial_parqueos WHERE id_registro = ?", activo),
                "Un parqueo activo no está en el historial");
    }

    /**
     * vw_ingresos_por_metodo: suma lo recaudado por día y por método de pago,
     * según la fecha del pago. Se usa una fecha sin otros pagos (2001-02-03).
     */
    @Test
    void ingresosPorMetodoAgrupaPorDiaYMetodo() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long registro = registrarEntrada(carro.idVehiculo(), crearEspacio(CARRO, true));
        cerrarRegistro(registro, "6500");
        String fecha = "2001-02-03 10:00:00";
        insertarPago(registro, "Nequi", "1000", "PRB-ING-1-" + carro.identificador(), fecha);
        insertarPago(registro, "Nequi", "2500", "PRB-ING-2-" + carro.identificador(), fecha);
        insertarPago(registro, "Efectivo", "3000", null, fecha);

        List<Map<String, Object>> filas = consultarFilas("SELECT metodo_pago, cantidad_pagos,"
                + " total_recaudado FROM vw_ingresos_por_metodo WHERE fecha = '2001-02-03'"
                + " ORDER BY metodo_pago");

        assertEquals(2, filas.size(), "Una fila por método: " + filas);
        assertEquals("Efectivo", filas.get(0).get("metodo_pago"));
        assertEquals(1L, ((Number) filas.get(0).get("cantidad_pagos")).longValue());
        assertMonto("3000", filas.get(0).get("total_recaudado"));
        assertEquals("Nequi", filas.get(1).get("metodo_pago"));
        assertEquals(2L, ((Number) filas.get(1).get("cantidad_pagos")).longValue());
        assertMonto("3500", filas.get(1).get("total_recaudado"));
    }
}
