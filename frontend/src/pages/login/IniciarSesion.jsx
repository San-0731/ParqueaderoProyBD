import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import Alerta from '../../components/ui/Alerta.jsx';
import Boton from '../../components/ui/Boton.jsx';
import Campo from '../../components/ui/Campo.jsx';
import { useSesion } from '../../context/SesionContext.js';

/**
 * Pantalla de inicio de sesión. Es la única fuera del Layout (sin menú). Al entrar vuelve a la
 * pantalla que se quería abrir (la recuerda RutaProtegida) o al tablero.
 */
function IniciarSesion() {
  const { usuario, aviso, iniciarSesion } = useSesion();
  const navegar = useNavigate();
  const destino = useLocation().state?.desde ?? '/';

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Con la sesión ya abierta (por ejemplo, al volver atrás), no tiene sentido mostrar el formulario.
  if (usuario && !enviando) {
    return <Navigate to={destino} replace />;
  }

  async function enviar(evento) {
    evento.preventDefault();
    const nuevosErrores = {};
    if (!nombreUsuario.trim()) {
      nuevosErrores.nombreUsuario = 'Escribe tu usuario.';
    }
    if (!clave) {
      nuevosErrores.clave = 'Escribe tu contraseña.';
    }
    setErrores(nuevosErrores);
    setErrorEnvio(null);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }
    setEnviando(true);
    try {
      await iniciarSesion(nombreUsuario.trim(), clave);
      navegar(destino, { replace: true });
    } catch (error) {
      setErrorEnvio(error.mensaje ?? 'No se pudo iniciar sesión.');
      setEnviando(false);
    }
  }

  return (
    <main id="contenido" className="grid min-h-screen place-items-center bg-concreto px-4 py-10">
      <title>Iniciar sesión | Parqueadero</title>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-3">
          {/* La "P" del aviso de parqueadero, como en el menú. */}
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-md bg-senal font-condensada text-3xl leading-none font-bold text-white"
          >
            P
          </span>
          <span className="font-condensada text-3xl leading-none font-semibold">Parqueadero</span>
        </div>

        <section className="rounded-xl border border-borde bg-white p-5 sm:p-6">
          <h1 className="font-condensada text-3xl leading-tight font-semibold">Iniciar sesión</h1>
          <p className="mt-1.5 text-tenue">Entra con el usuario que te dio el DBA.</p>

          {aviso && (
            <div className="mt-4">
              <Alerta tipo="aviso">{aviso}</Alerta>
            </div>
          )}

          <form noValidate onSubmit={enviar} className="mt-5 flex flex-col gap-4">
            <Campo
              etiqueta="Usuario"
              value={nombreUsuario}
              onChange={(evento) => setNombreUsuario(evento.target.value)}
              error={errores.nombreUsuario}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
            <Campo
              etiqueta="Contraseña"
              type="password"
              value={clave}
              onChange={(evento) => setClave(evento.target.value)}
              error={errores.clave}
              autoComplete="current-password"
            />
            {errorEnvio && (
              <Alerta tipo="error" titulo="No se pudo iniciar sesión">
                {errorEnvio}
              </Alerta>
            )}
            <Boton type="submit" icono={LogIn} cargando={enviando} className="w-full">
              Iniciar sesión
            </Boton>
          </form>
        </section>
      </div>
    </main>
  );
}

export default IniciarSesion;
