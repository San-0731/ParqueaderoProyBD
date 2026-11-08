# Despliegue gratuito (Vercel + Render + Aiven)

Cómo está desplegado el **Sistema de Parqueadero**, qué variables usa cada plataforma y cómo
actualizarlo. Los pasos con las cuentas y los paneles (crear los servicios, pegar las
credenciales) están en el plan de la Fase 5, Parte B.

> **Credenciales:** las de producción (Aiven) **nunca** se escriben en el repositorio, en un
> archivo del proyecto ni en un chat. Solo se pegan en el panel de Render y en la terminal
> cuando el script las pide. Si una se filtra (por ejemplo, en un commit), se cambia de
> inmediato en Aiven y se actualiza en Render.

## URLs

| Pieza | URL |
|---|---|
| Aplicación (frontend) | `https://<URL_VERCEL>` |
| API (backend) | `https://<URL_RENDER>/api` (salud: `https://<URL_RENDER>/api/salud`) |

## 1. Arquitectura

```
   [ Navegador del usuario ]
             |
             |  https://<URL_VERCEL>
             v
 +-----------------------+
 |  Vercel (frontend)    |
 |  React + Vite         |
 +-----------------------+
             |
             |  Peticiones a la API (VITE_API_URL)
             |  Solo se aceptan desde CORS_ORIGIN
             v
 +-----------------------+
 |  Render (backend)     |
 |  Java 21 en Docker    |
 +-----------------------+
             |
             |  JDBC con SSL (DB_SSL=true)
             v
 +-----------------------+
 |  Aiven (MySQL 8)      |
 |  Plan gratuito        |
 +-----------------------+
```

| Pieza | Plataforma | Se despliega desde | Archivo del repositorio |
|---|---|---|---|
| Base de datos | Aiven for MySQL (plan gratuito) | Script ejecutado a mano | `database/scripts/cargar-bd-produccion.sh` |
| Backend | Render (Web Service gratuito, Docker) | Rama `main`, carpeta `backend/` | `backend/Dockerfile` |
| Frontend | Vercel (plan Hobby) | Rama `main`, carpeta `frontend/` | `frontend/vercel.json` |

**Arranque en frío:** el backend gratuito de Render se apaga tras unos minutos sin uso y tarda
cerca de un minuto en volver a encender. Mientras tanto la app muestra, en ámbar, "Conectando con
el servidor… puede tardar hasta un minuto" (ver [sección 6](#6-frontend-en-vercel)).

## 2. Variables de entorno

### Render (backend)

Se configuran en Render → el servicio → **Environment**.

| Variable | Ejemplo | Descripción |
|---|---|---|
| `DB_HOST` | `mysql-xxxx.aivencloud.com` | Host del servicio MySQL de Aiven |
| `DB_PORT` | `12345` | Puerto de Aiven (no suele ser 3306) |
| `DB_NAME` | `parqueadero` | Base de datos (o `defaultdb`, la que crea Aiven) |
| `DB_USER` | `avnadmin` | Usuario de Aiven |
| `DB_PASSWORD` | — | Contraseña de Aiven (solo en el panel) |
| `DB_SSL` | `true` | Conexión cifrada con MySQL. **Obligatorio en producción** |
| `CORS_ORIGIN` | `https://<URL_VERCEL>` | Única dirección que puede llamar a la API desde el navegador: con `https://` y **sin** barra al final |
| `DBA_USUARIO` | `dba` | Primer DBA de la aplicación: el backend lo crea al arrancar si no hay ninguno activo |
| `DBA_CLAVE_INICIAL` | — | Su contraseña inicial (mínimo 8 caracteres); cambiarla al entrar la primera vez |
| `PORT` | (no se define) | **Render la pone sola**; el backend escucha en ese puerto, en todas las interfaces |

En Render no hay archivo `.env`: `Configuracion` lee todo de las variables de entorno.
`DB_ROOT_PASSWORD` no se usa en producción (solo la usa el MySQL de Docker en local).

