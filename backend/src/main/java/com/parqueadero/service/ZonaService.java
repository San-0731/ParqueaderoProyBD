package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.EspacioDAO;
import com.parqueadero.dao.ZonaDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.exception.ReglaNegocioException;
import com.parqueadero.model.EspacioEstado;
import com.parqueadero.model.Zona;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Zonas y creación de espacios (pestaña Sistema, solo el DBA).
 *
 * <ul>
 *   <li>Crear una zona: piso, letra y tipo de vehículo. Si el piso todavía no
 *       tenía zonas, así "nace" el piso (no hay tabla de pisos).</li>
 *   <li>Agregar espacios a una zona: reciben los números siguientes al último
 *       de la zona (si la zona A1 llega al 08, los nuevos son 09, 10...), hasta
 *       el 99.</li>
 * </ul>
 *
 * <p>Las zonas y los espacios no se borran ni se editan: un espacio se retira
 * deshabilitándolo, para no perder el historial de parqueos.
 */
public final class ZonaService {

    /** Números de espacio posibles en una zona: del 01 al 99. */
    static final int MAX_ESPACIOS_POR_ZONA = 99;

    private final ConexionBD conexionBD;
    private final ZonaDAO zonaDAO;
    private final EspacioDAO espacioDAO;

    public ZonaService(ConexionBD conexionBD, ZonaDAO zonaDAO, EspacioDAO espacioDAO) {
        this.conexionBD = conexionBD;
        this.zonaDAO = zonaDAO;
        this.espacioDAO = espacioDAO;
    }

    /** Todas las zonas, por piso y letra, con cuántos espacios tiene cada una. */
    public List<Zona> listar() {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return zonaDAO.listar(conexion);
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Crea una zona sin espacios.
     *
     * @param piso  número del 1 al 99 (se acepta "01" y se guarda "1")
     * @param letra una letra de la A a la Z (se acepta en minúscula)
     * @return la zona creada
     * @throws DatosInvalidosException si algún dato no sirve o el tipo no existe (400)
     * @throws ReglaNegocioException   si ese piso ya tiene esa letra (409)
     */
    public Zona crear(String piso, String letra, Long idTipo) {
        List<String> errores = new ArrayList<>();
        String pisoLimpio = null;
        try {
            pisoLimpio = normalizarPiso(piso);
        } catch (DatosInvalidosException e) {
            errores.add(e.getMessage());
        }
        String letraLimpia = null;
        try {
            letraLimpia = normalizarLetra(letra);
        } catch (DatosInvalidosException e) {
            errores.add(e.getMessage());
        }
        if (idTipo == null) {
            errores.add("Elige el tipo de vehículo de la zona.");
        }
        if (!errores.isEmpty()) {
            throw new DatosInvalidosException(String.join(" ", errores));
        }

        try (Connection conexion = conexionBD.obtenerConexion()) {
            long idZona = zonaDAO.insertar(conexion, pisoLimpio, letraLimpia, idTipo);
            return zonaDAO.buscarPorId(conexion, idZona).orElseThrow(() -> noExisteId(idZona));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Agrega {@code cantidad} espacios habilitados a la zona, con los números
     * siguientes al último que tiene.
     *
     * <p>Pasa en una transacción que primero bloquea la fila de la zona
     * ({@code SELECT ... FOR UPDATE}): si dos personas agregan espacios a la
     * misma zona al mismo tiempo, la segunda espera y luego ve los números que
     * tomó la primera. Si un INSERT falla, no queda ninguno a medias.
     *
     * @return los espacios creados
     * @throws DatosInvalidosException si la cantidad no está entre 1 y 99
     * @throws NoEncontradoException   si la zona no existe
     * @throws ReglaNegocioException   si se pasaría del espacio 99
     */
    public List<EspacioEstado> agregarEspacios(long idZona, Integer cantidad) {
        if (cantidad == null || cantidad < 1 || cantidad > MAX_ESPACIOS_POR_ZONA) {
            throw new DatosInvalidosException(
                    "La cantidad de espacios debe ser un número del 1 al " + MAX_ESPACIOS_POR_ZONA + ".");
        }
        try (Connection conexion = conexionBD.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                if (!zonaDAO.bloquear(conexion, idZona)) {
                    throw noExisteId(idZona);
                }
                Zona zona = zonaDAO.buscarPorId(conexion, idZona).orElseThrow(() -> noExisteId(idZona));
                int ultimo = zona.ultimoNumero() == null ? 0 : Integer.parseInt(zona.ultimoNumero());
                int disponibles = MAX_ESPACIOS_POR_ZONA - ultimo;
                if (cantidad > disponibles) {
                    throw new ReglaNegocioException("La zona " + zona.letra() + zona.piso()
                            + " llega hasta el espacio " + String.format("%02d", ultimo)
                            + ": solo le caben " + disponibles + " más (el último número es el "
                            + MAX_ESPACIOS_POR_ZONA + ").");
                }

                List<EspacioEstado> creados = new ArrayList<>();
                for (int numero = ultimo + 1; numero <= ultimo + cantidad; numero++) {
                    String texto = String.format("%02d", numero);
                    long idEspacio = espacioDAO.insertar(conexion, idZona, texto);
                    creados.add(new EspacioEstado(idEspacio, zona.idTipo(), zona.piso(), zona.letra(),
                            texto, true, false, true));
                }
                conexion.commit();
                return creados;
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
     * El piso como se guarda: el número sin ceros a la izquierda ("01" → "1").
     *
     * @throws DatosInvalidosException si no es un número del 1 al 99
     */
    static String normalizarPiso(String piso) {
        try {
            int numero = Integer.parseInt(piso == null ? "" : piso.strip());
            if (numero >= 1 && numero <= 99) {
                return String.valueOf(numero);
            }
        } catch (NumberFormatException e) {
            // Cae al mensaje de abajo.
        }
        throw new DatosInvalidosException("El piso debe ser un número del 1 al 99.");
    }

    /**
     * La letra como se guarda: una mayúscula de la A a la Z ("a" → "A").
     *
     * @throws DatosInvalidosException si no es una sola letra de la A a la Z
     */
    static String normalizarLetra(String letra) {
        String limpia = letra == null ? "" : letra.strip().toUpperCase(Locale.ROOT);
        if (!limpia.matches("[A-Z]")) {
            throw new DatosInvalidosException("La zona debe ser una sola letra de la A a la Z (sin Ñ).");
        }
        return limpia;
    }

    private static NoEncontradoException noExisteId(long idZona) {
        return new NoEncontradoException("No existe una zona con id " + idZona + ".");
    }
}
