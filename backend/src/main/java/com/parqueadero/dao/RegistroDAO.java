package com.parqueadero.dao;

import com.parqueadero.model.EstadoRegistro;
import com.parqueadero.model.ParqueoActivo;
import com.parqueadero.model.ParqueoHistorial;
import com.parqueadero.model.RegistroDetalle;
import com.parqueadero.model.RegistroParqueo;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de los registros de parqueo ({@code registro_parqueo}) y de
 * sus vistas ({@code vw_parqueos_activos} y {@code vw_historial_parqueos}).
 * Recibe la {@link Connection} y no la cierra: así la salida puede hacer
 * varias operaciones dentro de la misma transacción.
 */
public final class RegistroDAO {

    // estado no se envía: vale 'ACTIVO' por defecto (V001). Las reglas de tipo,
    // espacio habilitado, espacio ocupado y vehículo ya adentro las revisa la
    // base (trigger de V005 e índices UNIQUE de V001).
    private static final String SQL_INSERTAR_ENTRADA =
            "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada) VALUES (?, ?, ?)";

    private static final String SQL_BUSCAR_POR_ID =
            "SELECT id_registro, id_vehiculo, id_espacio, entrada, salida, minutos_totales,"
                    + " valor_total, estado FROM registro_parqueo WHERE id_registro = ?";

    // FOR UPDATE bloquea la fila hasta el commit o el rollback de la transacción:
    // si otra petición intenta cerrar el mismo registro al mismo tiempo, espera
    // aquí y, cuando continúa, ya lo ve cerrado (estado PAGO).
    private static final String SQL_BUSCAR_POR_ID_PARA_ACTUALIZAR = SQL_BUSCAR_POR_ID + " FOR UPDATE";

    // "AND estado = 'ACTIVO'": un registro ya cerrado nunca se vuelve a cerrar.
    private static final String SQL_CERRAR =
            "UPDATE registro_parqueo SET salida = ?, minutos_totales = ?, valor_total = ?,"
                    + " estado = 'PAGO' WHERE id_registro = ? AND estado = 'ACTIVO'";

    private static final String SQL_BUSCAR_DETALLE =
            "SELECT r.id_registro, r.id_vehiculo, v.identificador, r.id_espacio,"
                    + " z.piso, z.letra AS zona, e.numero, r.entrada, r.salida, r.minutos_totales,"
                    + " r.valor_total, r.estado"
                    + " FROM registro_parqueo r"
                    + " JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo"
                    + " JOIN espacio e  ON e.id_espacio = r.id_espacio"
                    + " JOIN zona z     ON z.id_zona = e.id_zona"
                    + " WHERE r.id_registro = ?";

    private static final String SELECT_ACTIVOS =
            "SELECT id_registro, placa, tipo_vehiculo, documento_cliente, nombre_cliente,"
                    + " id_espacio, piso, zona, numero, entrada, minutos_transcurridos"
                    + " FROM vw_parqueos_activos";

    // Los que llevan más tiempo adentro primero.
    private static final String ORDEN_ACTIVOS = " ORDER BY entrada, id_registro";

    private static final String SQL_LISTAR_ACTIVOS = SELECT_ACTIVOS + ORDEN_ACTIVOS;

    private static final String SQL_LISTAR_ACTIVOS_POR_IDENTIFICADOR =
            SELECT_ACTIVOS + " WHERE placa = ?" + ORDEN_ACTIVOS;

    private static final String SELECT_HISTORIAL =
            "SELECT h.id_registro, h.placa, h.tipo_vehiculo, h.piso, h.zona, h.numero,"
                    + " h.entrada, h.salida, h.minutos_totales, h.valor_total,"
                    + " h.metodos_pago, h.referencias"
                    + " FROM vw_historial_parqueos h";

    // Los más recientes primero.
    private static final String ORDEN_HISTORIAL = " ORDER BY h.entrada DESC, h.id_registro DESC";