### Vercel (frontend)

Se configura en Vercel → el proyecto → **Settings → Environment Variables**.

| Variable | Ejemplo | Descripción |
|---|---|---|
| `VITE_API_URL` | `https://<URL_RENDER>/api` | URL base de la API, **sin** barra al final |

> Las variables `VITE_*` se incrustan en el código **al construir**. Si se cambia
> `VITE_API_URL`, hay que **volver a desplegar** el frontend para que tome el valor nuevo.

### Local (para comparar)

| Archivo | Variables | Valores locales |
|---|---|---|
| `.env` (raíz, copia de `.env.example`) | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `DB_SSL`, `PORT`, `CORS_ORIGIN`, `DBA_USUARIO`, `DBA_CLAVE_INICIAL` | `DB_SSL=false`, `CORS_ORIGIN=http://localhost:5173` |
| `frontend/.env.local` (copia de `frontend/.env.example`) | `VITE_API_URL` | `http://localhost:8080/api` |

## 3. Zona horaria (Colombia, UTC−5)

Los servidores en la nube trabajan en UTC. Sin ajustes, todo lo que calcula MySQL con `NOW()` o
`CURRENT_TIMESTAMP` saldría corrido 5 horas: un carro que lleva 45 minutos adentro aparecería con
345, y la auditoría, las sesiones y la fecha de creación de los usuarios quedarían con la hora de
Londres. Por eso hay cuatro piezas que deben ir juntas:

| Dónde | Qué hace |
|---|---|
| `util/Fechas.java` | Java calcula la fecha y la hora con la zona `America/Bogota` (entrada, salida, pago) |
| `config/ConexionBD.java` | Cada conexión ejecuta `SET time_zone = '-05:00'` (junto con `@id_usuario_app`), así `NOW()`, `CURRENT_TIMESTAMP` y las vistas dan la hora de Colombia |
| URL JDBC (`serverTimezone=America/Bogota`) | El driver convierte fechas con la misma zona que la sesión |
| `cargar-bd-produccion.sh` | Carga las migraciones con la sesión en `-05:00` (los `NOW()` de los datos de prueba) |

Se usa `-05:00` y no `'America/Bogota'` porque un nombre de zona exige que el servidor tenga
cargadas sus tablas de zonas horarias, y en la nube no está garantizado. Colombia no tiene
horario de verano, así que `-05:00` es correcto todo el año. La prueba
`bd/ZonaHorariaTest.java` comprueba la zona de la sesión y que los minutos de la vista coinciden
con los de Java. Se probó también contra un MySQL en UTC con SSL, como el de Aiven.

## 4. Cargar la base de producción

Una sola vez, con la base **vacía** creada en Aiven y Docker encendido:

```bash
./database/scripts/cargar-bd-produccion.sh                     # sin datos de ejemplo
./database/scripts/cargar-bd-produccion.sh --con-datos-prueba  # con V003, para la demostración
```

- Pide host, puerto, usuario, base y contraseña. La contraseña no se ve al escribirla y no queda
  en el historial. No lee credenciales de ningún archivo.
- Usa el cliente oficial `mysql:8.4` dentro de Docker: en Kali el `mysql` del sistema es el de
  MariaDB y puede fallar con la autenticación de MySQL 8. La primera vez descarga la imagen.
- Se conecta con `--ssl-mode=REQUIRED` y `utf8mb4`.
- **Se niega a seguir si la base ya tiene tablas** (para no cargar dos veces a medias) y pide
  confirmación mostrando el host, la base y las migraciones.
- Aplica las migraciones en orden y se detiene en la primera que falle, diciendo cuál.
- Al final muestra las tablas, las vistas, los triggers y las filas de los catálogos. Lo
  esperado: 15 tablas, 6 vistas y 12 triggers. Catálogos: 4 tipos de vehículo, 8 tarifas,
  4 métodos de pago, 3 roles, 5 zonas y 20 espacios.
