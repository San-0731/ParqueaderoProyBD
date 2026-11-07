package com.parqueadero.bd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.parqueadero.model.Rol;
import com.parqueadero.util.Tokens;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * Restricciones de los usuarios de la aplicación y sus sesiones (V007). Todo
 * se deshace con el rollback.
 */
class UsuariosTest extends PruebaBaseDatos {

    private static final String HASH_CUALQUIERA = "pbkdf2_sha256$1000$c2Fs$aGFzaA==";

    private long insertarUsuario(String nombreUsuario, String nombreCompleto, Rol rol)
            throws SQLException {
        return insertar("INSERT INTO usuario (nombre_usuario, nombre_completo, clave_hash, id_rol)"
                        + " VALUES (?, ?, ?, (SELECT id_rol FROM rol WHERE nombre = ?))",
                nombreUsuario, nombreCompleto, HASH_CUALQUIERA, rol.name());
    }

    private void insertarSesion(String tokenHash, long idUsuario, String expira) throws SQLException {
        ejecutar("INSERT INTO sesion (token_hash, id_usuario, expira) VALUES (?, ?, " + expira + ")",
                tokenHash, idUsuario);
    }

    // ------------------------------------------------------------ rol

    /** V007 deja los tres roles, con los mismos nombres del enum Rol del backend. */
    @Test
    void existenLosTresRoles() throws SQLException {
        List<Map<String, Object>> filas = consultarFilas("SELECT nombre FROM rol ORDER BY id_rol");

        assertEquals(List.of("DBA", "ADMINISTRADOR", "OPERADOR"),
                filas.stream().map(fila -> fila.get("nombre")).toList());
        for (Rol rol : Rol.values()) {
            assertTrue(hayFilas("SELECT 1 FROM rol WHERE nombre = ?", rol.name()), rol.name());
        }
    }

    // ------------------------------------------------------------ usuario

    @Test
    void unUsuarioNuevoQuedaActivoYConFechaDeCreacion() throws SQLException {
        long id = insertarUsuario("ana.perez", "Ana Pérez", Rol.OPERADOR);

        Map<String, Object> fila = consultarFila(
                "SELECT activo, creado_en FROM usuario WHERE id_usuario = ?", id);
        assertEquals(Boolean.TRUE, fila.get("activo"));
        assertNotNull(fila.get("creado_en"));
    }

    /** uq_usuario_nombre_usuario: el nombre de usuario no se repite. */
    @Test
    void nombreDeUsuarioRepetidoFalla() throws SQLException {
        insertarUsuario("ana.perez", "Ana Pérez", Rol.OPERADOR);

        assertErrorMySql(ERROR_DUPLICADO, "uq_usuario_nombre_usuario",
                () -> insertarUsuario("ana.perez", "Otra Ana", Rol.ADMINISTRADOR));
    }

    /** chk_usuario_nombre_formato: de 3 a 30, minúsculas sin tildes, números, punto o guion bajo. */
    @ParameterizedTest
    @ValueSource(strings = {"ab", "Ana", "ana perez", "ana-perez", "josé", ""})
    void nombreDeUsuarioConFormatoInvalidoFalla(String nombreUsuario) {
        assertErrorMySql(ERROR_CHECK, "chk_usuario_nombre_formato",
                () -> insertarUsuario(nombreUsuario, "Alguien", Rol.OPERADOR));
    }

    /** chk_usuario_nombre_completo_no_vacio. */
    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void nombreCompletoVacioFalla(String nombreCompleto) {
        assertErrorMySql(ERROR_CHECK, "chk_usuario_nombre_completo_no_vacio",
                () -> insertarUsuario("ana.perez", nombreCompleto, Rol.OPERADOR));
    }

    /** fk_usuario_rol: el rol debe existir. */
    @Test
    void rolInexistenteFalla() {
        assertErrorMySql(ERROR_PADRE_INEXISTENTE, "fk_usuario_rol",
                () -> insertar("INSERT INTO usuario (nombre_usuario, nombre_completo, clave_hash, id_rol)"
                        + " VALUES ('ana.perez', 'Ana', ?, 999999)", HASH_CUALQUIERA));
    }

    // ------------------------------------------------------------ sesion

    @Test
    void unaSesionValidaSeGuarda() throws SQLException {
        long id = insertarUsuario("ana.perez", "Ana Pérez", Rol.OPERADOR);
        String hash = Tokens.hash(Tokens.generar());

        insertarSesion(hash, id, "NOW() + INTERVAL 8 HOUR");

        assertTrue(hayFilas("SELECT 1 FROM sesion WHERE token_hash = ? AND id_usuario = ?", hash, id));
    }

    /** chk_sesion_token_hash_formato: 64 dígitos hexadecimales en minúscula (SHA-256). */
    @ParameterizedTest
    @ValueSource(strings = {"abc", "token-en-claro-que-nunca-se-debe-guardar",
            "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD"})
    void tokenHashConFormatoInvalidoFalla(String tokenHash) throws SQLException {
        long id = insertarUsuario("ana.perez", "Ana Pérez", Rol.OPERADOR);

        assertErrorMySql(ERROR_CHECK, "chk_sesion_token_hash_formato",
                () -> insertarSesion(tokenHash, id, "NOW() + INTERVAL 8 HOUR"));
    }

    /** chk_sesion_expira_posterior: una sesión no puede vencer antes de crearse. */
    @Test
    void sesionQueVenceAntesDeCrearseFalla() throws SQLException {
        long id = insertarUsuario("ana.perez", "Ana Pérez", Rol.OPERADOR);

        assertErrorMySql(ERROR_CHECK, "chk_sesion_expira_posterior",
                () -> insertarSesion(Tokens.hash("x"), id, "NOW() - INTERVAL 1 MINUTE"));
    }

    /** fk_sesion_usuario: la sesión debe ser de un usuario que existe... */
    @Test
    void sesionDeUsuarioInexistenteFalla() {
        assertErrorMySql(ERROR_PADRE_INEXISTENTE, "fk_sesion_usuario",
                () -> insertarSesion(Tokens.hash("x"), 999_999_999L, "NOW() + INTERVAL 8 HOUR"));
    }

    /** ...y un usuario con sesiones no se puede borrar (los usuarios se desactivan). */
    @Test
    void borrarUnUsuarioConSesionesFalla() throws SQLException {
        long id = insertarUsuario("ana.perez", "Ana Pérez", Rol.OPERADOR);
        insertarSesion(Tokens.hash("x"), id, "NOW() + INTERVAL 8 HOUR");

        assertErrorMySql(ERROR_PADRE_EN_USO, "fk_sesion_usuario",
                () -> ejecutar("DELETE FROM usuario WHERE id_usuario = ?", id));
    }
}
