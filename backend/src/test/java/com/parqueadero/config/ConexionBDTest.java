package com.parqueadero.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Pruebas de la URL JDBC que arma {@link ConexionBD} (sin base de datos): en
 * local va sin cifrar y en producción ({@code DB_SSL=true}) con SSL.
 */
class ConexionBDTest {

    @Test
    void sinSsl_conexionLocalSinCifrarYConLlavePublica() {
        String url = ConexionBD.construirUrl("127.0.0.1", 3306, "parqueadero", false);

        assertTrue(url.startsWith("jdbc:mysql://127.0.0.1:3306/parqueadero?"), url);
        assertTrue(url.contains("sslMode=DISABLED"), url);
        assertTrue(url.contains("allowPublicKeyRetrieval=true"), url);
    }

    @Test
    void conSsl_conexionCifradaYSinPedirLaLlavePublica() {
        String url = ConexionBD.construirUrl("mysql-123.aivencloud.com", 12345, "defaultdb", true);

        assertTrue(url.startsWith("jdbc:mysql://mysql-123.aivencloud.com:12345/defaultdb?"), url);
        assertTrue(url.contains("sslMode=REQUIRED"), url);
        assertFalse(url.contains("sslMode=DISABLED"), url);
        // Con SSL la contraseña ya viaja cifrada: pedir la llave pública sobra.
        assertFalse(url.contains("allowPublicKeyRetrieval"), url);
    }

    @Test
    void conYSinSsl_usanLaZonaHorariaDeColombiaYUtf8() {
        for (boolean ssl : new boolean[] {false, true}) {
            String url = ConexionBD.construirUrl("127.0.0.1", 3306, "parqueadero", ssl);

            assertTrue(url.contains("serverTimezone=America/Bogota"), url);
            assertTrue(url.contains("characterEncoding=UTF-8"), url);
        }
    }

    /** La zona de la sesión es la de Colombia: UTC−5, sin horario de verano. */
    @Test
    void zonaHorariaDeLaSesion_esMenosCincoHoras() {
        assertEquals("-05:00", ConexionBD.ZONA_HORARIA_SESION);
    }
}
