# Guía de diseño del frontend

La dirección visual se llama **"Señalización vial"**. Toma lo que el operador ve todo el día:
- el aviso azul de parqueadero con la P blanca;
- el asfalto;
- el concreto;
- las placas amarillas colombianas.

Esta guía existe para que todas las pantallas (Pasos D–I) se vean iguales aunque las haga
gente distinta.

## Colores

Están definidos **una sola vez** en `frontend/src/index.css` (bloque `@theme`). Tailwind genera
una clase por color: `bg-senal`, `text-libre`, `border-borde`, etc. **No uses colores sueltos**
(`bg-blue-600`, `#123456`). Si hace falta uno nuevo, se agrega como token.

| Token | Para qué se usa |
|---|---|
| `senal` (`-oscuro`, `-claro`) | Acción principal, enlaces y foco del teclado |
| `asfalto` (`-claro`) | Barra lateral y texto principal |
| `concreto` | Fondo de la app |
| `borde` | Bordes de tarjetas, tablas y campos |
| `tenue` | Texto secundario (descripciones, ayudas) |
| `placa` | **Solo** placas (`<Placa>`) y la línea de la sección activa del menú |
| `libre` / `ocupado` / `deshabilitado` (`-claro`) | Estados: verde, rojo y gris |

Reglas:
- Los estados **siempre** llevan texto o ícono además del color, para quien no distingue colores.
- El amarillo nunca se usa para estados ni advertencias, solo para placas.
- Todos los pares de texto y fondo tienen contraste de 4.5:1 o más.

## Tipografía

- **Barlow** para todo el texto. Se diseñó a partir de señales viales y placas.
- **Barlow Condensed** (`font-condensada`) para títulos de página, placas y cifras grandes.
- Texto en minúscula normal: **nada de etiquetas en MAYÚSCULAS** ni flechas `→` en los botones.

## Componentes (`frontend/src/components/`)

| Componente | Uso |
|---|---|
| `layout/EncabezadoPagina` | Al inicio de **cada** pantalla: título, descripción, acciones y título de la pestaña |
| `ui/Placa` | **Toda** placa o código de vehículo en pantalla: `<Placa identificador={v.identificador} />` |
| `ui/Insignia` | Estado de un espacio: `<Insignia estado="ocupado" />` |
| `ui/Boton` | `variante` primario, secundario o peligro; `cargando` mientras se envía; `tamano="grande"` para la acción final de un flujo |
| `ui/Campo`, `ui/Selector` | Campos de formulario con `etiqueta`, `ayuda` y `error` (el `mensaje` del backend) |
| `ui/Tarjeta` | Agrupar contenido sobre fondo blanco |
| `ui/Tabla` | Listados; da scroll horizontal en celular y tiene una fila `pie` para los totales. Una columna con `fija: true` (por ejemplo, la placa) queda quieta al desplazar |
| `ui/Paginacion` | "Anterior", "Página 1 de 3" y "Siguiente"; con una sola página no se muestra |
| `ui/Interruptor` | Encendido o apagado (`role="switch"`), con el texto Sí o No al lado. Quien lo usa decide qué pasa al tocarlo (por ejemplo, pedir confirmación) |
| `ui/Modal` | Confirmaciones y formularios de edición |
| `ui/Alerta` | Mensaje dentro de la pantalla: `error`, `exito`, `aviso` o `info` |
| `ui/Cargando`, `ui/EstadoVacio` | Estados de carga y de "no hay datos" |
| `ui/IconoActualizando` | Ícono que gira en el botón "Actualizar" mientras llega la respuesta (no lo deshabilita) |
| `useNotificaciones()` | Avisos flotantes: `notificarExito('Entrada registrada.')` |

Para un enlace que debe verse como botón:

```jsx
<Link to="/entrada" className={clasesBoton()}>Registrar entrada</Link>
```

`clasesBoton` está en `ui/estilos.js`.

## Patrón de una pantalla que consulta la API

```jsx
const { datos, cargando, error, recargar } = useConsulta(listarActivos);

if (cargando && !datos) return <Cargando />;
if (error) {
  return (
    <Alerta tipo="error" titulo="No se pudo cargar" accion={<Boton onClick={recargar}>Reintentar</Boton>}>
      {error.mensaje}
    </Alerta>
  );
}
if (datos.length === 0) return <EstadoVacio titulo="No hay vehículos dentro" />;
```

