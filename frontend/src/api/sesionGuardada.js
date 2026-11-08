// La sesión del navegador: el token que entregó POST /auth/login y el usuario.
//
// Se guarda en sessionStorage (no en localStorage): dura lo que la pestaña. Al cerrar el
// navegador se cierra la sesión, lo que conviene en un computador compartido como el de la
// caseta. El backend además la vence a las 8 horas.
//
// Todo va en try/catch: en una ventana privada o con el almacenamiento bloqueado, sessionStorage
// puede fallar. En ese caso la app funciona igual, solo que al recargar pide iniciar sesión.

const CLAVE = 'parqueadero.sesion';

/** La sesión guardada { token, usuario }, o null si no hay (o no se puede leer). */
export function leerSesionGuardada() {
  try {
    const texto = window.sessionStorage.getItem(CLAVE);
    const sesion = texto ? JSON.parse(texto) : null;
    return sesion?.token && sesion?.usuario ? sesion : null;
  } catch {
    return null;
  }
}

/** Guarda la sesión { token, usuario }. */
export function guardarSesion(sesion) {
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // Sin almacenamiento la sesión vive solo en memoria (en el estado de React).
  }
}

/** Borra la sesión guardada. */
export function borrarSesionGuardada() {
  try {
    window.sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}
