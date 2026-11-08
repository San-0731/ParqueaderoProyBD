package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.AuditoriaDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.model.RegistroAuditoria;
import com.parqueadero.model.Rol;
import com.parqueadero.model.Usuario;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Consulta de la auditoría. Lo que ve cada uno depende de su rol:
 * <ul>
 *   <li>DBA: todos los cambios auditados (de administradores y operadores).</li>
 *   <li>Administrador: solo los cambios de los operadores.</li>
 * </ul>
 * (El operador no llega aquí: la ruta exige ADMINISTRADOR.)
 */
public final class AuditoriaService {

    /** Las tablas que tienen triggers de auditoría (V008). */
    static final Set<String> TABLAS = Set.of("cliente", "vehiculo", "espacio", "registro_parqueo", "pago");

    private final ConexionBD conexionBD;
    private final AuditoriaDAO auditoriaDAO;

    public AuditoriaService(ConexionBD conexionBD, AuditoriaDAO auditoriaDAO) {
        this.conexionBD = conexionBD;
        this.auditoriaDAO = auditoriaDAO;
    }

    /**
     * Los cambios que el usuario puede ver, del más reciente al más antiguo.
     *
     * @param quienConsulta el usuario de la sesión
     * @param desde primer día (incluido), o {@code null}
     * @param hasta último día (incluido), o {@code null}
     * @param tabla una de {@link #TABLAS}, o {@code null} para todas
     * @throws DatosInvalidosException si el rango está al revés o la tabla no existe
     */
    public List<RegistroAuditoria> listar(Usuario quienConsulta, LocalDate desde, LocalDate hasta,
            String tabla) {
        RegistroService.validarRango(desde, hasta);
        String tablaElegida = tabla == null || tabla.isBlank() ? null : tabla.strip();
        if (tablaElegida != null && !TABLAS.contains(tablaElegida)) {
            throw new DatosInvalidosException("La tabla debe ser una de: cliente, vehiculo, espacio,"
                    + " registro_parqueo o pago.");
        }
        boolean soloOperadores = quienConsulta.rol() != Rol.DBA;
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return auditoriaDAO.listar(conexion, soloOperadores, desde, hasta, tablaElegida);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }
}
