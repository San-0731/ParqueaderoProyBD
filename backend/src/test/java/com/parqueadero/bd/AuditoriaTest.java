package com.parqueadero.bd;

import static com.parqueadero.util.TipoPorPlaca.CARRO;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.parqueadero.model.Rol;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * Triggers de auditoría (V008), directo en MySQL. Cada prueba fija
 * {@code @id_usuario_app} como lo hace el backend y revisa qué quedó en la
 * tabla {@code auditoria}. Todo se deshace con el rollback.
 */
class AuditoriaTest extends PruebaBaseDatos {

    /** Hace que los cambios siguientes los "haga" ese usuario de la aplicación. */
    private void comoUsuario(Long idUsuario) throws SQLException {
        ejecutar("SET @id_usuario_app = ?", idUsuario);
    }

    private List<Map<String, Object>> auditoriaDe(String tabla, long idFila) throws SQLException {
        return consultarFilas("SELECT a.operacion, a.id_usuario, r.nombre AS rol, a.datos_antes,"
                + " a.datos_despues FROM auditoria a JOIN rol r ON r.id_rol = a.id_rol"
                + " WHERE a.tabla = ? AND a.id_fila = ? ORDER BY a.id_auditoria", tabla, idFila);
    }

    private static JsonObject json(Object valor) {
        return JsonParser.parseString(valor.toString()).getAsJsonObject();
    }

    private long nuevoCliente() throws SQLException {
        return insertar("INSERT INTO cliente (documento, nombres, apellidos) VALUES (?, 'Ana', 'Pérez')",
                documentoUnico());
    }

    // ------------------------------------------------------------ quién se audita

    @Test
    void loQueHaceUnOperadorQuedaConSuRol() throws SQLException {
        UsuarioPrueba operador = crearUsuario(transaccion, Rol.OPERADOR);
        comoUsuario(operador.idUsuario());

        long cliente = nuevoCliente();

        List<Map<String, Object>> filas = auditoriaDe("cliente", cliente);
        assertEquals(1, filas.size());
        assertEquals("INSERT", filas.get(0).get("operacion"));
        assertEquals(operador.idUsuario(), ((Number) filas.get(0).get("id_usuario")).longValue());
        assertEquals("OPERADOR", filas.get(0).get("rol"));
        assertNull(filas.get(0).get("datos_antes"));
        assertEquals("Ana", json(filas.get(0).get("datos_despues")).get("nombres").getAsString());
    }

    @Test
    void unaEdicionGuardaElAntesYElDespues() throws SQLException {
        long cliente = nuevoCliente();
        UsuarioPrueba administrador = crearUsuario(transaccion, Rol.ADMINISTRADOR);
        comoUsuario(administrador.idUsuario());

        ejecutar("UPDATE cliente SET telefono = '3001234567' WHERE id_cliente = ?", cliente);

        List<Map<String, Object>> filas = auditoriaDe("cliente", cliente);
        assertEquals(1, filas.size(), "La creación (sin usuario) no se auditó; la edición sí");
        assertEquals("UPDATE", filas.get(0).get("operacion"));
        assertEquals("ADMINISTRADOR", filas.get(0).get("rol"));
        assertTrue(json(filas.get(0).get("datos_antes")).get("telefono").isJsonNull());
        assertEquals("3001234567",
                json(filas.get(0).get("datos_despues")).get("telefono").getAsString());
    }

    @Test
    void loQueHaceElDbaNoSeAudita() throws SQLException {
        UsuarioPrueba dba = crearUsuario(transaccion, Rol.DBA);
        comoUsuario(dba.idUsuario());

        long cliente = nuevoCliente();

        assertEquals(List.of(), auditoriaDe("cliente", cliente));
    }

    @Test
    void unCambioHechoFueraDeLaAplicacionNoSeAudita() throws SQLException {
        comoUsuario(null);

        long cliente = nuevoCliente();

        assertEquals(List.of(), auditoriaDe("cliente", cliente));
    }

    // ------------------------------------------------------------ qué se guarda

    @Test
    void entradaSalidaYPagoQuedanConDatosLegibles() throws SQLException {
        VehiculoPrueba carro = crearVehiculo(transaccion, CARRO);
        long espacio = crearEspacio(CARRO, true);
        UsuarioPrueba operador = crearUsuario(transaccion, Rol.OPERADOR);
        comoUsuario(operador.idUsuario());

        long registro = registrarEntrada(carro.idVehiculo(), espacio);
        cerrarRegistro(registro, "10000");
        long pago = insertarPago(registro, "Efectivo", "10000", null);

        List<Map<String, Object>> parqueo = auditoriaDe("registro_parqueo", registro);
        assertEquals(List.of("INSERT", "UPDATE"), parqueo.stream().map(f -> f.get("operacion")).toList());
        JsonObject entrada = json(parqueo.get(0).get("datos_despues"));
        assertEquals(carro.identificador(), entrada.get("placa").getAsString());
        assertTrue(entrada.get("espacio").getAsString().matches("C99-\\d{2}"), entrada.toString());
        assertEquals("ACTIVO", entrada.get("estado").getAsString());
        JsonObject salida = json(parqueo.get(1).get("datos_despues"));
        assertEquals("PAGO", salida.get("estado").getAsString());
        assertEquals("ACTIVO", json(parqueo.get(1).get("datos_antes")).get("estado").getAsString());

        JsonObject datosPago = json(auditoriaDe("pago", pago).get(0).get("datos_despues"));
        assertEquals("Efectivo", datosPago.get("metodo").getAsString());
        assertEquals(carro.identificador(), datosPago.get("placa").getAsString());
    }

