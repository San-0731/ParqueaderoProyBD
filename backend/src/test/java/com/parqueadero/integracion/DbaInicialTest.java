package com.parqueadero.integracion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.SesionDAO;
import com.parqueadero.dao.UsuarioDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.Rol;
import com.parqueadero.model.SesionIniciada;
import com.parqueadero.service.AutenticacionService;
import com.parqueadero.service.UsuarioService;
import com.parqueadero.service.UsuarioService.DbaInicial;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Creación del primer DBA al arrancar ({@link UsuarioService#crearDbaInicialSiFalta}).
 *
 * <p>Para probar el caso "no hay ningún DBA", antes de cada prueba se
 * desactivan los DBA que ya existan en la base de pruebas (por ejemplo, el que
 * creó el backend de las pruebas E2E) y al final se reactivan.
 */
class DbaInicialTest extends PruebaIntegracion {

    private static final String USUARIO = "prueba_dba_inicial";
    private static final String CLAVE = "clave-inicial-del-dba";

    private final List<Long> dbaDesactivados = new ArrayList<>();
    private UsuarioService usuarios;

    @BeforeEach
    void dejarLaBaseSinDba() throws SQLException {
        usuarios = new UsuarioService(new ConexionBD(configuracion()), new UsuarioDAO(), new SesionDAO());
        try (Connection conexion = conexion()) {
            try (PreparedStatement consulta = conexion.prepareStatement(
                    "SELECT u.id_usuario FROM usuario u JOIN rol r ON r.id_rol = u.id_rol"
                            + " WHERE r.nombre = 'DBA' AND u.activo = TRUE");
                 ResultSet filas = consulta.executeQuery()) {
                while (filas.next()) {
                    dbaDesactivados.add(filas.getLong(1));
                }
            }
            cambiarActivo(conexion, dbaDesactivados, false);
        }
    }

    @AfterEach
    void restaurarLosDba() throws SQLException {
        try (Connection conexion = conexion()) {
            try (PreparedStatement borrado = conexion.prepareStatement(
                    "DELETE FROM sesion WHERE id_usuario IN"
                            + " (SELECT id_usuario FROM usuario WHERE nombre_usuario = ?)")) {
                borrado.setString(1, USUARIO);
                borrado.executeUpdate();
            }
            try (PreparedStatement borrado = conexion.prepareStatement(
                    "DELETE FROM usuario WHERE nombre_usuario = ?")) {
                borrado.setString(1, USUARIO);
                borrado.executeUpdate();
            }
            cambiarActivo(conexion, dbaDesactivados, true);
        }
    }

    @Test
    void sinDbaYSinDatosAvisaQueFaltan() {
        assertEquals(DbaInicial.FALTAN_DATOS, usuarios.crearDbaInicialSiFalta(null, null));
        assertEquals(DbaInicial.FALTAN_DATOS, usuarios.crearDbaInicialSiFalta(USUARIO, ""));
    }

    @Test
    void sinDbaLoCreaYPuedeIniciarSesion() {
        assertEquals(DbaInicial.CREADO, usuarios.crearDbaInicialSiFalta(USUARIO, CLAVE));

        AutenticacionService autenticacion = new AutenticacionService(
                new ConexionBD(configuracion()), new UsuarioDAO(), new SesionDAO());
        SesionIniciada sesion = autenticacion.iniciarSesion(USUARIO, CLAVE);
        assertEquals(Rol.DBA, sesion.usuario().rol());
        assertEquals(USUARIO, sesion.usuario().nombreUsuario());
    }

    @Test
    void siYaHayUnDbaActivoNoCreaOtro() throws SQLException {
        usuarios.crearDbaInicialSiFalta(USUARIO, CLAVE);

        assertEquals(DbaInicial.YA_EXISTE, usuarios.crearDbaInicialSiFalta("otro_dba", CLAVE));
        try (Connection conexion = conexion();
             PreparedStatement consulta = conexion.prepareStatement(
                     "SELECT 1 FROM usuario WHERE nombre_usuario = 'otro_dba'");
             ResultSet fila = consulta.executeQuery()) {
            assertFalse(fila.next());
        }
    }

    @Test
    void conDatosQueNoCumplenLasReglasNoCrea() {
        assertThrows(DatosInvalidosException.class,
                () -> usuarios.crearDbaInicialSiFalta("DBA Principal", CLAVE));
        assertThrows(DatosInvalidosException.class,
                () -> usuarios.crearDbaInicialSiFalta(USUARIO, "corta"));
    }

    private static void cambiarActivo(Connection conexion, List<Long> ids, boolean activo)
            throws SQLException {
        for (long id : ids) {
            try (PreparedStatement cambio = conexion.prepareStatement(
                    "UPDATE usuario SET activo = ? WHERE id_usuario = ?")) {
                cambio.setBoolean(1, activo);
                cambio.setLong(2, id);
                cambio.executeUpdate();
            }
        }
    }
}
