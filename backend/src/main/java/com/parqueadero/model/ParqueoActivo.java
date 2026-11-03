package com.parqueadero.model;

import java.time.LocalDateTime;

/**
 * Un vehículo que está adentro ahora: una fila de la vista
 * {@code vw_parqueos_activos} (V004). En la vista la placa se llama
 * {@code placa}; aquí se usa {@code identificador}, como en el resto de la API.
 *
 * @param idRegistro           registro de parqueo ACTIVO
 * @param identificador        placa o código del vehículo
 * @param tipoVehiculo         nombre del tipo (Carro, Moto, ...)
 * @param documentoCliente     documento del propietario
 * @param nombreCliente        nombres y apellidos del propietario
 * @param idEspacio            espacio ocupado
 * @param piso                 piso del espacio
 * @param zona                 zona del espacio
 * @param numero               número del espacio
 * @param entrada              fecha y hora de entrada
 * @param minutosTranscurridos minutos desde la entrada hasta el momento de la consulta
 */
public record ParqueoActivo(Long idRegistro, String identificador, String tipoVehiculo,
        String documentoCliente, String nombreCliente, Long idEspacio, String piso,
        String zona, String numero, LocalDateTime entrada, Long minutosTranscurridos) {
}
