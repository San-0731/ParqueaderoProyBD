package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.SesionDAO;
import com.parqueadero.dao.UsuarioDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.exception.ReglaNegocioException;
import com.parqueadero.model.Rol;
import com.parqueadero.model.Usuario;
import com.parqueadero.util.Contrasenas;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Lógica de los usuarios de la aplicación: crear el primer DBA al arrancar y
 * la administración de cuentas que hace el DBA en la pestaña Sistema.
 *
 * <p>Reglas:
 * <ul>
 *   <li>Los usuarios no se borran: se desactivan (la auditoría los referencia).</li>
 *   <li>El nombre de usuario no se cambia después de crearlo (como la placa
 *       de un vehículo): es con lo que la persona inicia sesión.</li>
 *   <li>Siempre debe quedar al menos un DBA activo: si no, nadie podría
 *       volver a administrar las cuentas.</li>
 *   <li>Al desactivar a alguien, cambiarle el rol o la contraseña, se borran
 *       sus sesiones: tiene que volver a iniciar sesión (y su rol nuevo se
 *       aplica de inmediato).</li>
 * </ul>
 */
public final class UsuarioService {

    /** Igual que el CHECK {@code chk_usuario_nombre_formato} de V007. */
    private static final Pattern FORMATO_NOMBRE_USUARIO = Pattern.compile("^[a-z0-9._]{3,30}$");

    /** Largo de {@code usuario.nombre_completo}. */
    static final int MAX_NOMBRE_COMPLETO = 100;

    /** Nombre con que se crea el primer DBA. */
    static final String NOMBRE_DBA_INICIAL = "Administrador de la base de datos";

    /** Respuesta cuando se intenta dejar el sistema sin ningún DBA activo. */
    public static final String MENSAJE_ULTIMO_DBA = "Debe quedar al menos un DBA activo:"
            + " no se puede desactivar ni quitarle el rol DBA al único que hay.";

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
    private final SesionDAO sesionDAO;

    public UsuarioService(ConexionBD conexionBD, UsuarioDAO usuarioDAO, SesionDAO sesionDAO) {
        this.conexionBD = conexionBD;
        this.usuarioDAO = usuarioDAO;
        this.sesionDAO = sesionDAO;
    }

    // ------------------------------------------------------------ primer DBA

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

    // ------------------------------------------------------------ administración (DBA)

