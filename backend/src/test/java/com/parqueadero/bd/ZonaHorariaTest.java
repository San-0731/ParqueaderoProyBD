package com.parqueadero.bd;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.parqueadero.service.CalculadoraTarifa;
import com.parqueadero.util.Fechas;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Zona horaria de la sesión de MySQL. Java guarda las horas en la zona de
 * Bogotá ({@link Fechas}), pero las vistas y los valores por defecto usan
 * {@code NOW()} de MySQL, que depende de la zona de la sesión. Un servidor en
 * la nube (Aiven) trabaja en UTC: si la sesión no se pusiera en -05:00, un
 * carro que lleva 90 minutos adentro aparecería con 390.
 *
 * <p>{@code ConexionBD} fija {@code time_zone = '-05:00'} en cada conexión;
 * estas pruebas lo comprueban y muestran qué pasaría sin eso.
 */
class ZonaHorariaTest extends PruebaBaseDatos {

    private static final long MINUTOS_ADENTRO = 90;

    @Test
    void laConexionDeLaAplicacionUsaLaHoraDeColombia() throws SQLException {
        assertEquals("-05:00", consultarTexto("SELECT @@session.time_zone"));

        LocalDateTime ahoraMysql = (LocalDateTime) consultarFila("SELECT NOW() AS ahora").get("ahora");
        Duration diferencia = Duration.between(ahoraMysql, Fechas.ahora()).abs();
        assertTrue(diferencia.compareTo(Duration.ofSeconds(5)) < 0,
                () -> "NOW() de MySQL (" + ahoraMysql + ") no es la hora de Bogotá: difiere "
                        + diferencia);
    }

    /**
     * La entrada se guarda desde Java, como lo hace la aplicación; la vista
     * calcula los minutos con {@code NOW()}. Los dos relojes deben coincidir.
     */
    @Test
    void losMinutosDeLaVistaCoincidenConLosCalculadosEnJava() throws SQLException {
        LocalDateTime entrada = Fechas.ahora().minusMinutes(MINUTOS_ADENTRO);
        long registro = registrarEntradaDesdeJava(entrada);

        long minutosVista = minutosTranscurridos(registro);
        long minutosJava = CalculadoraTarifa.calcular(entrada, Fechas.ahora(), BigDecimal.ONE).minutos();

        assertTrue(Math.abs(minutosVista - minutosJava) <= 1,
                () -> "La vista dice " + minutosVista + " minutos y Java " + minutosJava);
    }

    /**
     * Caso de control: la misma consulta en una sesión en UTC (como la que
     * abriría un servidor en la nube sin el SET de ConexionBD) suma las 5
     * horas de diferencia. Por eso hace falta fijar la zona en cada conexión.
     */
    @Test
    void sinLaZonaDeColombia_laVistaSumariaCincoHoras() throws SQLException {
        long registro = registrarEntradaDesdeJava(Fechas.ahora().minusMinutes(MINUTOS_ADENTRO));

        ejecutar("SET time_zone = '+00:00'");
        long minutosEnUtc = minutosTranscurridos(registro);
        ejecutar("SET time_zone = '-05:00'");

        long esperados = MINUTOS_ADENTRO + 5 * 60;
        assertTrue(Math.abs(minutosEnUtc - esperados) <= 1,
                () -> "En UTC se esperaban unos " + esperados + " minutos y la vista dice "
                        + minutosEnUtc);
    }

    // ------------------------------------------------------------ auxiliares

    /** Entrada de un carro en un espacio propio de la prueba, con la hora calculada en Java. */
    private long registrarEntradaDesdeJava(LocalDateTime entrada) throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long espacio = crearEspacio(CARRO, true);
        return insertar("INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada)"
                + " VALUES (?, ?, ?)", carro.idVehiculo(), espacio, entrada);
    }

    private long minutosTranscurridos(long registro) throws SQLException {
        return ((Number) consultarFila(
                "SELECT minutos_transcurridos FROM vw_parqueos_activos WHERE id_registro = ?",
                registro).get("minutos_transcurridos")).longValue();
    }
}
