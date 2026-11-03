package com.parqueadero.service;

import com.parqueadero.config.ConexionBD;
import com.parqueadero.dao.ClienteDAO;
import com.parqueadero.exception.DatosInvalidosException;
import com.parqueadero.exception.NoEncontradoException;
import com.parqueadero.model.Cliente;
import com.parqueadero.util.TraductorErroresSQL;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Lógica de negocio de los clientes (propietarios de los vehículos).
 *
 * <p>Igual que {@link VehiculoService}: cada método abre su conexión con
 * try-with-resources, llama al {@link ClienteDAO} y traduce las
 * {@link SQLException}. El documento repetido lo detecta la base
 * ({@code uq_cliente_documento}) y llega como 409.
 */
public final class ClienteService {

    // Longitudes máximas de las columnas de cliente (V001__crear_tablas.sql).
    static final int MAX_DOCUMENTO = 20;
    static final int MAX_NOMBRES = 80;
    static final int MAX_APELLIDOS = 80;
    static final int MAX_TELEFONO = 15;

    private final ConexionBD conexionBD;
    private final ClienteDAO clienteDAO;

    public ClienteService(ConexionBD conexionBD, ClienteDAO clienteDAO) {
        this.conexionBD = conexionBD;
        this.clienteDAO = clienteDAO;
    }

    /**
     * Lista los clientes, con filtro opcional por documento. Siempre devuelve
     * una lista, igual que la búsqueda de vehículos.
     *
     * @param documento texto a buscar (se normaliza: {@code "1.012.345.678"}
     *        encuentra {@code "1012345678"}); {@code null} o en blanco = sin filtro
     * @return todos, una lista con el que coincide, o una lista vacía
     */
    public List<Cliente> listar(String documento) {
        // Se normaliza antes de abrir la conexión: si el texto no sirve (por
        // ejemplo "."), se responde 400 sin ir a la base.
        String normalizado = documento == null || documento.isBlank()
                ? null : normalizarDocumento(documento);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            if (normalizado == null) {
                return clienteDAO.listar(conexion);
            }
            return clienteDAO.buscarPorDocumento(conexion, normalizado)
                    .map(List::of)
                    .orElse(List.of());
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Busca un cliente por su id.
     *
     * @throws NoEncontradoException si no existe
     */
    public Cliente buscarPorId(long idCliente) {
        try (Connection conexion = conexionBD.obtenerConexion()) {
            return clienteDAO.buscarPorId(conexion, idCliente)
                    .orElseThrow(() -> noExisteId(idCliente));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Registra un cliente nuevo. Se ignora {@code datos.idCliente()}.
     *
     * @return el cliente tal como quedó guardado, con su id
     * @throws DatosInvalidosException si los datos no son válidos
     * @throws com.parqueadero.exception.ReglaNegocioException si el documento ya existe
     */
    public Cliente crear(Cliente datos) {
        Cliente cliente = validar(datos);
        try (Connection conexion = conexionBD.obtenerConexion()) {
            long idGenerado = clienteDAO.insertar(conexion, cliente);
            return clienteDAO.buscarPorId(conexion, idGenerado)
                    .orElseThrow(() -> new IllegalStateException(
                            "No se encontró el cliente recién insertado con id " + idGenerado));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Actualiza todos los datos del cliente {@code idCliente}. Se usa el id
     * recibido (el de la ruta) y se ignora {@code datos.idCliente()}.
     *
     * @return el cliente tal como quedó guardado
     * @throws NoEncontradoException si no existe
     */
    public Cliente actualizar(long idCliente, Cliente datos) {
        Cliente validado = validar(datos);
        Cliente cliente = new Cliente(idCliente, validado.documento(), validado.nombres(),
                validado.apellidos(), validado.telefono());
        try (Connection conexion = conexionBD.obtenerConexion()) {
            if (!clienteDAO.actualizar(conexion, cliente)) {
                throw noExisteId(idCliente);
            }
            return clienteDAO.buscarPorId(conexion, idCliente)
                    .orElseThrow(() -> noExisteId(idCliente));
        } catch (SQLException e) {
            throw TraductorErroresSQL.traducir(e);
        }
    }

    /**
     * Deja el documento en su forma guardada: sin espacios, puntos ni guiones y
     * en mayúsculas ({@code "1.012.345.678"} → {@code "1012345678"}). Se usa al
     * guardar y al buscar, para que ambos coincidan.
     *
     * @throws DatosInvalidosException si queda vacío
     */
    static String normalizarDocumento(String documento) {
        String normalizado = documento == null ? ""
                : documento.replaceAll("[\\s.\\-]", "").toUpperCase(Locale.ROOT);
        if (normalizado.isEmpty()) {
            throw new DatosInvalidosException("El documento del cliente es obligatorio.");
        }
        return normalizado;
    }

    /**
     * Valida los datos de un cliente sin ir a la base y devuelve una copia
     * limpia: documento y teléfono normalizados, nombres sin espacios en los
     * extremos y teléfono en blanco convertido en {@code null}.
     *
     * <p>Junta todos los errores en un solo mensaje para que el formulario los
     * muestre juntos. Es package-private para poder probarlo con JUnit.
     *
     * @throws DatosInvalidosException si hay algún error
     */
    static Cliente validar(Cliente datos) {
        if (datos == null) {
            throw new DatosInvalidosException("Los datos del cliente son obligatorios.");
        }

        List<String> errores = new ArrayList<>();

        String documento = null;
        try {
            documento = normalizarDocumento(datos.documento());
            if (!documento.matches("[A-Z0-9]+")) {
                errores.add("El documento solo puede tener letras (A-Z) y números.");
            } else if (documento.length() > MAX_DOCUMENTO) {
                errores.add("El documento no puede tener más de " + MAX_DOCUMENTO + " caracteres.");
            }
        } catch (DatosInvalidosException e) {
            errores.add(e.getMessage());
        }

        String nombres = texto(datos.nombres());
        if (nombres == null) {
            errores.add("Los nombres son obligatorios.");
        } else if (nombres.length() > MAX_NOMBRES) {
            errores.add("Los nombres no pueden tener más de " + MAX_NOMBRES + " caracteres.");
        }

        String apellidos = texto(datos.apellidos());
        if (apellidos == null) {
            errores.add("Los apellidos son obligatorios.");
        } else if (apellidos.length() > MAX_APELLIDOS) {
            errores.add("Los apellidos no pueden tener más de " + MAX_APELLIDOS + " caracteres.");
        }

        // Opcional. Se quitan espacios y guiones: "310 456-7890" → "3104567890".
        String telefono = datos.telefono() == null ? null
                : datos.telefono().replaceAll("[\\s\\-]", "");
        if (telefono != null && telefono.isEmpty()) {
            telefono = null;
        }
        if (telefono != null) {
            if (!telefono.matches("\\+?[0-9]+")) {
                errores.add("El teléfono solo puede tener números (y un + al inicio).");
            } else if (telefono.length() > MAX_TELEFONO) {
                errores.add("El teléfono no puede tener más de " + MAX_TELEFONO + " caracteres.");
            }
        }

        if (!errores.isEmpty()) {
            throw new DatosInvalidosException(String.join(" ", errores));
        }

        return new Cliente(datos.idCliente(), documento, nombres, apellidos, telefono);
    }

    /** Quita los espacios de los extremos; {@code null} si queda vacío. */
    private static String texto(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor.strip();
    }

    private static NoEncontradoException noExisteId(long idCliente) {
        return new NoEncontradoException("No existe un cliente con id " + idCliente + ".");
    }
}
