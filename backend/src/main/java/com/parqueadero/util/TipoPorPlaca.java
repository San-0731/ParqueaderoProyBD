package com.parqueadero.util;

import java.util.regex.Pattern;

/**
 * Tipo de un vehículo según su placa colombiana. El operador no elige el tipo:
 * sale de la forma de la placa o código.
 *
 * <table>
 *   <caption>Regla</caption>
 *   <tr><th>Placa (ya normalizada)</th><th>Tipo</th></tr>
 *   <tr><td>{@code ABC123}: 3 letras y 3 números</td><td>Carro</td></tr>
 *   <tr><td>{@code ABC12D}: 3 letras, 2 números y 1 letra</td><td>Moto</td></tr>
 *   <tr><td>{@code R12345} o {@code S12345}: remolque o semirremolque</td><td>Camión</td></tr>
 *   <tr><td>cualquier otra (por ejemplo, el código de una bicicleta)</td><td>Bicicleta</td></tr>
 * </table>
 *
 * <p>Los nombres son los de la tabla {@code tipo_vehiculo} (V002). El frontend
 * repite esta misma regla en {@code utils/tipoVehiculo.js} para mostrar el tipo
 * mientras se escribe la placa; si se cambia aquí, hay que cambiarla allá.
 */
public final class TipoPorPlaca {

    public static final String CARRO = "Carro";
    public static final String MOTO = "Moto";
    public static final String CAMION = "Camión";
    public static final String BICICLETA = "Bicicleta";

    /** Placa de carro: tres letras y tres números (ABC123). */
    private static final Pattern PLACA_CARRO = Pattern.compile("^[A-Z]{3}[0-9]{3}$");

    /** Placa de moto: tres letras, dos números y una letra (ABC12D). */
    private static final Pattern PLACA_MOTO = Pattern.compile("^[A-Z]{3}[0-9]{2}[A-Z]$");

    /** Placa de remolque (R) o semirremolque (S) de carga pesada: la letra y cinco números. */
    private static final Pattern PLACA_CAMION = Pattern.compile("^[RS][0-9]{5}$");

    private TipoPorPlaca() {
        // Clase de utilidades: no se crean objetos de ella.
    }

    /**
     * Devuelve el nombre del tipo que corresponde a la placa. La placa se
     * normaliza antes ({@code "abc-123"} se trata como {@code "ABC123"}).
     *
     * @return {@link #CARRO}, {@link #MOTO}, {@link #CAMION} o {@link #BICICLETA}
     * @throws com.parqueadero.exception.DatosInvalidosException si la placa es
     *         {@code null} o queda vacía
     */
    public static String nombreTipo(String identificador) {
        String placa = Identificadores.normalizar(identificador);
        if (PLACA_CARRO.matcher(placa).matches()) {
            return CARRO;
        }
        if (PLACA_MOTO.matcher(placa).matches()) {
            return MOTO;
        }
        if (PLACA_CAMION.matcher(placa).matches()) {
            return CAMION;
        }
        return BICICLETA;
    }
}