- Sin `--con-datos-prueba` no hay marcas ni modelos (vienen con los datos de prueba): el DBA los
  agrega en la pestaña **Sistema**.
- El primer usuario de la aplicación (el DBA) no lo crea el script: lo crea el backend al
  arrancar en Render, con `DBA_USUARIO` y `DBA_CLAVE_INICIAL`.

## 5. Backend en Docker

`backend/Dockerfile` construye la imagen en dos etapas:

1. `maven:3.9-eclipse-temurin-21` compila y corre las pruebas unitarias. Las dependencias se
   descargan en una capa aparte, que queda en caché mientras no cambie el `pom.xml`.
2. `eclipse-temurin:21-jre-alpine` (solo el JRE) ejecuta el JAR con un usuario sin privilegios y
   `-XX:MaxRAMPercentage=75`, para respetar la poca memoria del plan gratuito.

La imagen final ocupa unos 296 MB en disco (79 MB comprimida). Render la construye solo a partir
del `Dockerfile` (Root Directory `backend`, Health Check Path `/api/salud`).

Para probarla en local, con el MySQL de `docker compose` encendido:

```bash
docker build -t parqueadero-backend backend/
# La contraseña se escribe sin que se vea y se pasa con -e DB_PASSWORD (sin valor):
read -r -s -p "DB_PASSWORD: " DB_PASSWORD && export DB_PASSWORD && echo
docker run --rm -p 8080:8080 --add-host=host.docker.internal:host-gateway \
  -e DB_HOST=host.docker.internal -e DB_PORT=<DB_PORT del .env> -e DB_NAME=parqueadero \
  -e DB_USER=<DB_USER del .env> -e DB_PASSWORD -e DB_SSL=false \
  -e CORS_ORIGIN=http://localhost:5173 parqueadero-backend
curl -s http://localhost:8080/api/salud   # {"estado":"OK","baseDatos":"OK"}
```

`DB_SSL=true` también funciona contra el MySQL local (MySQL 8.4 trae SSL activo), así se prueba
la conexión cifrada de producción.

## 6. Frontend en Vercel

- **`frontend/vercel.json`** reescribe cualquier ruta a `index.html`. Así, recargar el navegador
  en `/historial` o `/salida/5` no da 404: React Router dibuja la pantalla. Los archivos que
  existen (JS, CSS, fuentes) se sirven tal cual.
- **`npm run preview`** ya hace lo mismo en local (Vite responde `index.html` en las rutas de la
  app). Se comprobó con `curl`: `/historial`, `/salida/5` y `/sistema` devuelven `index.html`.
- **Arranque en frío:** el indicador del servidor (barra lateral y pantalla de inicio de sesión)
  muestra "Conectando con el servidor… puede tardar hasta un minuto" en ámbar y reintenta cada
  5 s. Si a los 90 s no hay respuesta, pasa a "Sin conexión" en rojo. Las peticiones esperan
  hasta 70 s (`api/cliente.js`): Render no las rechaza mientras despierta, las retiene.

## 7. Actualizar la aplicación

- **Código:** Render y Vercel vuelven a desplegar solos cada vez que se fusiona algo en `main`. El
  flujo sigue siendo: rama → Pull Request a `develop` → CI → Pull Request a `main`.
- **Cambios de esquema:** una migración nueva **no** se aplica sola en Aiven. Hay que aplicarla a
  mano contra la base de producción **antes** de fusionar a `main` el código que la necesita.
  Primero un respaldo (queda en `database/respaldos/`, que no se sube a git), luego la migración,
  con el mismo cliente que usa el script:

  ```bash
  read -r -s -p "Contraseña de Aiven: " MYSQL_PWD && export MYSQL_PWD && echo
  # 1. Respaldo
  docker run --rm -e MYSQL_PWD mysql:8.4 mysqldump -h <host> -P <puerto> -u avnadmin \
    --ssl-mode=REQUIRED --default-character-set=utf8mb4 --single-transaction --routines \
    --triggers --set-gtid-purged=OFF --no-tablespaces parqueadero \
    > database/respaldos/produccion_$(date +%Y%m%d_%H%M%S).sql
  # 2. Migración
  docker run --rm -i -e MYSQL_PWD mysql:8.4 mysql -h <host> -P <puerto> -u avnadmin \
    --ssl-mode=REQUIRED --default-character-set=utf8mb4 "--init-command=SET time_zone = '-05:00'" \
    parqueadero < database/migrations/V010__descripcion.sql
  unset MYSQL_PWD
  ```