Para que una pantalla se actualice sola, usa `useIntervalo` (`frontend/src/hooks/`):

```jsx
useIntervalo(() => {
  if (!document.hidden) recargar(); // con la pestaña oculta no se consulta
}, 30_000);
```

## Organización de las pantallas

Una pantalla sencilla es un archivo en `pages/`. Si la pantalla necesita varios archivos, va en
su propia carpeta. Por ejemplo, `pages/tablero/` contiene:
- la pantalla (`Tablero.jsx`);
- sus piezas (`LetreroCupos.jsx`, `TarjetaEspacio.jsx`…);
- las funciones puras sin React (`datosTablero.js`), que son las más fáciles de probar.

Los componentes del dominio que usan varias pantallas van en `components/<tema>/`. Por ejemplo,
`components/vehiculos/` tiene:

| Componente | Uso |
|---|---|
| `TarjetaVehiculo` | Datos del vehículo y su propietario |
| `FormularioVehiculo` | Registro de un vehículo con su propietario (entrada y "Nuevo vehículo"); la placa llega por prop y el tipo sale de ella |
| `CamposVehiculo` | Marca, modelo, color y año; los usan el registro y la edición |
| `modelos.js` | `describirModelo` ("Mazda 3") e `idMarcaDeModelo` |
| `SeccionPropietario` | Búsqueda de un propietario por documento o registro de uno nuevo |
| `validaciones.js` | Los mismos límites y mensajes del backend, para avisar antes de enviar |

Las funciones de formato que comparten varias pantallas van en `utils/`. Por ejemplo,
`utils/espacio.js` tiene `nombreZona` ("A1": la letra seguida del piso, porque la misma letra
puede repetirse en otro piso), `codigoEspacio` ("A1-01"), `nombreEspacio` ("A1-01, piso 1") y
`estadoEspacio` (libre, ocupado o deshabilitado; la usan el tablero y la administración de
espacios). Toda zona o espacio que se muestre usa estas funciones, nunca la letra sola.

## Sesión y roles

Todas las pantallas, menos `/login`, exigen sesión. Las piezas son:

| Pieza | Para qué |
|---|---|
| `api/autenticacion.js` | `iniciarSesion`, `cerrarSesion` y `consultarUsuarioActual` (`/auth/...`) |
| `api/sesionGuardada.js` | Guarda `{ token, usuario }` en `sessionStorage`: dura lo que la pestaña |
| `api/cliente.js` | Envía el token en `Authorization: Bearer ...`; si una petición con token recibe 401, avisa con `alPerderSesion` |
| `context/ProveedorSesion` | Comparte la sesión con toda la app; al recibir 401 la cierra y la pantalla de inicio muestra "Tu sesión terminó" |
| `useSesion()` | `{ usuario, puede, iniciarSesion, cerrarSesion, aviso }` desde cualquier pantalla |
| `components/sesion/RutaProtegida` | Sin sesión lleva a `/login` y, al entrar, vuelve a la pantalla que se pidió |
| `components/sesion/RequiereRol` | Muestra la pantalla solo si el rol alcanza; si no, `pages/SinPermiso` explica quién puede usarla |
| `utils/roles.js` | `alcanza(rol, minimo)` y `nombreRol(rol)`: la misma jerarquía del backend (`Rol.java`) |

Para decidir qué ve cada rol:
- **Una sección que el rol nunca puede usar no aparece en el menú** (`rolMinimo` en
  `BarraNavegacion`). Si alguien escribe la dirección, `RequiereRol` le explica quién puede usarla.
- **Una pantalla que sirve para consultar, pero tiene acciones restringidas, se ve en modo solo
  lectura**: el control desactivado y una `Alerta tipo="info"` arriba que explica por qué. Ejemplo:
  los interruptores de Espacios para el operador.
- **Un botón de una acción restringida no se dibuja** (por ejemplo, "Editar vehículo" para el
  operador): la pantalla pasa el manejador solo si `puede('ADMINISTRADOR')`.
- Ocultar o desactivar es solo comodidad. Quien protege de verdad es el backend, que responde 403.

```jsx
const { puede } = useSesion();
const puedeEditar = puede('ADMINISTRADOR');
<FichaVehiculo onEditarVehiculo={puedeEditar ? abrirEdicion : undefined} />
```

