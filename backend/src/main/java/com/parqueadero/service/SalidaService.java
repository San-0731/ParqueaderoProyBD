package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.MetodoPagoDAO;
import com.parqueadero.dao.PagoDAO;
import com.parqueadero.dao.RegistroDAO;
import com.parqueadero.dao.TarifaDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.exception.ReglaNegocioException;
import com.parqueadero.model.EstadoRegistro;
import com.parqueadero.model.Liquidacion;
import com.parqueadero.model.MetodoPago;
import com.parqueadero.model.Pago;
import com.parqueadero.model.RegistroDetalle;
import com.parqueadero.model.RegistroParqueo;
import com.parqueadero.model.Tarifa;
import com.parqueadero.util.Fechas;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Salida de un vehículo: liquidación (vista previa del cobro) y registro de la
 * salida con su pago.
 *
 * <p>Registrar la salida hace dos escrituras: cerrar el registro ({@code UPDATE})
 * y guardar el pago ({@code INSERT}). Van en <b>una sola transacción</b>: o se
 * guardan las dos o ninguna. Si el pago falla, el registro sigue ACTIVO.
 *
 * <p>Regla de cobro: ver {@link CalculadoraTarifa} (hora o fracción; con 0
 * minutos no se cobra y no se crea pago).
 */
public final class SalidaService {

    /** Longitud máxima de {@code pago.referencia} (V001__crear_tablas.sql). */
    static final int MAX_REFERENCIA = 60;

    private static final DateTimeFormatter FORMATO_FECHA_HORA =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ConexionBD conexionBD;
    private final RegistroDAO registroDAO;
    private final TarifaDAO tarifaDAO;
    private final MetodoPagoDAO metodoPagoDAO;
    private final PagoDAO pagoDAO;
    private final RegistroService registroService;

    public SalidaService(ConexionBD conexionBD, RegistroDAO registroDAO, TarifaDAO tarifaDAO,
            MetodoPagoDAO metodoPagoDAO, PagoDAO pagoDAO, RegistroService registroService) {
        this.conexionBD = conexionBD;
        this.registroDAO = registroDAO;
        this.tarifaDAO = tarifaDAO;
        this.metodoPagoDAO = metodoPagoDAO;
        this.pagoDAO = pagoDAO;
        this.registroService = registroService;
    }

