import { expect } from '@playwright/test';

// Utilidades de las pruebas E2E. Preparan datos llamando a la API directamente (con el
// `request` de Playwright), para que cada prueba recorra en pantalla solo lo que le interesa.
// La regla "las llamadas a la API solo salen de src/api/" es del código de la app, no de las
// pruebas.

/** URL de la API (la misma que usa el frontend en .env.local). */
export const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const azar = (cantidad, caracteres) =>
  Array.from(
    { length: cantidad },
    () => caracteres[Math.floor(Math.random() * caracteres.length)],
  ).join('');
const letras = (cantidad) => azar(cantidad, LETRAS);
const digitos = (cantidad) => azar(cantidad, '0123456789');

/** Placa con la forma de cada tipo (la misma regla que TipoPorPlaca y tipoVehiculo.js). */
const GENERADORES = {
  Carro: () => letras(3) + digitos(3),
  Moto: () => letras(3) + digitos(2) + letras(1),
  Camión: () => (Math.random() < 0.5 ? 'R' : 'S') + digitos(5),
  Bicicleta: () => 'BICI' + digitos(6),
};

async function json(respuesta) {
  const texto = await respuesta.text();
  expect(respuesta.ok(), `${respuesta.url()} respondió ${respuesta.status()}: ${texto}`).toBe(true);
  return texto ? JSON.parse(texto) : null;
}

/** Placa de un tipo que todavía no está registrada (identificadores únicos en cada ejecución). */
export async function placaLibre(request, tipo) {
  for (let intento = 0; intento < 20; intento++) {
    const placa = GENERADORES[tipo]();
    const encontrados = await json(await request.get(`${API}/vehiculos?identificador=${placa}`));
    if (encontrados.length === 0) {
      return placa;
    }
  }
  throw new Error(`No se encontró una placa libre de tipo ${tipo}`);
}

/** Documento de identidad que no tiene ningún propietario (10 números, empieza por 88). */
export async function documentoLibre(request) {
  for (let intento = 0; intento < 20; intento++) {
    const documento = '88' + digitos(8);
    const encontrados = await json(await request.get(`${API}/clientes?documento=${documento}`));
    if (encontrados.length === 0) {
      return documento;
    }
  }
  throw new Error('No se encontró un documento libre');
}

/** Crea por la API un propietario y un vehículo suyo del tipo pedido. */
export async function crearVehiculo(request, tipo) {
  const cliente = await json(
    await request.post(`${API}/clientes`, {
      data: { documento: await documentoLibre(request), nombres: 'Prueba', apellidos: 'E2E' },
    }),
  );
  return json(
    await request.post(`${API}/vehiculos`, {
      data: { identificador: await placaLibre(request, tipo), idCliente: cliente.idCliente },
    }),
  );
}

async function idTipo(request, nombre) {
  const tipos = await json(await request.get(`${API}/tipos-vehiculo`));
  return tipos.find((tipo) => tipo.nombre === nombre).idTipo;
}

/**
 * Espacios disponibles de un tipo, del último al primero. Las pruebas que eligen en pantalla
 * toman el primero de la lista; las que preparan datos por la API toman desde el final, así no
 * compiten por el mismo espacio cuando corren en paralelo.
 */
export async function espaciosLibresDesdeElFinal(request, tipo) {
  const espacios = await json(
    await request.get(`${API}/espacios?idTipo=${await idTipo(request, tipo)}&disponible=true`),
  );
  expect(espacios.length, `No quedan espacios libres de tipo ${tipo}`).toBeGreaterThan(0);
  return espacios.reverse();
}

/** Registra la entrada por la API y devuelve el registro creado. */
export async function registrarEntrada(request, identificador, idEspacio) {
  return json(
    await request.post(`${API}/registros/entrada`, { data: { identificador, idEspacio } }),
  );
}

/** Valor que se cobraría si el vehículo saliera ahora. */
async function valorACobrar(request, idRegistro) {
  const liquidacion = await json(await request.get(`${API}/registros/${idRegistro}/liquidacion`));
  return Number(liquidacion.valorTotal);
}

/**
 * Espera a que el parqueo tenga algo que cobrar. El backend no cobra el primer minuto
 * (0 minutos = $ 0 y la pantalla no pide método de pago), así que esto tarda poco más de un
 * minuto. El reloj del backend no se puede adelantar desde el navegador.
 */
export async function esperarQueHayaCobro(request, idRegistro) {
  await expect
    .poll(() => valorACobrar(request, idRegistro), {
      message: 'El parqueo debía empezar a cobrar después del primer minuto',
      timeout: 100_000,
      intervals: [5_000],
    })
    .toBeGreaterThan(0);
}

/** Id de un método de pago por su nombre. */
export async function idMetodoPago(request, nombre) {
  const metodos = await json(await request.get(`${API}/metodos-pago`));
  return metodos.find((metodo) => metodo.nombre === nombre).idMetodo;
}

/**
 * Limpieza: si el vehículo sigue dentro, registra su salida (en efectivo si hay cobro), para
 * dejar libre el espacio. Si se cierra en el mismo segundo de la entrada, la base lo rechaza
 * (la salida debe ser posterior), así que en ese caso espera un momento y lo intenta otra vez.
 */
export async function sacarSiSigueDentro(request, identificador) {
  const activos = await json(
    await request.get(`${API}/registros/activos?identificador=${identificador}`),
  );
  for (const { idRegistro } of activos) {
    for (let intento = 0; intento < 3; intento++) {
      const cobro = await valorACobrar(request, idRegistro);
      const datos = cobro > 0 ? { idMetodoPago: await idMetodoPago(request, 'Efectivo') } : {};
      const respuesta = await request.post(`${API}/registros/${idRegistro}/salida`, {
        data: datos,
      });
      if (respuesta.ok()) {
        break;
      }
      await new Promise((listo) => setTimeout(listo, 1_200));
    }
  }
}

/**
 * Crea por la API (con la sesión del DBA de e2e/preparacion.js) un usuario activo con el rol
 * pedido, un nombre que no existe y una contraseña al azar. Devuelve { nombreUsuario, clave }.
 * Los usuarios no se borran (en la aplicación se desactivan); quedan en la base de pruebas.
 */
export async function crearUsuarioPorApi(request, rol) {
  const nombreUsuario = `e2e_${rol.toLowerCase().slice(0, 5)}_${azar(8, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
  const clave = `clave-${azar(12, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
  const token = JSON.parse(process.env.E2E_SESION_DBA).token;
  await json(
    await request.post(`${API}/usuarios`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nombreUsuario, nombreCompleto: `Prueba E2E ${rol}`, rol, clave },
    }),
  );
  return { nombreUsuario, clave };
}