    /**
     * Inserta el registro de entrada de un vehículo (queda en estado ACTIVO).
     *
     * @param entrada fecha y hora de entrada, calculada en Java (ver
     *        {@code Fechas.ahora()}) para no depender de la zona horaria de MySQL
     * @return el id generado
     */
    public long insertarEntrada(Connection conexion, long idVehiculo, long idEspacio,
            LocalDateTime entrada) throws SQLException {
        try (PreparedStatement consulta =
                     conexion.prepareStatement(SQL_INSERTAR_ENTRADA, Statement.RETURN_GENERATED_KEYS)) {
            consulta.setLong(1, idVehiculo);
            consulta.setLong(2, idEspacio);
            consulta.setObject(3, entrada);
            consulta.executeUpdate();
            try (ResultSet llaves = consulta.getGeneratedKeys()) {
                if (llaves.next()) {
                    return llaves.getLong(1);
                }
            }
        }
        throw new SQLException("MySQL no devolvió el id del registro insertado.");
    }

    /**
     * Busca la fila del registro, sin bloquearla (para consultar).
     *
     * @return el registro, o {@code Optional.empty()} si no existe
     */
    public Optional<RegistroParqueo> buscarPorId(Connection conexion, long idRegistro)
            throws SQLException {
        return buscar(conexion, SQL_BUSCAR_POR_ID, idRegistro);
    }

    /**
     * Busca la fila del registro y la <b>bloquea</b> ({@code SELECT ... FOR UPDATE})
     * hasta que termine la transacción. Solo tiene efecto dentro de una
     * transacción ({@code setAutoCommit(false)}).
     *
     * @return el registro, o {@code Optional.empty()} si no existe
     */
    public Optional<RegistroParqueo> buscarPorIdParaActualizar(Connection conexion, long idRegistro)
            throws SQLException {
        return buscar(conexion, SQL_BUSCAR_POR_ID_PARA_ACTUALIZAR, idRegistro);
    }