En las pruebas de una pantalla, `test/SesionDePrueba.jsx` da la sesión de un rol sin pasar por el
login: `<SesionDePrueba rol="OPERADOR"><Espacios /></SesionDePrueba>`.

## Auditoría (`pages/auditoria/`)

Solo para administrador y DBA. La llenan los triggers de la base (V008); la pantalla solo la lee.

- Filtros: rango de fechas (atajos y "Desde"/"Hasta", empieza en los últimos 7 días) y sección
  (entradas y salidas, pagos, vehículos, propietarios, espacios).
- Cada fila dice quién (nombre, rol y usuario), qué hizo en palabras (`describirAccion`:
  "Registró una salida", "Deshabilitó un espacio"…) y el detalle (`detalle`): al crear, los datos
  guardados; al editar, la fila (placa o espacio) y solo lo que cambió, como "antes → después".
- Las placas van con `<Placa>` y los tipos con `nombreTipoVisible()`, como en toda la app.
- El administrador solo recibe los cambios de los operadores; el DBA, todos. Lo filtra el backend
  (con dos vistas de la base), no la pantalla.

## Pestaña Sistema (`pages/sistema/`)

Es la pestaña exclusiva del DBA. `Sistema.jsx` pone el título y las secciones como pestañas
(`NavLink` con una línea azul abajo en la activa); cada sección es una ruta hija
(`/sistema/usuarios`…) que se dibuja en su `<Outlet />`. `/sistema` lleva a la primera.

- **Usuarios** (`sistema/usuarios/`): tabla de cuentas y tres modales (crear, editar y cambiar la
  contraseña). El nombre de usuario no se edita, igual que la placa. Los usuarios no se borran:
  se desactivan con el interruptor "Puede iniciar sesión". Las reglas del formulario están en
  `validacionesUsuario.js` y son las mismas del backend.
- Cuando el DBA se edita a sí mismo, el modal avisa que quitarse el rol o desactivarse cierra su
  sesión.
- **Zonas y espacios** (`sistema/zonas/`): tabla de zonas (nombre `A1`, piso, tipo visible y
  cuántos espacios tiene) y dos modales. "Nueva zona" pide piso, letra y tipo, y avisa si con
  ella aparece un piso nuevo. "Agregar espacios" muestra cuáles se van a crear (`A1-09 a A1-11`):
  siguen la numeración de la zona hasta el 99. Las reglas están en `datosZonas.js`. Las zonas y
  los espacios no se borran: un espacio se retira deshabilitándolo en Espacios.
- **Marcas y modelos** (`sistema/marcas/`): cada marca con sus modelos y un mismo modal
  (`ModalNombre`) para crear una marca o un modelo. Un nombre repetido (409) se muestra junto al
  campo.

## Flujo por pasos con resumen fijo (entrada)

- **Pasos numerados.** Cada paso es una `Tarjeta` cuyo título usa `TituloPaso`
  (`pages/entrada/`): un número en un cuadrito asfalto. Solo se numera lo que de verdad es una
  secuencia.
- **Paso inactivo.** Un paso que todavía no se puede usar dice por qué. Por ejemplo: "Primero
  busca el vehículo…".
- **Resumen fijo.** Va a la derecha en escritorio (`lg:sticky lg:top-8`) y al final en celular.
  Lleva lo que se va a guardar y el botón final grande.
- **Botón deshabilitado.** Siempre explica qué falta, con un texto unido por
  `aria-describedby`: "Falta elegir un espacio.".
- **Sin efectos.** Lo que se muestra se calcula en una función pura (`calcularVista` en
  `datosEntrada.js`) a partir del estado. Así no hay efectos que sincronizar.
- **Opciones para tocar.** Son radios nativos ocultos (`sr-only`) dentro de un `<label>`
  estilizado, con `has-checked:` y `has-focus-visible:`. Las flechas del teclado funcionan sin
  código extra.

## Salida y cobro (`pages/salida/`)

**Lista de vehículos dentro.** Cada vehículo es una fila con forma de tiquete
(`FilaVehiculoDentro`):
- a la izquierda, el "talón" con la `Placa`, separado por una línea punteada (la perforación);
- a la derecha, el tiempo dentro en grande.