    /** Todos los usuarios: activos primero, por rol y por nombre de usuario. */
    public List<Usuario> listar() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return usuarioDAO.listar(conexion);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Crea un usuario activo.
     *
     * @param rol 'OPERADOR', 'ADMINISTRADOR' o 'DBA'
     * @param clave contraseña inicial: se guarda solo su hash
     * @return el usuario creado
     * @throws DatosInvalidosException si algún dato no cumple las reglas (todos los errores juntos)
     * @throws ReglaNegocioException   si el nombre de usuario ya existe (409)
     */
    public Usuario crear(String nombreUsuario, String nombreCompleto, String rol, String clave) {
        List<String> errores = new ArrayList<>();
        String nombre = recoger(errores, () -> validarNombreUsuario(nombreUsuario));
        String completo = recoger(errores, () -> validarNombreCompleto(nombreCompleto));
        Rol rolElegido = recoger(errores, () -> leerRol(rol));
        recoger(errores, () -> {
            validarClave(clave);
            return null;
        });
        lanzarSiHayErrores(errores);

        try (Connection conexion = conexionBD.obtenerConexion()) {
            long id = usuarioDAO.insertar(conexion, nombre, completo, Contrasenas.hash(clave), rolElegido);
            return usuarioDAO.buscarPorId(conexion, id).orElseThrow(() -> noExisteId(id));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Cambia el nombre completo, el rol y si está activo.
     *
     * <p>Todo pasa en una transacción: primero se bloquean las filas de los DBA
     * activos ({@code FOR UPDATE}) y se cuentan; si el cambio dejaría el sistema
     * sin DBA activo, se rechaza. Si el usuario pierde el acceso o cambia de rol,
     * se borran sus sesiones.
     *
     * @return el usuario tal como quedó
     * @throws DatosInvalidosException si algún dato no cumple las reglas
     * @throws NoEncontradoException   si el usuario no existe
     * @throws ReglaNegocioException   si se quedaría sin DBA activo
     */
    public Usuario actualizar(long idUsuario, String nombreCompleto, String rol, Boolean activo) {
        List<String> errores = new ArrayList<>();
        String completo = recoger(errores, () -> validarNombreCompleto(nombreCompleto));
        Rol rolNuevo = recoger(errores, () -> leerRol(rol));
        if (activo == null) {
            errores.add("El campo activo es obligatorio (true o false).");
        }
        lanzarSiHayErrores(errores);

        try (Connection conexion = conexionBD.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                List<Long> dbaActivos = usuarioDAO.idsDbaActivosParaActualizar(conexion);
                Usuario actual = usuarioDAO.buscarPorId(conexion, idUsuario)
                        .orElseThrow(() -> noExisteId(idUsuario));

                boolean dejaDeSerDbaActivo = dbaActivos.contains(idUsuario)
                        && (rolNuevo != Rol.DBA || !activo);
                if (dejaDeSerDbaActivo && dbaActivos.size() == 1) {
                    throw new ReglaNegocioException(MENSAJE_ULTIMO_DBA);
                }

                usuarioDAO.actualizar(conexion, idUsuario, completo, rolNuevo, activo);
                if (!activo || rolNuevo != actual.rol()) {
                    sesionDAO.borrarDeUsuario(conexion, idUsuario);
                }
                conexion.commit();
                return usuarioDAO.buscarPorId(conexion, idUsuario).orElseThrow(() -> noExisteId(idUsuario));
            } catch (SQLException | RuntimeException e) {
                conexion.rollback();
                throw e;
            } finally {
                conexion.setAutoCommit(true);
            }
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Pone una contraseña nueva (la que el DBA le entrega a la persona) y cierra
     * todas sus sesiones.
     *
     * @throws DatosInvalidosException si la contraseña no cumple las reglas
     * @throws NoEncontradoException   si el usuario no existe
     */
    public void cambiarClave(long idUsuario, String clave) {
        validarClave(clave);
        String hash = Contrasenas.hash(clave);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            if (!usuarioDAO.actualizarClave(conexion, idUsuario, hash)) {
                throw noExisteId(idUsuario);
            }
            sesionDAO.borrarDeUsuario(conexion, idUsuario);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    // ------------------------------------------------------------ validaciones

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
     * Revisa el nombre completo y lo devuelve sin espacios alrededor.
     *
     * @throws DatosInvalidosException si está vacío o es muy largo
     */
    static String validarNombreCompleto(String nombreCompleto) {
        String nombre = nombreCompleto == null ? "" : nombreCompleto.strip();
        if (nombre.isEmpty()) {
            throw new DatosInvalidosException("El nombre completo es obligatorio.");
        }
        if (nombre.length() > MAX_NOMBRE_COMPLETO) {
            throw new DatosInvalidosException("El nombre completo no puede tener más de "
                    + MAX_NOMBRE_COMPLETO + " caracteres.");
        }
        return nombre;
    }

    /**
     * Convierte el texto del rol en el {@link Rol}.
     *
     * @throws DatosInvalidosException si no es uno de los tres roles
     */
    static Rol leerRol(String rol) {
        try {
            return Rol.valueOf(rol == null ? "" : rol.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new DatosInvalidosException("El rol debe ser OPERADOR, ADMINISTRADOR o DBA.");
        }
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

    /** Una validación que devuelve un valor (o lanza DatosInvalidosException). */
    @FunctionalInterface
    private interface Validacion<T> {
        T validar();
    }

    /**
     * Ejecuta la validación; si falla, guarda su mensaje en {@code errores} y
     * devuelve {@code null}. Así se juntan todos los errores en un solo mensaje.
     */
    private static <T> T recoger(List<String> errores, Validacion<T> validacion) {
        try {
            return validacion.validar();
        } catch (DatosInvalidosException e) {
            errores.add(e.getMessage());
            return null;
        }
    }

    private static void lanzarSiHayErrores(List<String> errores) {
        if (!errores.isEmpty()) {
            throw new DatosInvalidosException(String.join(" ", errores));
        }
    }

    private static NoEncontradoException noExisteId(long idUsuario) {
        return new NoEncontradoException("No existe un usuario con id " + idUsuario + ".");
    }
}