    /**
     * Cierra un registro ACTIVO: guarda salida, minutos y valor, y lo pasa a PAGO.
     *
     * @return {@code true} si se cerró; {@code false} si no existe o ya estaba cerrado
     */
    public boolean cerrar(Connection conexion, long idRegistro, LocalDateTime salida,
            long minutosTotales, BigDecimal valorTotal) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_CERRAR)) {
            consulta.setObject(1, salida);
            consulta.setLong(2, minutosTotales);
            consulta.setBigDecimal(3, valorTotal);
            consulta.setLong(4, idRegistro);
            return consulta.executeUpdate() > 0;
        }
    }

    private Optional<RegistroParqueo> buscar(Connection conexion, String sql, long idRegistro)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, idRegistro);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    return Optional.empty();
                }
                return Optional.of(new RegistroParqueo(
                        resultado.getLong("id_registro"),
                        resultado.getLong("id_vehiculo"),
                        resultado.getLong("id_espacio"),
                        resultado.getObject("entrada", LocalDateTime.class),
                        resultado.getObject("salida", LocalDateTime.class),       // NULL si ACTIVO
                        resultado.getObject("minutos_totales", Long.class),       // NULL si ACTIVO
                        resultado.getBigDecimal("valor_total"),                   // NULL si ACTIVO
                        EstadoRegistro.valueOf(resultado.getString("estado"))));
            }
        }
    }

    /**
     * Busca un registro con la placa del vehículo y la ubicación del espacio.
     * Los pagos no se incluyen (lista vacía): se leen con {@link PagoDAO}.
     *
     * @return el detalle, o {@code Optional.empty()} si no existe
     */
    public Optional<RegistroDetalle> buscarDetalle(Connection conexion, long idRegistro)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(SQL_BUSCAR_DETALLE)) {
            consulta.setLong(1, idRegistro);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    return Optional.empty();
                }
                return Optional.of(new RegistroDetalle(
                        resultado.getLong("id_registro"),
                        resultado.getLong("id_vehiculo"),
                        resultado.getString("identificador"),
                        resultado.getLong("id_espacio"),
                        resultado.getString("piso"),
                        resultado.getString("zona"),
                        resultado.getString("numero"),
                        resultado.getObject("entrada", LocalDateTime.class),
                        resultado.getObject("salida", LocalDateTime.class),        // NULL si ACTIVO
                        resultado.getObject("minutos_totales", Long.class),        // NULL si ACTIVO
                        resultado.getBigDecimal("valor_total"),                    // NULL si ACTIVO
                        EstadoRegistro.valueOf(resultado.getString("estado")),
                        List.of()));
            }
        }
    }

    /**
     * Vehículos que están adentro ahora (vista {@code vw_parqueos_activos}).
     *
     * @param identificador si no es {@code null}, solo el de esa placa o código
     *        (ya normalizado); como mucho hay uno, porque un vehículo no puede
     *        tener dos registros ACTIVO
     */
    public List<ParqueoActivo> listarActivos(Connection conexion, String identificador)
            throws SQLException {
        String sql = identificador == null ? SQL_LISTAR_ACTIVOS : SQL_LISTAR_ACTIVOS_POR_IDENTIFICADOR;
        List<ParqueoActivo> activos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            if (identificador != null) {
                consulta.setString(1, identificador);
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    activos.add(new ParqueoActivo(
                            resultado.getLong("id_registro"),
                            resultado.getString("placa"),
                            resultado.getString("tipo_vehiculo"),
                            resultado.getString("documento_cliente"),
                            resultado.getString("nombre_cliente"),
                            resultado.getLong("id_espacio"),
                            resultado.getString("piso"),
                            resultado.getString("zona"),
                            resultado.getString("numero"),
                            resultado.getObject("entrada", LocalDateTime.class),
                            resultado.getLong("minutos_transcurridos")));
                }
            }
        }
        return activos;
    }

    /**
     * Parqueos terminados (vista {@code vw_historial_parqueos}), del más
     * reciente al más antiguo. Cada filtro en {@code null} no se aplica.
     *
     * <p>El WHERE se arma uniendo solo fragmentos fijos escritos aquí, cada uno
     * con su {@code ?}. Los valores van siempre como parámetros del
     * {@link PreparedStatement}, nunca pegados al texto del SQL, así que no hay
     * riesgo de inyección SQL.
     *
     * @param desde         primer día de entrada (incluido)
     * @param hasta         último día de entrada (incluido)
     * @param identificador placa o código ya normalizado
     * @param idMetodoPago  solo los parqueos que tengan al menos un pago con ese método
     */
    public List<ParqueoHistorial> listarHistorial(Connection conexion, LocalDate desde,
            LocalDate hasta, String identificador, Long idMetodoPago) throws SQLException {
        List<String> condiciones = new ArrayList<>();
        List<Object> parametros = new ArrayList<>();

        // Se compara la columna entrada sin aplicarle funciones (no DATE(entrada)),
        // para que MySQL pueda usar el índice idx_registro_entrada.
        if (desde != null) {
            condiciones.add("h.entrada >= ?");
            parametros.add(desde.atStartOfDay());                 // desde las 00:00:00
        }
        if (hasta != null) {
            // entrada es DATETIME sin fracciones de segundo, así que hasta las
            // 23:59:59 cubre el día completo. No se usa "< día siguiente 00:00":
            // con hasta=9999-12-31 daría el año 10000, que MySQL rechaza.
            condiciones.add("h.entrada <= ?");
            parametros.add(hasta.atTime(23, 59, 59));
        }
        if (identificador != null) {
            condiciones.add("h.placa = ?");
            parametros.add(identificador);
        }
        if (idMetodoPago != null) {
            // La vista solo tiene los métodos unidos en un texto ('Efectivo + Nequi');
            // para filtrar por id se consulta la tabla pago.
            condiciones.add("EXISTS (SELECT 1 FROM pago pg"
                    + " WHERE pg.id_registro = h.id_registro AND pg.id_metodo = ?)");
            parametros.add(idMetodoPago);
        }

        String sql = SELECT_HISTORIAL
                + (condiciones.isEmpty() ? "" : " WHERE " + String.join(" AND ", condiciones))
                + ORDEN_HISTORIAL;

        List<ParqueoHistorial> historial = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            for (int i = 0; i < parametros.size(); i++) {
                consulta.setObject(i + 1, parametros.get(i));   // los parámetros JDBC empiezan en 1
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    historial.add(new ParqueoHistorial(
                            resultado.getLong("id_registro"),
                            resultado.getString("placa"),
                            resultado.getString("tipo_vehiculo"),
                            resultado.getString("piso"),
                            resultado.getString("zona"),
                            resultado.getString("numero"),
                            resultado.getObject("entrada", LocalDateTime.class),
                            resultado.getObject("salida", LocalDateTime.class),
                            resultado.getLong("minutos_totales"),
                            resultado.getBigDecimal("valor_total"),
                            resultado.getString("metodos_pago"),
                            resultado.getString("referencias")));   // NULL si todo fue en efectivo
                }
            }
        }
        return historial;
    }
}
