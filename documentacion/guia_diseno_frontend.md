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
| `ui/Tabla` | Listados; da scroll horizontal en celular y tiene una fila `pie` para los totales |
| `ui/Modal` | Confirmaciones y formularios de edición |
| `ui/Alerta` | Mensaje dentro de la pantalla: `error`, `exito`, `aviso` o `info` |
| `ui/Cargando`, `ui/EstadoVacio` | Estados de carga y de "no hay datos" |
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

## Textos

- Escribe desde el punto de vista del operador, en voz activa.
- El botón dice exactamente lo que hace: "Confirmar entrada", no "Enviar".
- El aviso usa el mismo verbo que el botón: "Confirmar entrada" → "Entrada registrada".
- Un error dice qué pasó y cómo seguir. Si viene del backend, muestra su `mensaje` tal cual.
