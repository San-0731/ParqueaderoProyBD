package com.parqueadero.bd;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static com.parqueadero.util.TipoPorPlaca.MOTO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * Reglas de la tabla {@code zona} y del espacio normalizado (V006): una zona
 * se identifica por piso y letra, cada zona admite un solo tipo de vehículo y
 * el número del espacio no se repite dentro de su zona.
 *
 * <p>Usan los pisos 97 y 98, que no usan ni la semilla (pisos 1 y 2) ni las
 * zonas de prueba compartidas (piso 99). Todo se deshace con el rollback.
 */
class ZonasTest extends PruebaBaseDatos {

    /** Crea una zona y devuelve su id. */
    private long crearZona(String piso, String letra, String tipo) throws SQLException {
        return insertar("INSERT INTO zona (piso, letra, id_tipo) VALUES (?, ?, ?)",
                piso, letra, idTipo(transaccion, tipo));
    }

    /** Crea un espacio habilitado en la zona y devuelve su id. */
    private long crearEspacioEnZona(long idZona, String numero) throws SQLException {
        return insertar("INSERT INTO espacio (id_zona, numero) VALUES (?, ?)", idZona, numero);
    }

    // ------------------------------------------------------------ zona

    /** La misma letra en pisos distintos son dos zonas distintas (A97 y A98). */
    @Test
    void mismaLetraEnPisosDistintosSePermite() throws SQLException {
        long zonaA97 = crearZona("97", "A", CARRO);
        long zonaA98 = crearZona("98", "A", MOTO);

        assertNotEquals(zonaA97, zonaA98);
    }

    /** uq_zona_piso_letra: en un mismo piso no se repite la letra. */
    @Test
    void mismaLetraEnElMismoPisoFalla() throws SQLException {
        crearZona("98", "A", CARRO);

        assertErrorMySql(ERROR_DUPLICADO, "uq_zona_piso_letra", () -> crearZona("98", "A", MOTO));
    }

    /**
     * chk_zona_piso_formato: el piso es un número del 1 al 99 sin ceros a la
     * izquierda, para que '1' y '01' no queden como pisos distintos.
     */
    @ParameterizedTest
    @ValueSource(strings = {"0", "01", "P9", "-1", ""})
    void pisoConFormatoInvalidoFalla(String piso) {
        assertErrorMySql(ERROR_CHECK, "chk_zona_piso_formato", () -> crearZona(piso, "A", CARRO));
    }

    /** chk_zona_letra_formato: una sola letra mayúscula de la A a la Z. */
    @ParameterizedTest
    @ValueSource(strings = {"a", "1", "Ñ", ""})
    void letraConFormatoInvalidoFalla(String letra) {
        assertErrorMySql(ERROR_CHECK, "chk_zona_letra_formato", () -> crearZona("98", letra, CARRO));
    }

    /** Una zona puede existir sin espacios (antes de V006 eso era imposible). */
    @Test
    void zonaSinEspaciosSePermite() throws SQLException {
        long zona = crearZona("98", "Z", CARRO);

        assertTrue(hayFilas("SELECT 1 FROM zona WHERE id_zona = ?", zona));
        assertEquals("0", consultarTexto("SELECT COUNT(*) FROM espacio WHERE id_zona = ?", zona));
    }

    /** fk_espacio_zona (ON DELETE RESTRICT): no se borra una zona que tiene espacios. */
    @Test
    void borrarUnaZonaConEspaciosFalla() throws SQLException {
        long zona = crearZona("98", "A", CARRO);
        crearEspacioEnZona(zona, "01");

        assertErrorMySql(ERROR_PADRE_EN_USO, "fk_espacio_zona",
                () -> ejecutar("DELETE FROM zona WHERE id_zona = ?", zona));
    }

    // ------------------------------------------------------------ espacio

    /** uq_espacio_zona_numero: el número no se repite dentro de la zona... */
    @Test
    void mismoNumeroEnLaMismaZonaFalla() throws SQLException {
        long zona = crearZona("98", "A", CARRO);
        crearEspacioEnZona(zona, "01");

        assertErrorMySql(ERROR_DUPLICADO, "uq_espacio_zona_numero",
                () -> crearEspacioEnZona(zona, "01"));
    }

    /** ...pero sí en otra zona: A98-01 y B98-01 conviven. */
    @Test
    void mismoNumeroEnOtraZonaSePermite() throws SQLException {
        long zonaA = crearZona("98", "A", CARRO);
        long zonaB = crearZona("98", "B", CARRO);

        assertNotEquals(crearEspacioEnZona(zonaA, "01"), crearEspacioEnZona(zonaB, "01"));
    }

    /** chk_espacio_numero_formato: dos dígitos, del 01 al 99. */
    @ParameterizedTest
    @ValueSource(strings = {"00", "1", "E1", "AB", ""})
    void numeroConFormatoInvalidoFalla(String numero) throws SQLException {
        long zona = crearZona("98", "A", CARRO);

        assertErrorMySql(ERROR_CHECK, "chk_espacio_numero_formato",
                () -> crearEspacioEnZona(zona, numero));
    }

    /** fk_espacio_zona: un espacio no puede apuntar a una zona que no existe. */
    @Test
    void espacioEnZonaInexistenteFalla() {
        assertErrorMySql(ERROR_PADRE_INEXISTENTE, "fk_espacio_zona",
                () -> crearEspacioEnZona(999_999_999L, "01"));
    }

    // ------------------------------------------------------------ datos migrados

    /**
     * La migración pasó la semilla a zonas: los pisos 1 y 2 tienen las zonas
     * A, M, B, C y K, cada una con su tipo y sus espacios.
     */
    @Test
    void laSemillaQuedoRepartidaEnZonas() throws SQLException {
        List<Map<String, Object>> zonas = consultarFilas(
                "SELECT z.piso, z.letra, t.nombre AS tipo, COUNT(e.id_espacio) AS espacios"
                        + " FROM zona z"
                        + " JOIN tipo_vehiculo t ON t.id_tipo = z.id_tipo"
                        + " LEFT JOIN espacio e ON e.id_zona = z.id_zona"
                        + " WHERE z.piso IN ('1', '2')"
                        + " GROUP BY z.id_zona, z.piso, z.letra, t.nombre"
                        + " ORDER BY z.piso, z.letra");

        List<String> resumen = zonas.stream()
                .map(z -> z.get("letra") + "" + z.get("piso") + " " + z.get("tipo") + " "
                        + z.get("espacios"))
                .toList();
        assertEquals(List.of("A1 Carro 8", "M1 Moto 4", "B2 Carro 4", "C2 Camión 2",
                "K2 Bicicleta 2"), resumen);
    }

    /** Las vistas siguen entregando piso, zona y tipo con los mismos nombres de columna. */
    @Test
    void laVistaDeDisponiblesTomaPisoZonaYTipoDeLaZona() throws SQLException {
        long espacio = crearEspacio(MOTO, true);

        Map<String, Object> fila = consultarFila(
                "SELECT piso, zona, numero, tipo_vehiculo FROM vw_espacios_disponibles"
                        + " WHERE id_espacio = ?", espacio);

        assertEquals(PISO_PRUEBAS, fila.get("piso"));
        assertEquals(LETRA_ZONA_PRUEBAS.get(MOTO), fila.get("zona"));
        assertEquals(MOTO, fila.get("tipo_vehiculo"));
    }
}