- **Inactividad:** los planes gratuitos pueden pausar servicios sin uso prolongado. Revisar los
  correos de Aiven y Render.
- **Día de la presentación:** abrir la aplicación unos minutos antes para despertar el backend,
  y tener a mano capturas o un video del flujo por si falla internet.

## 8. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| En el navegador: error de CORS | `CORS_ORIGIN` no coincide exactamente con la URL de Vercel | Revisar `https://`, sin barra final, y volver a desplegar el backend |
| El frontend sigue llamando a `localhost` | `VITE_API_URL` mal puesta o no se volvió a desplegar | Corregir la variable en Vercel y volver a desplegar |
| `/api/salud` responde `"baseDatos": "ERROR"` | Credenciales o `DB_SSL` incorrectos | Revisar las variables en Render y los logs |
| El backend no arranca: "La variable DB_SSL debe valer true o false" | Valor mal escrito (`si`, `1`, con espacios) | Escribir exactamente `true` |
| Render dice que el servicio no responde | El servidor no usa `PORT` o escucha solo en `localhost` | No definir `PORT` en Render; el backend ya escucha en todas las interfaces |
| Las horas salen corridas 5 horas | Zona horaria de la sesión | Revisar la [sección 3](#3-zona-horaria-colombia-utc5); `ZonaHorariaTest` debe pasar |
| Recargar una ruta interna da 404 | Falta `vercel.json` o Root Directory no es `frontend` | Revisar la [sección 6](#6-frontend-en-vercel) |
| La primera carga tarda o el indicador sigue en ámbar | Arranque en frío de Render | Esperar hasta un minuto; si pasa a "Sin conexión", revisar los logs de Render |
| Nadie puede iniciar sesión en producción | Faltan `DBA_USUARIO` o `DBA_CLAVE_INICIAL` en Render | Definirlas y reiniciar el servicio: el log debe decir "Se creó el primer DBA" |
| El script dice que la base ya tiene tablas | Ya se cargó (o quedó a medias) | Si quedó a medias, borrar la base en Aiven, crearla de nuevo y repetir |
| Error 1419 o 1227 al crear triggers o la función de V008 | Falta el privilegio `SUPER` con el registro binario activo | Activar `log_bin_trust_function_creators` en la configuración avanzada de Aiven y repetir. Si no está disponible, **no** modificar las migraciones: lo decide el equipo |
| Error 1227 o 1044 en V009 (`CREATE ROLE`, `GRANT`) | El usuario de Aiven no puede crear roles | El rol es para el mínimo privilegio en local. **No** modificar la migración: lo decide el equipo (por ejemplo, saltarla en producción) |
| Error 3750 (tabla sin llave primaria) | Aiven activa `sql_require_primary_key` | No debería pasar: todas las tablas tienen llave primaria. Revisar si una migración nueva crea una tabla sin ella |

## 9. Mejora opcional: usuario con mínimo privilegio en producción

En producción el backend se conecta con `avnadmin`, que tiene casi todos los permisos. En local,
la aplicación usa un usuario con solo el rol `rol_aplicacion` (V009,
`aplicar-permisos.sh`). Si el equipo quiere lo mismo en Aiven, puede crear un usuario aparte en
el panel, darle `rol_aplicacion` como rol por defecto y usarlo en `DB_USER`/`DB_PASSWORD` de
Render. No es obligatorio para el despliegue.
