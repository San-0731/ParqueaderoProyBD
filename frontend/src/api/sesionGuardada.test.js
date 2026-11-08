import { borrarSesionGuardada, guardarSesion, leerSesionGuardada } from './sesionGuardada.js';

const SESION = { token: 'tok', usuario: { idUsuario: 1, rol: 'DBA' } };

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('sesión guardada', () => {
  it('guarda, lee y borra la sesión de la pestaña', () => {
    expect(leerSesionGuardada()).toBeNull();

    guardarSesion(SESION);
    expect(leerSesionGuardada()).toEqual(SESION);

    borrarSesionGuardada();
    expect(leerSesionGuardada()).toBeNull();
  });

  it('un valor dañado o incompleto se trata como sin sesión', () => {
    window.sessionStorage.setItem('parqueadero.sesion', '{no es json');
    expect(leerSesionGuardada()).toBeNull();

    window.sessionStorage.setItem('parqueadero.sesion', JSON.stringify({ token: 'tok' }));
    expect(leerSesionGuardada()).toBeNull();
  });

  it('si el almacenamiento está bloqueado, no falla', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => guardarSesion(SESION)).not.toThrow();
    expect(leerSesionGuardada()).toBeNull();
    expect(() => borrarSesionGuardada()).not.toThrow();
  });
});
