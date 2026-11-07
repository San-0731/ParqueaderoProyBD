import { API } from './apoyo.js';

/**
 * Se ejecuta una vez antes de todas las pruebas E2E: si el backend no responde, se detiene
 * con un mensaje claro en vez de dejar que cada prueba falle por su lado.
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
}