    /**
     * Calcula lo que costaría el parqueo si el vehículo saliera ahora. No guarda nada.
     *
     * @throws NoEncontradoException si el registro no existe
     * @throws ReglaNegocioException si el registro ya está cerrado o no hay tarifa
     */
    public Liquidacion liquidar(long idRegistro) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            RegistroParqueo registro = registroDAO.buscarPorId(conexion, idRegistro)
                    .orElseThrow(() -> noExiste(idRegistro));
            exigirActivo(registro);
            return calcularLiquidacion(conexion, registro, Fechas.ahora());
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Registra la salida: cierra el registro y guarda el pago por el valor
     * total, en una transacción.
     *
     * @param idMetodoPago método de pago; obligatorio si hay algo que cobrar
     * @param referencia   código de la transacción; obligatorio para PSE, Nequi y
     *                     Daviplata; en efectivo se ignora
     * @return el registro cerrado, con su pago
     * @throws NoEncontradoException   si el registro no existe
     * @throws ReglaNegocioException   si ya estaba cerrado, no hay tarifa o la
     *         referencia ya se usó en otro pago
     * @throws DatosInvalidosException si falta el método, no existe o falta la referencia
     */
    public RegistroDetalle registrarSalida(long idRegistro, Long idMetodoPago, String referencia) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            // 1. Inicia la transacción: desde aquí, nada queda guardado hasta commit().
            conexion.setAutoCommit(false);
            try {
                // 2. Lee el registro y lo bloquea (FOR UPDATE). Si llega otra salida
                //    del mismo registro al mismo tiempo, espera aquí hasta el commit
                //    y después lo ve cerrado.
                RegistroParqueo registro = registroDAO.buscarPorIdParaActualizar(conexion, idRegistro)
                        .orElseThrow(() -> noExiste(idRegistro));
                exigirActivo(registro);

                // 3. Calcula minutos y valor con la tarifa vigente en la fecha de entrada.
                Liquidacion cobro = calcularLiquidacion(conexion, registro, Fechas.ahora());
                boolean hayQueCobrar = cobro.valorTotal().signum() > 0;

                // 4. Valida el pago ANTES de escribir. Con 0 minutos no se cobra:
                //    no hay pago y el método que venga se ignora.
                MetodoPago metodo = null;
                String referenciaValida = null;
                if (hayQueCobrar) {
                    metodo = buscarMetodo(conexion, idMetodoPago);
                    referenciaValida = validarReferencia(metodo, referencia);
                }

                // 5. Cierra el registro (UPDATE).
                if (!registroDAO.cerrar(conexion, idRegistro, cobro.salida(),
                        cobro.minutosTotales(), cobro.valorTotal())) {
                    throw new IllegalStateException(
                            "No se pudo cerrar el registro " + idRegistro + " aunque estaba bloqueado.");
                }

                // 6. Guarda el pago (INSERT). Si falla aquí (por ejemplo, la referencia
                //    ya existe), el UPDATE del paso 5 se deshace con el rollback.
                if (hayQueCobrar) {
                    pagoDAO.insertar(conexion, new Pago(null, idRegistro, metodo.idMetodo(),
                            cobro.valorTotal(), cobro.salida(), referenciaValida));
                }

                // 7. Todo salió bien: se guardan las dos escrituras juntas.
                conexion.commit();
            } catch (SQLException | RuntimeException e) {
                // Cualquier error: se deshace todo lo de esta transacción.
                deshacer(conexion, e);
                throw e;
            } finally {
                // 8. Deja la conexión como estaba (con un pool de conexiones, la
                //    siguiente petición la recibiría así). La cierra el try-with-resources.
                conexion.setAutoCommit(true);
            }
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
        // Fuera de la transacción: se lee el resultado ya confirmado.
        return registroService.buscarPorId(idRegistro);
    }

    /**
     * Busca la tarifa aplicable y calcula el cobro hasta {@code salida}.
     * Se usa en la liquidación y en la salida, así que las dos dan el mismo valor.
     */
    private Liquidacion calcularLiquidacion(Connection conexion, RegistroParqueo registro,
            LocalDateTime salida) throws SQLException {
        // Solo pasa si alguien insertó a mano en la base una entrada con fecha futura.
        if (salida.isBefore(registro.entrada())) {
            throw new ReglaNegocioException("La entrada del parqueo " + registro.idRegistro()
                    + " (" + registro.entrada().format(FORMATO_FECHA_HORA)
                    + ") es posterior a la hora actual; revisa el registro.");
        }
        Tarifa tarifa = tarifaDAO.buscarAplicable(conexion, registro.idRegistro())
                .orElseThrow(() -> new ReglaNegocioException("No hay una tarifa para ese tipo"
                        + " de vehículo vigente en la fecha de entrada ("
                        + registro.entrada().toLocalDate() + ")."));
        CalculadoraTarifa.Cobro cobro =
                CalculadoraTarifa.calcular(registro.entrada(), salida, tarifa.valorHora());
        return new Liquidacion(registro.idRegistro(), registro.entrada(), salida, cobro.minutos(),
                cobro.horasCobradas(), tarifa.valorHora(), cobro.valorTotal());
    }

    private MetodoPago buscarMetodo(Connection conexion, Long idMetodoPago) throws SQLException {
        if (idMetodoPago == null) {
            throw new DatosInvalidosException("El método de pago (idMetodoPago) es obligatorio.");
        }
        return metodoPagoDAO.buscarPorId(conexion, idMetodoPago)
                .orElseThrow(() -> new DatosInvalidosException("El método de pago indicado no existe."));
    }

    /**
     * Revisa que el registro siga ACTIVO. Es package-private para probarlo con JUnit.
     *
     * @throws ReglaNegocioException si ya tiene salida (estado PAGO)
     */
    static void exigirActivo(RegistroParqueo registro) {
        if (registro.estado() != EstadoRegistro.ACTIVO) {
            throw new ReglaNegocioException("El parqueo " + registro.idRegistro()
                    + " ya está cerrado: la salida se registró el "
                    + registro.salida().format(FORMATO_FECHA_HORA) + ".");
        }
    }

    /**
     * Devuelve la referencia que se guarda con el pago. Es package-private para
     * probarlo con JUnit.
     *
     * @return la referencia sin espacios en los extremos; {@code null} si el
     *         método no la usa (efectivo), aunque haya llegado una
     * @throws DatosInvalidosException si el método la exige y falta, o si es
     *         demasiado larga
     */
    static String validarReferencia(MetodoPago metodo, String referencia) {
        if (!Boolean.TRUE.equals(metodo.requiereReferencia())) {
            return null;
        }
        String limpia = referencia == null ? "" : referencia.strip();
        if (limpia.isEmpty()) {
            throw new DatosInvalidosException("El pago con " + metodo.nombre()
                    + " requiere la referencia (código de la transacción).");
        }
        if (limpia.length() > MAX_REFERENCIA) {
            throw new DatosInvalidosException(
                    "La referencia no puede tener más de " + MAX_REFERENCIA + " caracteres.");
        }
        return limpia;
    }

    /**
     * Hace el rollback. Si el rollback también falla, ese error se agrega a la
     * excepción original para no perderla.
     */
    private static void deshacer(Connection conexion, Exception causa) {
        try {
            conexion.rollback();
        } catch (SQLException errorRollback) {
            causa.addSuppressed(errorRollback);
        }
    }

    private static NoEncontradoException noExiste(long idRegistro) {
        return new NoEncontradoException("No existe un registro de parqueo con id " + idRegistro + ".");
    }
}