Toda la fila es un enlace con un `aria-label` completo. En celular se apila, sin desplazamiento
horizontal. El buscador filtra por parte de la placa, y con un solo resultado Enter abre su cobro.

**Cuenta y pago.** En escritorio van en dos columnas (en celular, una debajo de la otra):

| Columna | Contenido |
|---|---|
| Izquierda: la cuenta (`CuentaParqueo`) | El valor a pagar va en un panel asfalto con números enormes, como la pantalla de un cajero de parqueadero |
| Derecha: el pago (`PanelPago`, `lg:sticky`) | Los métodos son tarjetas 2×2 con radios ocultos, igual que los cajones de la entrada; la referencia aparece solo si el método la pide |

- **El frontend no calcula el cobro.** Valor, horas cobradas y tarifa salen de la liquidación del
  backend; aquí solo se formatean.
- **Valor fresco antes de confirmar.** Al pulsar "Confirmar pago y salida" se vuelve a pedir la
  liquidación, y el modal muestra ese valor. Así lo que se le dice al cliente es lo que se cobra,
  aunque justo haya pasado otra hora.
- **Valor $ 0** (menos de un minuto): no se piden métodos y el botón dice "Confirmar salida sin
  cobro".

**Recibo** (`ReciboSalida`): una tirilla de caja angosta, con borde dentado (`@utility
borde-tirilla` en `index.css`) y separadores punteados. Al mostrarse, el foco va a su título.

**Imprimir.** Se usa la variante `print:` de Tailwind:

| Clase | Dónde |
|---|---|
| `print:hidden` | Lo que no debe salir en papel: menú, encabezado, botones y avisos |
| `print:max-w-[72mm]` | La tirilla, para que quepa en un rollo de 80 mm |
| `[print-color-adjust:exact]` | Para que la placa salga amarilla |

`window.print()` abre el diálogo del navegador. Para revisar cómo queda impreso sin papel:
`chromium --headless --print-to-pdf=recibo.pdf <url>`.

## Lista con ficha al lado (`pages/vehiculos/`)

- **Distribución.** En escritorio, la lista va a la izquierda (`22rem`) y la ficha a la derecha
  (`lg:sticky`). En celular se ve una cosa a la vez; la ficha lleva "Volver a la lista".
- **URL.** Lo que se ve queda guardado en ella: `?id=12` o `?nuevo=KLM999`.
- **Selección resaltada** (`ListaVehiculos`):

  | Estado | Aspecto | Clases |
  |---|---|---|
  | Elegido | Contorno azul, crece un poco y se eleva | `border-senal ring-2 ring-senal shadow-md motion-safe:scale-[1.02]` |
  | Mouse encima | Crece levemente | `hover:border-senal/50 motion-safe:hover:scale-[1.01]` |

  Es la única tarjeta con sombra fuera de los modales y los avisos: así se nota cuál se está
  viendo. La lista lleva `p-1` para que la tarjeta agrandada no se corte.
- **Teclado.** ↑ y ↓ cambian la selección, Inicio y Fin van al primero y al último, y Tab sale de
  la lista hacia la ficha. Solo el elegido está en el orden de Tab (*roving tabindex*).
- **Edición en modales.** Vehículo y propietario son dos modales distintos. El botón "Guardar
  cambios" queda fuera del `<form>`, así que se une a él con `form={idFormulario}`.
- **Errores 409.** Si el backend responde 409 por un dato que no se puede repetir (el documento),
  el mensaje va junto a ese campo y el foco vuelve a él.

## Filtros en la URL (`pages/historial/`)

- **La URL es la única fuente de los filtros**, por ejemplo
  `?desde=2026-10-01&hasta=2026-10-31&metodo=1&pagina=2`. No hay copia en el estado: así se
  pueden compartir y sobreviven a recargar la página. Al cambiar un filtro, la página vuelve a la 1.
- **URL vacía:** usa el rango por defecto (los últimos 7 días). "Todo" escribe `?todo=1` para no
  confundirse con la URL vacía.
- **Atajos de fechas:** son botones con `aria-pressed`, y el activo se calcula comparando las
  fechas.
- **Fechas en hora local:** se calculan con `utils/fechas.js`, nunca con `toISOString()` (que usa
  UTC y desde las 7 p. m. en Bogotá ya da el día siguiente).
