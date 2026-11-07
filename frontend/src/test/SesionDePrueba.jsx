import { SesionContext } from '../context/SesionContext.js';
import { alcanza } from '../utils/roles.js';
import { USUARIOS_DE_PRUEBA } from './usuariosDePrueba.js';

// Ayuda SOLO para las pruebas: da una sesión fija sin pasar por el login ni por la API, para
// dibujar una pantalla como la vería cada rol.
//
//   render(<SesionDePrueba rol="OPERADOR"><Espacios /></SesionDePrueba>);

function SesionDePrueba({ rol = 'DBA', children }) {
  const usuario = USUARIOS_DE_PRUEBA[rol];
  const valor = {
    estado: 'con-sesion',
    usuario,
    aviso: null,
    puede: (minimo) => alcanza(usuario.rol, minimo),
    iniciarSesion: async () => usuario,
    cerrarSesion: async () => {},
  };
  return <SesionContext value={valor}>{children}</SesionContext>;
}

export default SesionDePrueba;
