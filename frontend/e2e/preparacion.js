import { API } from './apoyo.js';

/**
 * Se ejecuta una vez antes de todas las pruebas E2E:
 * 1. Si el backend no responde, se detiene con un mensaje claro en vez de dejar que cada prueba
 *    falle por su lado.
 * 2. Inicia sesión como el DBA de arranque y deja la sesión en E2E_SESION_DBA (las variables
 *    de entorno que se crean aquí llegan a todas las pruebas). e2e/sesion.js la pone en cada
 *    página, así no hay que iniciar sesión en cada prueba.
 */
export default async function preparacion() {
  let salud;
  try {
    const respuesta = await fetch(`${API}/salud`);
    salud = await respuesta.json();
  } catch {
    salud = null;
  }
  if (salud?.baseDatos !== 'OK') {
    throw new Error(
      `El backend no responde en ${API} o no llega a MySQL. Enciende la base de pruebas y el ` +
        'backend antes de las pruebas E2E:\n' +
        '  docker compose up -d && ./database/scripts/recrear-bd-pruebas.sh\n' +
        '  cd backend && DB_NAME=parqueadero_test java -jar target/parqueadero-backend.jar',
    );
  }

  const nombreUsuario = process.env.DBA_USUARIO;
  const clave = process.env.DBA_CLAVE_INICIAL;
  if (!nombreUsuario || !clave) {
    throw new Error(
      'Faltan DBA_USUARIO y DBA_CLAVE_INICIAL (en el .env de la raíz o en el entorno): las ' +
        'pruebas E2E inician sesión con ese DBA.',
    );
  }
  const respuesta = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombreUsuario, clave }),
  });
  if (!respuesta.ok) {
    throw new Error(
      `No se pudo iniciar sesión como '${nombreUsuario}' (${respuesta.status}). El backend crea ` +
        'el DBA al arrancar: si recreaste la base de pruebas después de encenderlo, reinícialo.',
    );
  }
  process.env.E2E_SESION_DBA = await respuesta.text();
}