- **Qué se filtra dónde:** lo que el backend filtra exacto (la placa) se filtra en el navegador
  por parte del texto; las fechas y el método se envían al backend.
- **Rango al revés:** se avisa junto al campo y no se consulta.
- **React Compiler:** los valores que salen de la URL y se usan como dependencias de `useCallback`
  se calculan dentro de un `useMemo`. Si no, la regla `preserve-manual-memoization` los marca
  como "podrían cambiar".

## Rango de fechas compartido

- **Lógica:** el historial y los reportes usan `utils/rangosFechas.js` para los atajos, la
  validación y la URL. Cada pantalla elige qué atajos muestra (`ATAJOS_HISTORIAL`,
  `ATAJOS_REPORTES`).
- **Componentes:**
  - `components/filtros/CamposFechas` dibuja Desde y Hasta, con el error bajo Hasta;
  - `AtajosFechas` dibuja los botones con `aria-pressed`.

## Gráficos sin librería (`pages/reportes/`)

- **Barras por día:**
  - son divs de Tailwind y la altura va en porcentaje del día más alto (`alturaRelativa`);
  - cada barra es un elemento enfocable con `role="img"` y `aria-label`. El mismo texto aparece
    en un globo con `group-hover:` y `group-focus-visible:`, así que el valor se ve con el mouse y
    con Tab;
  - los días sin pagos se dibujan en cero (con hasta 62 días), para no esconder los huecos.
- **Tabla debajo del gráfico:** es la versión accesible y la de las cifras exactas.
- **Barras apiladas de ocupación:**
  - van en rojo (`bg-ocupado`), verde (`bg-libre`) y rayas (`rayado-deshabilitado`), los mismos
    colores del tablero;
  - las cifras van escritas al lado, así la información no depende solo del color.

## "Pintura de piso" (tablero de espacios)

En el tablero, cada espacio se parece al cajón tal como se ve en el parqueadero:

| Estado | Aspecto | Clases |
|---|---|---|
| Libre | Línea pintada punteada, como un cajón vacío (la misma idea que `EstadoVacio`) | `border-2 border-dashed border-libre bg-white` |
| Ocupado | Fondo rojo claro con la `Placa` del vehículo | `border-ocupado/35 bg-ocupado-claro` |
| Deshabilitado | Rayas diagonales de "zona de no parquear" | `rayado-deshabilitado bg-white` |

`rayado-deshabilitado` es una utilidad propia definida con `@utility` en `index.css`. Si otra
pantalla necesita mostrar un espacio fuera de servicio, se reutiliza esta clase.

## Forma y espacio

- **Sombras solo en lo que flota** (modal y avisos). Las tarjetas llevan borde, no sombra.
- **Esquinas redondeadas:** campos y botones 8 px, tarjetas 12 px, modal 16 px, placa 5 px.
- **Tamaño de los controles:** botones y campos de 44 px de alto como mínimo, cómodos con el
  dedo en una tablet.
- **Animaciones:** solo con `motion-safe:`, para respetar la opción de "reducir movimiento".

## Tipos de vehículo

- **El tipo sale de la placa.** El operador no lo elige. La regla está en `utils/tipoVehiculo.js`
  (`tipoSegunPlaca`) y es la misma del backend (`TipoPorPlaca.java`):

  | Placa | Tipo |
  |---|---|
  | `ABC123` | Carro |
  | `ABC12D` | Moto |
  | `R12345` o `S12345` | Camión |
  | Cualquier otra | Bicicleta |

  Si se cambia una, hay que cambiar la otra.
- **Nombre en pantalla.** Todo tipo que se muestre pasa por `nombreTipoVisible()`, que muestra
  "Camión" como **"Camión de carga pesada"**. En la base y el backend sigue llamándose "Camión".
  Las pantallas nuevas, como el historial y los reportes, también deben usarlo.
- **Placa y tipo no se editan.** Después de registrar el vehículo no se pueden cambiar; el backend
  responde 400 si se intenta.

## Textos

- Escribe desde el punto de vista del operador, en voz activa.
- El botón dice exactamente lo que hace: "Confirmar entrada", no "Enviar".
- El aviso usa el mismo verbo que el botón: "Confirmar entrada" → "Entrada registrada".
- Un error dice qué pasó y cómo seguir. Si viene del backend, muestra su `mensaje` tal cual.
