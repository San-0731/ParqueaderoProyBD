// Validaciones del formulario de vehículo y propietario, con los mismos límites y mensajes
// que el backend (VehiculoService y ClienteService). Sirven para avisar antes de enviar;
// el backend y la base siguen validando todo.
//
// Cada validar...() devuelve un objeto { campo: mensaje } solo con los campos que tienen
// error: si está vacío ({}), los datos están bien.

export const MAX_DOCUMENTO = 20;
export const MAX_NOMBRES = 80;
export const MAX_APELLIDOS = 80;
export const MAX_TELEFONO = 15;
export const MAX_COLOR = 30;
export const ANIO_MINIMO = 1900;
export const ANIO_MAXIMO = 2100;

/** Igual que el backend: sin espacios, puntos ni guiones y en mayúsculas. "1.012.345.678" → "1012345678". */
export function normalizarDocumento(texto) {
  return (texto ?? '').replace(/[\s.-]/g, '').toUpperCase();
}

/** Igual que el backend: sin espacios ni guiones. "310 456-7890" → "3104567890". */
export function normalizarTelefono(texto) {
  return (texto ?? '').replace(/[\s-]/g, '');
}

/** Mensaje de error del documento, o null si es válido. */
export function validarDocumento(texto) {
  const documento = normalizarDocumento(texto);
  if (documento === '') {
    return 'El documento del cliente es obligatorio.';
  }
  if (!/^[A-Z0-9]+$/.test(documento)) {
    return 'El documento solo puede tener letras (A-Z) y números.';
  }
  if (documento.length > MAX_DOCUMENTO) {
    return `El documento no puede tener más de ${MAX_DOCUMENTO} caracteres.`;
  }
  return null;
}

/** Texto obligatorio con largo máximo (nombres y apellidos). */
function validarTexto(texto, nombreCampo, maximo) {
  const limpio = (texto ?? '').trim();
  if (limpio === '') {
    return `Los ${nombreCampo} son obligatorios.`;
  }
  if (limpio.length > maximo) {
    return `Los ${nombreCampo} no pueden tener más de ${maximo} caracteres.`;
  }
  return null;
}

/**
 * Datos de un propietario nuevo: { documento, nombres, apellidos, telefono }.
 * El teléfono es opcional.
 */
export function validarPropietarioNuevo({ documento, nombres, apellidos, telefono }) {
  const errores = {
    documento: validarDocumento(documento),
    nombres: validarTexto(nombres, 'nombres', MAX_NOMBRES),
    apellidos: validarTexto(apellidos, 'apellidos', MAX_APELLIDOS),
  };

  const telefonoLimpio = normalizarTelefono(telefono);
  if (telefonoLimpio !== '') {
    if (!/^\+?[0-9]+$/.test(telefonoLimpio)) {
      errores.telefono = 'El teléfono solo puede tener números (y un + al inicio).';
    } else if (telefonoLimpio.length > MAX_TELEFONO) {
      errores.telefono = `El teléfono no puede tener más de ${MAX_TELEFONO} caracteres.`;
    }
  }
  return soloErrores(errores);
}

/**
 * Datos del vehículo tal como están en el formulario (texto):
 * { idMarca, idModelo, color, anio }. Todos son opcionales: el tipo no se elige, sale de la
 * placa (utils/tipoVehiculo.js) y lo asigna el backend.
 */
export function validarVehiculo({ idMarca, idModelo, color, anio }) {
  const errores = {};
  // El vehículo solo guarda el modelo (y el modelo sabe su marca): una marca sin modelo se
  // perdería sin aviso.
  if (idMarca && !idModelo) {
    errores.idModelo = 'Elige también el modelo o deja la marca vacía.';
  }
  if ((color ?? '').trim().length > MAX_COLOR) {
    errores.color = `El color no puede tener más de ${MAX_COLOR} caracteres.`;
  }
  const anioTexto = String(anio ?? '').trim();
  if (anioTexto !== '') {
    const numero = Number(anioTexto);
    if (!Number.isInteger(numero) || numero < ANIO_MINIMO || numero > ANIO_MAXIMO) {
      errores.anio = `El año del vehículo debe estar entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.`;
    }
  }
  return errores;
}

/** Quita las entradas sin error ({ a: null, b: 'x' } → { b: 'x' }). */
function soloErrores(errores) {
  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje));
}

/** Estado inicial del propietario en el formulario de vehículo (lo maneja SeccionPropietario). */
export const PROPIETARIO_VACIO = {
  documento: '',
  // Documento (normalizado) que se buscó; null mientras no se busque o si se cambia el texto.
  buscado: null,
  // Cliente encontrado (o recién creado). null si se buscó y no existe: propietario nuevo.
  cliente: null,
  nombres: '',
  apellidos: '',
  telefono: '',
};

/**
 * Valida el propietario del formulario: hay que haberlo buscado; si existe no hay nada más
 * que revisar, y si es nuevo se validan sus datos.
 */
export function validarPropietario(propietario) {
  const { documento, buscado, cliente } = propietario;
  if (buscado === null || buscado !== normalizarDocumento(documento)) {
    return {
      documento:
        validarDocumento(documento) ??
        'Busca el documento para saber si el propietario ya está registrado.',
    };
  }
  return cliente ? {} : validarPropietarioNuevo(propietario);
}

/** Cuerpo para POST /clientes a partir del formulario del propietario nuevo. */
export function clienteParaApi({ documento, nombres, apellidos, telefono }) {
  return {
    documento: normalizarDocumento(documento),
    nombres: nombres.trim(),
    apellidos: apellidos.trim(),
    telefono: normalizarTelefono(telefono) || null,
  };
}

/**
 * Cuerpo para PUT /vehiculos/{id}: los selectores dan texto, la API espera números o null.
 * No lleva placa ni tipo: no se pueden cambiar (el backend conserva los guardados).
 */
export function vehiculoParaActualizar({ idModelo, color, anio }, idCliente) {
  return {
    idCliente,
    idModelo: idModelo ? Number(idModelo) : null,
    color: (color ?? '').trim() || null,
    anio: String(anio ?? '').trim() ? Number(anio) : null,
  };
}

/**
 * Cuerpo para POST /vehiculos: la placa más los mismos datos de la edición.
 * No lleva idTipo: el backend lo asigna según la placa.
 */
export function vehiculoParaApi({ identificador, ...valores }, idCliente) {
  return { identificador, ...vehiculoParaActualizar(valores, idCliente) };
}