    @Test
    void deshabilitarUnEspacioGuardaVerdaderoOFalso() throws SQLException {
        long espacio = crearEspacio(CARRO, true);
        UsuarioPrueba administrador = crearUsuario(transaccion, Rol.ADMINISTRADOR);
        comoUsuario(administrador.idUsuario());

        ejecutar("UPDATE espacio SET habilitado = FALSE WHERE id_espacio = ?", espacio);

        Map<String, Object> fila = auditoriaDe("espacio", espacio).get(0);
        assertTrue(json(fila.get("datos_antes")).get("habilitado").getAsBoolean());
        assertEquals(false, json(fila.get("datos_despues")).get("habilitado").getAsBoolean());
    }

    @Test
    void elVehiculoGuardaSuTipoYSuPropietario() throws SQLException {
        long cliente = nuevoCliente();
        UsuarioPrueba operador = crearUsuario(transaccion, Rol.OPERADOR);
        comoUsuario(operador.idUsuario());

        long vehiculo = insertarVehiculo(identificadorUnico(CARRO), CARRO, cliente);

        JsonObject datos = json(auditoriaDe("vehiculo", vehiculo).get(0).get("datos_despues"));
        assertEquals("Carro", datos.get("tipo").getAsString());
        assertEquals(consultarTexto("SELECT documento FROM cliente WHERE id_cliente = ?", cliente),
                datos.get("propietario").getAsString());
    }

    // ------------------------------------------------------------ vistas y reglas

    @Test
    void laVistaDeOperadoresNoMuestraLoDeLosAdministradores() throws SQLException {
        UsuarioPrueba operador = crearUsuario(transaccion, Rol.OPERADOR);
        UsuarioPrueba administrador = crearUsuario(transaccion, Rol.ADMINISTRADOR);
        comoUsuario(operador.idUsuario());
        long deOperador = nuevoCliente();
        comoUsuario(administrador.idUsuario());
        long deAdministrador = nuevoCliente();

        assertTrue(hayFilas("SELECT 1 FROM vw_auditoria_operadores WHERE tabla = 'cliente' AND id_fila = ?",
                deOperador));
        assertTrue(!hayFilas("SELECT 1 FROM vw_auditoria_operadores WHERE tabla = 'cliente' AND id_fila = ?",
                deAdministrador));
        assertTrue(hayFilas("SELECT 1 FROM vw_auditoria WHERE tabla = 'cliente' AND id_fila = ?",
                deAdministrador));
    }

    @Test
    void elRolQuedaComoFotoDelMomento() throws SQLException {
        UsuarioPrueba usuario = crearUsuario(transaccion, Rol.OPERADOR);
        comoUsuario(usuario.idUsuario());
        long cliente = nuevoCliente();

        // Después asciende a administrador: lo que hizo antes sigue siendo de operador.
        ejecutar("UPDATE usuario SET id_rol = (SELECT id_rol FROM rol WHERE nombre = 'ADMINISTRADOR')"
                + " WHERE id_usuario = ?", usuario.idUsuario());

        assertEquals("OPERADOR", auditoriaDe("cliente", cliente).get(0).get("rol"));
    }

    @Test
    void lasReglasDeLaTablaSeCumplen() throws SQLException {
        UsuarioPrueba operador = crearUsuario(transaccion, Rol.OPERADOR);
        String insertar = "INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol,"
                + " datos_antes, datos_despues) VALUES (?, ?, 1, ?,"
                + " (SELECT id_rol FROM rol WHERE nombre = 'OPERADOR'), ?, '{}')";

        assertErrorMySql(ERROR_CHECK, "chk_auditoria_tabla",
                () -> ejecutar(insertar, "usuario", "INSERT", operador.idUsuario(), null));
        // DELETE rompe dos CHECK a la vez (operación y coherencia) y MySQL nombra solo uno.
        assertErrorMySql(ERROR_CHECK, "chk_auditoria_",
                () -> ejecutar(insertar, "cliente", "DELETE", operador.idUsuario(), null));
        assertErrorMySql(ERROR_CHECK, "chk_auditoria_datos_coherentes",
                () -> ejecutar(insertar, "cliente", "UPDATE", operador.idUsuario(), null));
        assertErrorMySql(ERROR_CHECK, "chk_auditoria_datos_coherentes",
                () -> ejecutar(insertar, "cliente", "INSERT", operador.idUsuario(), "{}"));
    }

    // ------------------------------------------------------------ transacciones

    /** Si la operación se deshace, su fila de auditoría también (el trigger va en la misma transacción). */
    @Test
    void unRollbackNoDejaFilasEnLaAuditoria() throws SQLException {
        UsuarioPrueba operador;
        try (Connection conexion = conexion()) {
            operador = crearUsuario(conexion, Rol.OPERADOR);
        }
        try (Connection otra = conexion()) {
            otra.setAutoCommit(false);
            try (PreparedStatement fijar = otra.prepareStatement("SET @id_usuario_app = ?")) {
                fijar.setLong(1, operador.idUsuario());
                fijar.execute();
            }
            try (PreparedStatement insercion = otra.prepareStatement(
                    "INSERT INTO cliente (documento, nombres, apellidos) VALUES (?, 'X', 'Y')")) {
                insercion.setString(1, documentoUnico());
                insercion.executeUpdate();
            }
            assertEquals(1, contarAuditoria(otra, operador.idUsuario()), "Dentro de la transacción sí está");
            otra.rollback();
            assertEquals(0, contarAuditoria(otra, operador.idUsuario()));
        }
    }

    private static int contarAuditoria(Connection conexion, long idUsuario) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "SELECT COUNT(*) FROM auditoria WHERE id_usuario = ?")) {
            consulta.setLong(1, idUsuario);
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                return fila.getInt(1);
            }
        }
    }
}
