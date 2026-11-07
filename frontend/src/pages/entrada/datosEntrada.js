// Datos de la pantalla "Registrar entrada": las consultas a la API y funciones puras (sin
// React) que deciden qué espacios ofrecer y cómo describir el vehículo.
import { listarTiposVehiculo, listarMarcas, listarModelos } from '../../api/catalogos.js';
import { obtenerCliente } from '../../api/clientes.js';
import { listarEspacios } from '../../api/espacios.js';
import { listarActivos } from '../../api/registros.js';
import { listarVehiculos } from '../../api/vehiculos.js';
import { codigoEspacio } from '../../utils/espacio.js';
import { nombreTipoVisible } from '../../utils/tipoVehiculo.js';

/**
 * Lo que la pantalla necesita al abrirse, en paralelo: los catálogos del registro rápido y
 * todos los espacios (con ellos se filtran los libres de cada tipo y se revisa el espacio
 * que llega desde el tablero).
 */
export async function cargarDatosEntrada() {
  const [tipos, marcas, modelos, espacios] = await Promise.all([
    listarTiposVehiculo(),
    listarMarcas(),
    listarModelos(),
    listarEspacios(),
  ]);
  return { tipos, marcas, modelos, espacios };
}

/**
 * Busca un vehículo por su placa o código (ya normalizado).
 *
 * @returns null si no está registrado; si existe, { vehiculo, propietario, registroActivo }
 *          donde registroActivo es su parqueo abierto (si ya está adentro) o null
 */
export async function buscarVehiculo(identificador) {
  const [vehiculo] = await listarVehiculos({ identificador });
  if (!vehiculo) {
    return null;
  }
  // El propietario y el parqueo activo se consultan a la vez.
  const [propietario, activos] = await Promise.all([
    obtenerCliente(vehiculo.idCliente),
    listarActivos({ identificador: vehiculo.identificador }),
  ]);
  return { vehiculo, propietario, registroActivo: activos[0] ?? null };
}

/** Espacios donde puede entrar un vehículo de ese tipo ahora (disponible = habilitado y libre). */
export function espaciosParaTipo(espacios, idTipo) {
  return espacios.filter((espacio) => espacio.disponible && espacio.idTipo === idTipo);
}

/**
 * Revisa el espacio que llegó en la URL (?idEspacio=3, desde el tablero).
 *
 * @param idTipo tipo del vehículo, o null si todavía no se ha buscado
 * @returns { estado, espacio } con estado:
 *   'valida' (se puede usar), 'otroTipo' (es de otro tipo de vehículo),
 *   'noDisponible' (ocupado o deshabilitado) o 'noExiste'
 */
export function revisarPreseleccion(espacios, idEspacio, idTipo) {
  const espacio = espacios.find((candidato) => candidato.idEspacio === idEspacio);
  if (!espacio) {
    return { estado: 'noExiste', espacio: null };
  }
  if (idTipo !== null && espacio.idTipo !== idTipo) {
    return { estado: 'otroTipo', espacio };
  }
  if (!espacio.disponible) {
    return { estado: 'noDisponible', espacio };
  }
  return { estado: 'valida', espacio };
}

/**
 * Aviso para el espacio que llegó desde el tablero cuando no se puede usar, o null si se
 * puede (o si no llegó ninguno).
 *
 * @param preseleccion resultado de revisarPreseleccion, o null
 * @param tipoVehiculo nombre del tipo del vehículo buscado ("Moto")
 */
export function mensajePreseleccion(preseleccion, tipos, tipoVehiculo) {
  if (!preseleccion) {
    return null;
  }
  const { estado, espacio } = preseleccion;
  switch (estado) {
    case 'otroTipo':
      return (
        `El espacio ${codigoEspacio(espacio)} que elegiste en el tablero es para ` +
        `${nombreTipo(espacio.idTipo, tipos)} y este vehículo es ${tipoVehiculo}. ` +
        'Elige uno de estos.'
      );
    case 'noDisponible':
      return `El espacio ${codigoEspacio(espacio)} que elegiste en el tablero ya no está libre. Elige otro.`;
    case 'noExiste':
      return 'El espacio que llegó en el enlace no existe. Elige uno de la lista.';
    default:
      return null;
  }
}

