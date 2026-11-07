// Cliente HTTP de la API del parqueadero. Es el ÚNICO lugar del frontend que llama a fetch:
// las pantallas usan las funciones de los archivos de cada recurso (vehiculos.js, etc.).

/** Tiempo máximo de espera de una petición, en milisegundos. */
const TIEMPO_MAXIMO_MS = 15_000;

/**
 * Error de una petición a la API. Los errores del backend llegan como
 * { "error": "CODIGO", "mensaje": "..." }; el mensaje ya viene en español y se muestra tal cual.
 */
export class ErrorApi extends Error {
  /**
   * @param estado código HTTP (0 si no hubo respuesta del servidor)
   * @param codigo campo "error" del backend (REGLA_NEGOCIO, NO_ENCONTRADO...) o uno propio
   *        del frontend (SIN_CONEXION, TIEMPO_AGOTADO, SIN_CONFIGURACION)
   * @param mensaje texto para mostrar al usuario
   */
  constructor(estado, codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.mensaje = mensaje;
  }
}

/**
 * Arma la URL completa: base (VITE_API_URL) + ruta + query string.
 * Se omiten los parámetros vacíos (undefined, null o ''), pero false y 0 sí se envían
 * porque son filtros válidos (?disponible=false).
 */
function construirUrl(ruta, parametros = {}) {
  // Se lee en cada llamada (y no una sola vez al cargar) para que las pruebas puedan simularla.
  const base = import.meta.env.VITE_API_URL;
  if (!base) {
    throw new ErrorApi(
      0,
      'SIN_CONFIGURACION',
      'Falta VITE_API_URL: crea frontend/.env.local a partir de .env.example.',
    );
  }
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      consulta.append(clave, String(valor));
    }
  }
  const textoConsulta = consulta.toString();
  return `${base.replace(/\/+$/, '')}${ruta}${textoConsulta ? `?${textoConsulta}` : ''}`;
}

/** Lee el cuerpo como JSON. Si viene vacío (204) o no es JSON, devuelve null. */
async function leerJson(respuesta) {
  const texto = await respuesta.text();
  if (!texto) {
    return null;
  }
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/**
 * Hace la petición y devuelve el JSON de la respuesta. Si algo falla, lanza un ErrorApi.
 */
async function solicitar(metodo, ruta, { parametros, cuerpo } = {}) {
  const url = construirUrl(ruta, parametros);

  // El AbortController cancela la petición si pasan 15 s sin terminar.
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);

  const opciones = { method: metodo, headers: {}, signal: controlador.signal };
  // Content-Type solo cuando hay cuerpo: así un GET no obliga al navegador a enviar
  // antes la petición OPTIONS de CORS (preflight).
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  let datos;
  try {
    respuesta = await fetch(url, opciones);
    datos = await leerJson(respuesta);
  } catch {
    // fetch solo falla así cuando no hubo respuesta: se canceló por tiempo o el
    // servidor no está encendido (o no se puede llegar a él).
    if (controlador.signal.aborted) {
      throw new ErrorApi(
        0,
        'TIEMPO_AGOTADO',
        'El servidor tardó demasiado en responder. Intenta de nuevo.',
      );
    }
    throw new ErrorApi(
      0,
      'SIN_CONEXION',
      'No se pudo conectar con el servidor. Revisa que el backend esté encendido.',
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    throw new ErrorApi(
      respuesta.status,
      datos?.error ?? 'ERROR_HTTP',
      datos?.mensaje ?? `El servidor respondió con un error (${respuesta.status}).`,
    );
  }
  return datos;
}

/** GET con parámetros opcionales en el query string. */
export function get(ruta, parametros) {
  return solicitar('GET', ruta, { parametros });
}

/** POST con un cuerpo JSON. */
export function post(ruta, cuerpo) {
  return solicitar('POST', ruta, { cuerpo });
}

/** PUT con un cuerpo JSON (reemplaza todos los datos del recurso). */
export function put(ruta, cuerpo) {
  return solicitar('PUT', ruta, { cuerpo });
}

/** PATCH con un cuerpo JSON (cambia solo una parte del recurso). */
export function patch(ruta, cuerpo) {
  return solicitar('PATCH', ruta, { cuerpo });
}
