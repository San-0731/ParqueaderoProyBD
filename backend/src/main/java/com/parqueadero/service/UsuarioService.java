package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.UsuarioDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.Rol;
import com.parqueadero.util.Contrasenas;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.regex.Pattern;

/**
 * Lógica de los usuarios de la aplicación. Por ahora, crear el primer DBA al
 * arrancar; la administración de usuarios (pestaña Sistema) llega en el paso E
 * de la Fase 5.
 */
public final class UsuarioService {

    /** Igual que el CHECK {@code chk_usuario_nombre_formato} de V007. */
    private static final Pattern FORMATO_NOMBRE_USUARIO = Pattern.compile("^[a-z0-9._]{3,30}$");

    /** Nombre con que se crea el primer DBA. */
    static final String NOMBRE_DBA_INICIAL = "Administrador de la base de datos";

    /** Resultado de {@link #crearDbaInicialSiFalta}. */
    public enum DbaInicial {
        /** No había ningún DBA activo y se creó con los datos del .env. */
        CREADO,
        /** Ya había un DBA activo: no se hizo nada. */
        YA_EXISTE,
        /** No hay ningún DBA activo y faltan DBA_USUARIO o DBA_CLAVE_INICIAL. */
        FALTAN_DATOS
    }

    private final ConexionBD conexionBD;
    private final UsuarioDAO usuarioDAO;

    public UsuarioService(ConexionBD conexionBD, UsuarioDAO usuarioDAO) {
        this.conexionBD = conexionBD;
        this.usuarioDAO = usuarioDAO;
    }

    /**
     * Si no hay ningún DBA activo, crea uno con el usuario y la contraseña
     * inicial (variables DBA_USUARIO y DBA_CLAVE_INICIAL del .env). Así el
     * sistema siempre tiene alguien que pueda crear las demás cuentas, sin
     * escribir ninguna contraseña en el código ni en las migraciones.
     *
     * @throws DatosInvalidosException si el usuario o la contraseña no cumplen las reglas
     */
    public DbaInicial crearDbaInicialSiFalta(String nombreUsuario, String clave) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            if (usuarioDAO.existeDbaActivo(conexion)) {
                return DbaInicial.YA_EXISTE;
            }
            if (nombreUsuario == null || nombreUsuario.isBlank() || clave == null || clave.isEmpty()) {
                return DbaInicial.FALTAN_DATOS;
            }
            String nombre = validarNombreUsuario(nombreUsuario);
            validarClave(clave);
            usuarioDAO.insertar(conexion, nombre, NOMBRE_DBA_INICIAL, Contrasenas.hash(clave), Rol.DBA);
            return DbaInicial.CREADO;
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Revisa el nombre de usuario y lo devuelve sin espacios alrededor.
     *
     * @throws DatosInvalidosException si no cumple el formato
     */
    static String validarNombreUsuario(String nombreUsuario) {
        String nombre = nombreUsuario == null ? "" : nombreUsuario.strip();
        if (!FORMATO_NOMBRE_USUARIO.matcher(nombre).matches()) {
            throw new DatosInvalidosException("El nombre de usuario debe tener de 3 a 30 caracteres:"
                    + " minúsculas sin tildes, números, punto o guion bajo (por ejemplo, ana.perez).");
        }
        return nombre;
    }

    /**
     * Revisa el largo de una contraseña nueva.
     *
     * @throws DatosInvalidosException si es muy corta o muy larga
     */
    static void validarClave(String clave) {
        int largo = clave == null ? 0 : clave.length();
        if (largo < Contrasenas.LARGO_MINIMO || largo > Contrasenas.LARGO_MAXIMO) {
            throw new DatosInvalidosException("La contraseña debe tener entre "
                    + Contrasenas.LARGO_MINIMO + " y " + Contrasenas.LARGO_MAXIMO + " caracteres.");
        }
    }
}