/** Agrupa espacios por piso, en el orden en que llegan: [{ piso, espacios }]. */
export function agruparPorPiso(espacios) {
  const pisos = new Map();
  for (const espacio of espacios) {
    if (!pisos.has(espacio.piso)) {
      pisos.set(espacio.piso, []);
    }
    pisos.get(espacio.piso).push(espacio);
  }
  return [...pisos].map(([piso, espaciosDelPiso]) => ({ piso, espacios: espaciosDelPiso }));
}

/** Nombre de un tipo de vehículo por su id ("Carro"), o null si no se encuentra. */
export function nombreTipo(idTipo, tipos) {
  return nombreTipoVisible(tipos.find((tipo) => tipo.idTipo === idTipo)?.nombre ?? null);
}

/**
 * Todo lo que la pantalla muestra, calculado a partir de su estado. Al ser una función pura,
 * la pantalla no necesita efectos para mantener sincronizados el paso 2 y el resumen.
 *
 * @param datos resultado de cargarDatosEntrada
 * @param resultado null (sin buscar) o { identificador, ficha } (ficha null si no existe)
 * @param eleccion idEspacio que tocó el operador, o null
 * @param textoPreseleccion el ?idEspacio= de la URL (texto), o null
 */
export function calcularVista({ datos, resultado, eleccion, textoPreseleccion }) {
  const ficha = resultado?.ficha ?? null;
  const vehiculo = ficha?.vehiculo ?? null;
  // Se puede elegir espacio cuando hay vehículo y no está adentro.
  const listo = Boolean(vehiculo) && !ficha.registroActivo;
  const tipoVehiculo = vehiculo ? nombreTipo(vehiculo.idTipo, datos.tipos) : null;

  const preseleccion =
    textoPreseleccion === null || textoPreseleccion === undefined
      ? null
      : revisarPreseleccion(
          datos.espacios,
          Number(textoPreseleccion),
          listo ? vehiculo.idTipo : null,
        );
  const espacioDelTablero = preseleccion?.estado === 'valida' ? preseleccion.espacio : null;

  // El espacio tocado tiene prioridad; si no, el del tablero (solo si sirve para este tipo).
  const espaciosLibres = listo ? espaciosParaTipo(datos.espacios, vehiculo.idTipo) : [];
  const espacioElegido =
    espaciosLibres.find((espacio) => espacio.idEspacio === eleccion) ??
    espaciosLibres.find((espacio) => espacio.idEspacio === espacioDelTablero?.idEspacio) ??
    null;

  const faltantes = [];
  if (!resultado) {
    faltantes.push('buscar el vehículo');
  } else if (!ficha) {
    faltantes.push('registrar el vehículo');
  }
  if (!ficha?.registroActivo && !espacioElegido) {
    faltantes.push('elegir un espacio');
  }

  let motivoInactivo = 'Primero busca el vehículo: así se muestran solo los espacios de su tipo.';
  if (resultado && !ficha) {
    motivoInactivo = 'Registra el vehículo para ver los espacios libres de su tipo.';
  } else if (ficha?.registroActivo) {
    motivoInactivo = 'El vehículo ya está dentro: registra primero su salida.';
  }

  return {
    ficha,
    listo,
    tipoVehiculo,
    espaciosLibres,
    espacioElegido,
    espacioDelTablero,
    // Antes de buscar el vehículo (o mientras se registra), el resumen ya muestra el espacio
    // que llegó del tablero; si el vehículo ya está adentro, no se muestra ninguno.
    espacioResumen: listo ? espacioElegido : ficha?.registroActivo ? null : espacioDelTablero,
    faltantes,
    motivoInactivo,
    aviso: mensajePreseleccion(preseleccion, datos.tipos, tipoVehiculo),
  };
}
