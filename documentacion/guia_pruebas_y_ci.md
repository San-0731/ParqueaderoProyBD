# Guía de pruebas e integración continua (GitHub Actions)

Guía para entender **cómo se prueba el Sistema de Parqueadero** y, sobre todo, **qué pasa en
GitHub cada vez que alguien sube código**. Explica qué prueba cada nivel, cómo se ejecuta
cada uno en el computador, cómo funciona el archivo `.github/workflows/ci.yml` línea por
línea, cómo leer los resultados en GitHub, qué hacer cuando algo falla y cómo hacer que
nadie pueda fusionar código que rompa las pruebas.

Sirve también para preparar la sustentación: al final hay preguntas frecuentes con sus
respuestas.

> **Estado (07/11/2026):** las pruebas y el workflow ya están en la rama `develop` local y
> se probaron en una simulación en el computador. El CI empieza a correr en GitHub la
> primera vez que se suba `develop` (sección 9).

---

## Índice

1. [¿Para qué sirven las pruebas?](#1-para-qué-sirven-las-pruebas)
2. [Mapa de las pruebas del proyecto](#2-mapa-de-las-pruebas-del-proyecto)
3. [Las pruebas en tu computador](#3-las-pruebas-en-tu-computador)
4. [¿Qué es la integración continua?](#4-qué-es-la-integración-continua)
5. [Conceptos de GitHub Actions](#5-conceptos-de-github-actions)
6. [El workflow del proyecto, paso a paso](#6-el-workflow-del-proyecto-paso-a-paso)
7. [Local y CI: diferencias](#7-local-y-ci-diferencias)
8. [Cómo ver los resultados en GitHub](#8-cómo-ver-los-resultados-en-github)
9. [Primera puesta en marcha (lo hace una persona)](#9-primera-puesta-en-marcha-lo-hace-una-persona)
10. [Hacer obligatorio el CI antes de fusionar](#10-hacer-obligatorio-el-ci-antes-de-fusionar)
11. [El día a día con el CI](#11-el-día-a-día-con-el-ci)
12. [Cuando el CI falla](#12-cuando-el-ci-falla)
13. [Reproducir el CI en tu computador](#13-reproducir-el-ci-en-tu-computador)
14. [Bugs: del issue a la corrección](#14-bugs-del-issue-a-la-corrección)
15. [Mejoras posibles](#15-mejoras-posibles)
16. [Preguntas frecuentes (sustentación)](#16-preguntas-frecuentes-sustentación)
17. [Glosario](#17-glosario)

---

## 1. ¿Para qué sirven las pruebas?

Una prueba automática es **código que usa el sistema y comprueba que hace lo que debe**.
Por ejemplo: "si un carro de 125 minutos sale, se cobran 3 horas". Si mañana alguien cambia
el cálculo del cobro y lo daña, esa prueba falla y lo avisa **antes** de que llegue al
usuario.

Las pruebas sirven para tres cosas:

| Para qué | Ejemplo en este proyecto |
|---|---|
| **Detectar errores pronto** | Si alguien borra el trigger que impide parquear una moto en un espacio de carro, `TriggersTest` falla de inmediato. |
| **Cambiar el código sin miedo** | Se puede reorganizar el backend y, si las 272 pruebas siguen en verde, el comportamiento es el mismo. |
| **Demostrar que se cumple el enunciado** | La [matriz de trazabilidad](pruebas/matriz-trazabilidad.md) muestra qué prueba cubre cada parte del enunciado. |

### La pirámide de pruebas

Las pruebas se organizan como una pirámide: abajo, muchas pruebas pequeñas y rápidas;
arriba, pocas pruebas grandes y lentas que recorren todo el sistema.

```
                 ▲  más lentas, prueban más cosas juntas
                ╱ ╲
               ╱   ╲        Manuales: 57 casos (equipo de testing)
              ╱─────╲
             ╱  E2E  ╲      22 pruebas con Playwright (navegador real)
            ╱─────────╲
           ╱ Integración╲   115 pruebas JUnit contra MySQL real (BD, API, seguridad)
          ╱─────────────╲
         ╱   Unitarias   ╲  157 de JUnit + 411 de Vitest
        ╱─────────────────╲
                 ▼  más rápidas, prueban una pieza a la vez
```

- **Unitarias:** prueban una función o un componente aislado. No necesitan base de datos ni
  servidor. Tardan segundos.
- **Integración:** prueban varias piezas juntas de verdad: el backend con MySQL, la API con
  peticiones HTTP reales.
- **Extremo a extremo (E2E):** un navegador real abre la aplicación y hace lo que haría el
  operario: escribe la placa, elige el espacio, cobra.
- **Manuales:** una persona sigue un guion paso a paso y anota lo que ve. Revisan lo que es
  difícil de automatizar: que se vea bien en el celular, que los mensajes se entiendan.

---

## 2. Mapa de las pruebas del proyecto

| Nivel | Herramienta | Dónde está el código | Cantidad | ¿Corre en GitHub? |
|---|---|---|---|---|
| Unitarias del backend | JUnit 6 | `backend/src/test/java/com/parqueadero/{service,util,handler,model}/` y `ServidorRutasTest` | 254 | ✅ Sí |
| Integración: reglas de la base | JUnit + JDBC | `backend/src/test/java/com/parqueadero/bd/` | 95 | ✅ Sí |
| Integración: API | JUnit + `java.net.http.HttpClient` | `backend/src/test/java/com/parqueadero/api/` | 158 | ✅ Sí |
| Integración: seguridad | JUnit + `HttpClient` | `backend/src/test/java/com/parqueadero/api/SeguridadApiTest.java` | 33 | ✅ Sí |
| Integración: entorno | JUnit | `backend/src/test/java/com/parqueadero/integracion/` | 11 | ✅ Sí |
| Permisos del rol de MySQL | Script de terminal | `database/scripts/verificar-permisos.sh` | 17 comprobaciones | ✅ Sí |
| Frontend (pantallas, funciones, accesibilidad) | Vitest + Testing Library + axe-core | `frontend/src/**/*.test.{js,jsx}` | 518 | ✅ Sí |
| Lint del frontend | ESLint | `frontend/eslint.config.js` | — | ✅ Sí |
| Compilación del frontend | Vite | — | — | ✅ Sí |
| Extremo a extremo | Playwright (Chromium) | `frontend/e2e/` | 22 | ❌ No (solo en local, sección 16) |
| Manuales | Guion de casos | `documentacion/pruebas/` | 57 casos + los de la Fase 5 | ❌ No (las hace una persona) |

Totales: **551** pruebas JUnit (254 unitarias + 297 de integración), **518** de Vitest y
**22** E2E.

### ¿Qué revisa cada grupo de integración?

| Clase | Qué demuestra |
|---|---|
| `bd/RestriccionesTest` | Los CHECK, UNIQUE y llaves foráneas rechazan datos inválidos: placa repetida, año 1800, monto 0, salida antes de la entrada, cliente inexistente… |
| `bd/RegistrosActivosTest` | Un espacio no puede tener dos vehículos a la vez y un vehículo no puede estar adentro dos veces. |
| `bd/TriggersTest` | `abc-123` se guarda como `ABC123`; una moto no entra a un espacio de carro; no se parquea en un espacio deshabilitado. |
| `bd/VistasTest` | Las 4 vistas devuelven lo correcto (disponibles, activos, historial, ingresos). |
| `api/FlujoParqueoApiTest` | El recorrido completo por HTTP (entrada → liquidación → salida con pago → historial → reporte) con **cada** método de pago. |
| `api/ReglasApiTest` | Los errores del negocio llegan como 409 o 400 con un mensaje claro. |
| `api/ConcurrenciaApiTest` | 10 cobros simultáneos del mismo vehículo dejan **un solo pago** (`SELECT ... FOR UPDATE`). |
| `api/SeguridadApiTest` | Inyección SQL, textos larguísimos, emojis, cuerpos raros y errores sin detalles internos. |
| `bd/ZonasTest` | La tabla `zona` (V006): misma letra en pisos distintos sí, en el mismo piso no; formatos de piso, letra y número. |
| `bd/UsuariosTest` | Roles, usuarios y sesiones (V007): nombre de usuario único y con formato, solo el hash del token. |
| `bd/AuditoriaTest` | Los triggers de auditoría (V008): operador y administrador quedan registrados, el DBA y los cambios fuera de la app no; el rol es una foto; un rollback no deja filas. |
| `api/AutenticacionApiTest` | Inicio y cierre de sesión: token de 43 caracteres, mismo mensaje para usuario inexistente o clave mala, sesión vencida o usuario desactivado → 401. |
| `api/PermisosApiTest` | Cada ruta sin sesión → 401 y con un rol que no alcanza → 403; el operador sí puede trabajar. |
| `api/UsuariosApiTest`, `ZonasApiTest`, `MarcasModelosApiTest`, `AuditoriaApiTest` | La pestaña Sistema y la auditoría de punta a punta (por ejemplo, siempre queda un DBA activo; los espacios siguen la numeración hasta el 99). |
| `ServidorRutasTest` (unitaria) | Solo `/salud` y `/auth/login` son públicas: una ruta nueva sin rol hace fallar el build. |

El detalle de qué prueba cubre cada parte del enunciado está en
[`pruebas/matriz-trazabilidad.md`](pruebas/matriz-trazabilidad.md).

---

## 3. Las pruebas en tu computador

### 3.1 Backend: unitarias (no necesitan base de datos)

```bash
cd backend
mvn clean package
```

Compila, ejecuta las 157 pruebas unitarias y genera el JAR. Las pruebas marcadas con
`@Tag("integracion")` **se saltan** a propósito, para que este comando funcione aunque
MySQL esté apagado.

### 3.2 Backend: todo, incluida la integración (necesita MySQL)

```bash
docker compose up -d                       # MySQL encendido (desde la raíz)
./database/scripts/recrear-bd-pruebas.sh   # crea parqueadero_test desde las migraciones
cd backend && mvn verify -Pintegracion     # 272 pruebas
```

- Las pruebas de integración usan **otra base**, `parqueadero_test`, dentro del mismo
  contenedor. La base de trabajo (`parqueadero`) no se toca.
- `-Pintegracion` activa un **perfil** de Maven (definido en `backend/pom.xml`) que deja de
  saltar las pruebas de integración y fija `DB_NAME=parqueadero_test`.
- Como protección, si `DB_NAME` no termina en `_test`, las pruebas se niegan a correr, y el
  script se niega a borrar la base.
- Las pruebas de la base trabajan dentro de una transacción que se deshace (`rollback()`);
  las de la API crean datos con placas únicas y los borran al terminar. La base de pruebas
  queda igual después de cada ejecución.

### 3.3 Frontend

```bash
cd frontend
npm run lint             # reglas de calidad (ESLint)
npm test -- --run        # 411 pruebas de Vitest, incluida la accesibilidad (axe-core)
npm run test:cobertura   # las mismas, con el porcentaje de código cubierto (coverage/)
npm run build            # compilación de producción
```

### 3.4 Extremo a extremo (Playwright)

La primera vez: `cd frontend && npx playwright install chromium`. Luego, con MySQL
encendido:

```bash
cd backend && DB_NAME=parqueadero_test java -jar target/parqueadero-backend.jar   # terminal 1
cd frontend && npm run test:e2e                                                   # terminal 2
```

Tardan unos 2 minutos: el backend no cobra el primer minuto de parqueo, así que las pruebas
que pagan esperan algo más de un minuto real. El detalle está en el README, sección
"Pruebas de extremo a extremo (E2E)".

---

## 4. ¿Qué es la integración continua?

**Integración continua** (en inglés *Continuous Integration*, **CI**) es la práctica de
que, cada vez que alguien sube código al repositorio, **un servidor ejecute
automáticamente todas las pruebas** y avise si algo se rompió.

Sin CI, cada persona tiene que acordarse de correr las pruebas antes de subir su código. Si
alguien se olvida, el error llega a `develop` y lo descubre otra persona días después.
Con CI:

```
Sin CI                                   Con CI
──────                                   ──────
Ana sube código roto                     Ana sube código roto
      │                                        │
      ▼                                        ▼
Llega a develop sin que nadie note       GitHub ejecuta las pruebas en ~minutos
      │                                        │
      ▼                                        ▼
Días después, Luis actualiza develop     ❌ El PR se pone en rojo y GitHub
y nada le funciona                          avisa a Ana: no se puede fusionar
      │                                        │
      ▼                                        ▼
Hay que buscar quién lo rompió           Ana lo corrige antes de que llegue
                                           a develop
```

Además, el CI corre en una **máquina limpia** (no en el computador de nadie). Así detecta
el famoso "en mi computador sí funciona": una dependencia que solo tienes instalada tú, un
archivo que olvidaste subir o un `.env` que nadie más tiene.

**GitHub Actions** es el servicio de CI que trae GitHub. No hay que instalar nada: basta
con un archivo de configuración dentro del repositorio, en `.github/workflows/`.

---

## 5. Conceptos de GitHub Actions

| Concepto | Qué es | En este proyecto |
|---|---|---|
| **Workflow** | Un proceso automático descrito en un archivo YAML dentro de `.github/workflows/`. | `.github/workflows/ci.yml`, llamado **CI**. |
| **Evento** (*trigger*) | Lo que hace que el workflow se ejecute. | Un `push` a `develop` o `main`, o un Pull Request hacia ellas. |
| **Job** (trabajo) | Un grupo de pasos que corre en **una máquina**. Los jobs de un workflow corren **en paralelo**. | Dos jobs: `backend` y `frontend`. |
| **Runner** | La máquina virtual que GitHub presta para ejecutar un job. Se crea vacía y se destruye al terminar. | `ubuntu-latest` (Linux), una por job. |
| **Step** (paso) | Una instrucción dentro de un job: un comando (`run`) o una acción ya hecha (`uses`). | Por ejemplo "Instalar Java 21" o `mvn -B verify -Pintegracion`. |
| **Action** (acción) | Un paso reutilizable publicado por alguien. Las oficiales son de `actions/…`. | `actions/checkout@v7`, `actions/setup-java@v6`, `actions/setup-node@v7`. |
| **Service container** | Un contenedor de Docker que GitHub enciende junto al job, por ejemplo una base de datos. | `mysql:8.4` para el job `backend`. |
| **Caché** | Guarda descargas entre ejecuciones para no repetirlas. | Dependencias de Maven y de npm. |
| **Status check** | El resultado (✅ o ❌) de cada job, que GitHub muestra en el commit y en el PR. | `backend` y `frontend`. |
| **Badge** (insignia) | Una imagen que muestra si el último CI de una rama pasó. | Arriba del README, para `develop`. |

Analogía con el proyecto: el **workflow** es como el `pom.xml` (describe qué hacer), cada
**job** es como una terminal distinta en una máquina nueva, y cada **step** es un comando
que escribirías en esa terminal.

---

## 6. El workflow del proyecto, paso a paso

Archivo: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

### 6.1 Vista general

```
           push a develop/main  ─┐
   Pull Request a develop/main  ─┴──►  Workflow "CI"
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼ (en paralelo)                                 ▼
          ┌──────────────────────────┐                ┌──────────────────────────┐
          │ Job backend              │                │ Job frontend             │
          │ máquina Ubuntu nueva     │                │ máquina Ubuntu nueva     │
          │ + contenedor MySQL 8.4   │                │                          │
          ├──────────────────────────┤                ├──────────────────────────┤
          │ 1. Descargar el código   │                │ 1. Descargar el código   │
          │ 2. Instalar Java 21      │                │ 2. Instalar Node 24      │
          │ 3. Configurar MySQL      │                │ 3. npm ci                │
          │ 4. Crear parqueadero_test│                │ 4. npm run lint          │
          │ 5. mvn verify            │                │ 5. npm test -- --run     │
          │    -Pintegracion (272)   │                │ 6. npm run build         │
          └────────────┬─────────────┘                └────────────┬─────────────┘
                       ▼                                           ▼
                  ✅ o ❌ backend                              ✅ o ❌ frontend
                       └──────────────────┬────────────────────────┘
                                          ▼
                    Resultado visible en el commit, el PR y la insignia
```

Si **cualquier** paso falla, el job se detiene ahí y queda en rojo (❌). Los pasos que
venían después no se ejecutan.

### 6.2 Cabecera: nombre, eventos y concurrencia

```yaml
name: CI

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]
```

- `name: CI`: el nombre que aparece en la pestaña **Actions** de GitHub.
- `on: push`: se ejecuta cuando llegan commits a `develop` o `main` (por ejemplo, al
  fusionar un PR o al hacer `git push origin develop`).
- `on: pull_request`: se ejecuta cuando se abre un PR **hacia** `develop` o `main`, y otra
  vez con cada commit nuevo que se suba a ese PR.
- Un push a una rama `feature/...` **no** lo dispara por sí solo; se prueba cuando se abre
  su PR hacia `develop`.

> **Dato importante:** en un Pull Request, GitHub no prueba la rama tal cual. Prueba **cómo
> quedaría `develop` si se fusionara el PR**: crea en secreto la fusión
> (`refs/pull/N/merge`) y corre las pruebas sobre ella. Así detecta conflictos de lógica
> entre tu rama y lo que otros ya fusionaron.

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Si subes dos commits seguidos al mismo PR, la ejecución del primero ya no sirve: este
bloque la **cancela** y deja solo la del último. Ahorra tiempo y minutos de GitHub. Un job
"cancelado" por esto es normal y no es un error.

```yaml
permissions:
  contents: read
```

El workflow solo puede **leer** el repositorio. Es una buena práctica de seguridad: aunque
una dependencia maliciosa se colara, no podría modificar el código ni publicar nada.

### 6.3 Job `backend`

```yaml
  backend:
    name: backend
    runs-on: ubuntu-latest
    timeout-minutes: 20
```

- `name: backend`: el nombre del **status check** (el que se marca como obligatorio en la
  sección 10).
- `runs-on: ubuntu-latest`: GitHub presta una máquina Linux nueva. Ya trae Docker y el
  cliente `mysql`.
- `timeout-minutes: 20`: si algo se queda colgado, GitHub corta el job a los 20 minutos en
  lugar de gastar horas.

#### Variables de entorno del job

```yaml
    env:
      DB_HOST: 127.0.0.1
      DB_PORT: '3306'
      DB_NAME: parqueadero_test
      DB_USER: parqueadero_user
      DB_PASSWORD: clave_app_solo_ci
      DB_ROOT_PASSWORD: clave_root_solo_ci
```

En el CI **no existe el archivo `.env`** (está en `.gitignore`, nunca se sube). Por eso los
datos de conexión se dan como variables de entorno. `Configuracion.java` ya está hecha
para eso: primero busca en las variables de entorno y, solo si no están, en el `.env`.

> **¿No dice la regla del proyecto que no se escriben credenciales en el código?** Estas
> claves no son las del proyecto: solo existen dentro del MySQL **desechable** del CI, que
> se crea al empezar el job y se destruye al terminar, sin datos reales y sin acceso desde
> internet. Si se quisiera esconderlas también, se guardarían como *secrets* del
> repositorio (Settings → Secrets and variables → Actions) y se leerían con
> `${{ secrets.NOMBRE }}`.

#### El servicio MySQL

```yaml
    services:
      mysql:
        image: mysql:8.4
        env:
          MYSQL_ROOT_PASSWORD: clave_root_solo_ci
          MYSQL_DATABASE: parqueadero
          MYSQL_USER: parqueadero_user
          MYSQL_PASSWORD: clave_app_solo_ci
          TZ: America/Bogota
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -uroot -p$MYSQL_ROOT_PASSWORD"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=20
```

Es el equivalente del `docker-compose.yml` local, pero lo enciende GitHub:

- **Misma imagen** (`mysql:8.4`) que en local, así las pruebas corren contra la misma
  versión de MySQL.
- Las variables `MYSQL_*` crean, al arrancar, la clave de root, la base `parqueadero` y el
  usuario `parqueadero_user`, igual que en local.
- `ports: 3306:3306`: el MySQL queda disponible en `127.0.0.1:3306` de la máquina del job.
- `--health-cmd ...`: el *health check*. GitHub pregunta cada 5 segundos "¿ya respondes?"
  (`mysqladmin ping`) y **no empieza los pasos** hasta que MySQL esté listo. Sin esto, las
  pruebas podrían arrancar cuando MySQL todavía se está encendiendo.

#### Paso 1: descargar el código

```yaml
      - name: Descargar el código
        uses: actions/checkout@v7
```

La máquina empieza vacía. Esta acción oficial clona el repositorio (en un PR, la fusión de
prueba descrita en 6.2).

#### Paso 2: instalar Java 21 con caché de Maven

```yaml
      - name: Instalar Java 21 (Temurin) con caché de Maven
        uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: '21'
          cache: maven
```

Instala Java 21 (distribución Temurin, la de Eclipse Adoptium) y Maven. `cache: maven`
guarda la carpeta `~/.m2` (donde Maven descarga Connector/J, Gson y JUnit) entre
ejecuciones: la primera vez descarga todo; las siguientes, si el `pom.xml` no cambió, la
recupera de la caché y es más rápido.

#### Paso 3: configurar MySQL (zona horaria y utf8mb4)

```yaml
      - name: Configurar MySQL (zona horaria -05:00 y utf8mb4)
        env:
          MYSQL_PWD: ${{ env.DB_ROOT_PASSWORD }}
        run: |
          mysql -h 127.0.0.1 -P 3306 --protocol=TCP -uroot -e "
            SET PERSIST time_zone = '-05:00';
            SET PERSIST character_set_server = 'utf8mb4';
            SET PERSIST collation_server = 'utf8mb4_unicode_ci';"
          mysql -h 127.0.0.1 -P 3306 --protocol=TCP -uroot -e "
            SELECT @@version, @@time_zone, @@character_set_server, NOW();"
```

En local, `docker-compose.yml` arranca MySQL con argumentos como
`--default-time-zone=-05:00`. Los *service containers* de GitHub **no aceptan argumentos**,
así que se hace lo mismo con SQL:

- `SET PERSIST time_zone = '-05:00'`: la hora de Colombia. Es importante: el backend calcula
  los cobros con la hora de Bogotá y algunas pruebas usan `NOW()` de MySQL; si MySQL
  estuviera en otra zona horaria, una entrada podría quedar "en el futuro".
- `utf8mb4`: para que tildes, ñ y emojis se guarden bien.
- `PERSIST` aplica el valor a **todas las conexiones nuevas** (y lo recuerda si MySQL se
  reinicia).
- El segundo `mysql` abre una conexión **nueva** para imprimir en el log los valores que
  quedaron. Ahí se puede comprobar que dice `-05:00` y `utf8mb4`.
- `MYSQL_PWD`: el cliente `mysql` lee la contraseña de esta variable. Así no aparece en la
  línea de comandos.

#### Paso 4: crear la base de pruebas

```yaml
      - name: Crear la base de pruebas con las migraciones
        env:
          MODO_MYSQL: directo
        run: ./database/scripts/recrear-bd-pruebas.sh
```

Es **el mismo script que se usa en local**. Con `MODO_MYSQL=directo` no usa `docker exec`:
se conecta con el cliente `mysql` a `DB_HOST:DB_PORT`. Hace esto:

1. Borra y crea `parqueadero_test` con `utf8mb4`.
2. Aplica **todas** las migraciones `database/migrations/V*.sql` en orden (tablas, catálogos,
   datos de prueba, vistas y triggers). Si una falla, se detiene y dice cuál.
3. Da permisos a `parqueadero_user` sobre `parqueadero_test`.
4. Imprime el resumen: "parqueadero_test tiene 15 tablas, 6 vistas y 12 triggers".

Esto también **prueba las migraciones**: si alguien agrega una `V010__...sql` con un error,
el CI falla en este paso.

#### Paso 4.1: verificar los permisos del rol de la aplicación

```yaml
      - name: Verificar los permisos del rol de la aplicación
        env:
          MODO_MYSQL: directo
        run: ./database/scripts/verificar-permisos.sh
```

Crea un usuario temporal que solo tiene `rol_aplicacion` (V009) y comprueba que lo que el
backend necesita funcione y lo demás responda `ERROR 1142` o `1143` (por ejemplo, borrar pagos,
escribir en la auditoría o `DROP TABLE`). Al final borra el usuario.

#### Paso 5: las pruebas del backend

```yaml
      - name: Pruebas del backend (unitarias + integración)
        working-directory: backend
        run: mvn -B verify -Pintegracion
```

- `working-directory: backend`: ejecuta el comando dentro de la carpeta `backend/`.
- `-B` (*batch mode*): salida sin colores ni barras de progreso, más fácil de leer en el log.
- `verify -Pintegracion`: compila y ejecuta las **551** pruebas (unitarias, base de datos,
  API y seguridad). En la API, cada clase de prueba levanta el servidor completo en un
  puerto libre de la máquina del job y le hace peticiones HTTP reales.

Si una sola prueba falla, Maven termina con error y el job queda en rojo.

### 6.4 Job `frontend`

```yaml
  frontend:
    name: frontend
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: frontend
```

`defaults.run.working-directory` hace que **todos** los comandos `run` de este job se
ejecuten dentro de `frontend/`.

```yaml
      - name: Descargar el código
        uses: actions/checkout@v7

      - name: Instalar Node 24 con caché de npm
        uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: frontend/package-lock.json
```

Instala Node 24 y guarda la caché de npm. `cache-dependency-path` le dice dónde está el
`package-lock.json`, porque no está en la raíz del repositorio.

```yaml
      - name: Instalar dependencias (exactas, del package-lock.json)
        run: npm ci
```

**`npm ci` en lugar de `npm install`:**

| `npm install` | `npm ci` |
|---|---|
| Puede actualizar versiones dentro de lo que permite `package.json` (`^19.3.1` acepta 19.4.0) | Instala **exactamente** las versiones del `package-lock.json` |
| Puede modificar el `package-lock.json` | Si `package.json` y `package-lock.json` no coinciden, **falla** |
| Pensado para desarrollar | Pensado para CI: resultado repetible |

Así, el CI prueba con las mismas versiones que tiene el equipo, y avisa si alguien cambió
`package.json` sin subir el `package-lock.json` actualizado.

```yaml
      - name: Lint (ESLint)
        run: npm run lint

      - name: Pruebas (Vitest, incluida la accesibilidad con axe-core)
        run: npm test -- --run

      - name: Compilación
        run: npm run build
```

- **Lint:** revisa reglas de calidad del código (variables sin usar, reglas de los hooks de
  React…). Un error de lint deja el job en rojo.
- **Pruebas:** las 411 pruebas de Vitest. `--run` hace que se ejecuten una vez y terminen
  (sin `--run`, Vitest se queda esperando cambios). Incluye `src/accesibilidad.test.jsx`,
  que revisa cada pantalla con axe-core.
- **Compilación:** comprueba que `npm run build` genera la versión de producción sin errores.

> En el CI no existe `frontend/.env.local`. No hace falta: las pruebas simulan
> `VITE_API_URL` por su cuenta, y la compilación no lo necesita para terminar.

### 6.5 ¿Cuánto tarda?

Los dos jobs corren **al mismo tiempo**, así que el total es lo que tarde el más lento. Cada
job gasta parte de su tiempo en preparar la máquina: instalar Java o Node, descargar
dependencias y, en `backend`, encender MySQL. Con la caché ya llena, las ejecuciones
siguientes son más rápidas que la primera. El tiempo exacto se ve en cada ejecución, en la
pestaña Actions.

---

## 7. Local y CI: diferencias

| Tema | En tu computador | En GitHub Actions |
|---|---|---|
| MySQL | `docker compose up -d` (contenedor `parqueadero-mysql`, se queda encendido) | *Service container* `mysql:8.4`, nuevo en cada ejecución |
| Credenciales | Archivo `.env` (no se sube) | Variables `env:` del workflow (solo para ese MySQL desechable) |
| Zona horaria y utf8mb4 | Argumentos en `docker-compose.yml` | `SET PERSIST` en el paso "Configurar MySQL" |
| Crear `parqueadero_test` | `./database/scripts/recrear-bd-pruebas.sh` (usa `docker exec`) | El mismo script con `MODO_MYSQL=directo` |
| Pruebas del backend | `mvn verify -Pintegracion` | `mvn -B verify -Pintegracion` |
| Instalar el frontend | `npm install` | `npm ci` |
| `.env.local` del frontend | Existe | No existe (no hace falta) |
| Pruebas E2E | `npm run test:e2e` | **No se ejecutan** |
| Máquina | La tuya, con tus programas | Una máquina limpia por job que se borra al terminar |

---

## 8. Cómo ver los resultados en GitHub

### 8.1 Pestaña Actions

1. Entrar al repositorio en GitHub y abrir la pestaña **Actions**.
2. A la izquierda, elegir el workflow **CI**. Se ve la lista de ejecuciones: el título del
   commit o del PR, la rama, quién lo disparó y un ícono de estado:
   - 🟡 amarillo (girando): en curso
   - ✅ verde: todo pasó
   - ❌ rojo: algo falló
   - ⊘ gris: cancelado (por ejemplo, porque llegó un push más nuevo)
3. Al abrir una ejecución se ven los dos jobs, **backend** y **frontend**, con su estado y
   duración.
4. Al abrir un job se ven sus pasos. Cada paso se despliega para leer su salida completa,
   la misma que verías en la terminal. El paso que falló aparece en rojo y abierto.

### 8.2 En un Pull Request

Al final de la conversación del PR aparece la caja de **checks**:

- "Some checks haven't completed yet": el CI sigue corriendo.
- "All checks have passed" ✅: los dos jobs pasaron.
- "Some checks were not successful" ❌: al menos uno falló. **Details** lleva al log.

En un PR desde una rama `feature/...` aparecen `CI / backend (pull_request)` y
`CI / frontend (pull_request)`. En el PR de `develop` hacia `main` aparecen además los
`(push)`, porque los pushes a `develop` también disparan el CI; para el PR cuentan los de
`pull_request`.

### 8.3 En los commits y en la insignia

- En la lista de commits de GitHub, cada commit lleva un ✅ o ❌ con el resultado del CI.
- La **insignia** al inicio del README muestra el estado del último CI de `develop`:
  *passing* (verde) o *failing* (rojo). Es la forma rápida de saber si `develop` está sano.

### 8.4 Volver a ejecutar

En una ejecución terminada, el botón **Re-run jobs** permite **Re-run failed jobs** (solo
los que fallaron) o **Re-run all jobs**. Sirve cuando un fallo fue por algo pasajero (una
descarga que falló, la máquina muy lenta). Si falla igual dos veces, no es casualidad: hay
que leer el log (sección 12).

---

## 9. Primera puesta en marcha (lo hace una persona)

Estos pasos se hacen **una sola vez**. Claude Code no los hace porque implican publicar en
GitHub.

1. **Subir `develop`:**

   ```bash
   git checkout develop
   git fetch origin
   git status                 # debe decir que develop va adelante de origin/develop
   git push origin develop
   ```

   Este push ya dispara el CI (evento `push` a `develop`).

2. **Ver la primera ejecución:** pestaña **Actions** → **CI** → la ejecución del push.
   Esperar a que `backend` y `frontend` terminen en verde.
   - Si GitHub muestra un aviso para habilitar los workflows, aceptarlo.
   - En Settings → Actions → General debe estar permitido ejecutar acciones (por defecto lo
     está). Las acciones que usa el proyecto son todas oficiales de GitHub (`actions/…`).

3. **Abrir un PR de prueba** de `develop` hacia `main`:
   https://github.com/San-0731/ParqueaderoProyBD/compare/main...develop?expand=1
   Comprobar que en el PR aparecen los checks `backend` y `frontend` en verde. (Este PR
   puede ser el de la versión 1.0.0; no hace falta fusionarlo todavía.)

4. **Hacer obligatorios los checks** (sección 10).

5. **Crear las etiquetas de bugs** (Issues → Labels → New label): `bug`, `crítico`, `alto`,
   `medio` y `bajo`. Las usa la plantilla de bugs (sección 14).

---

## 10. Hacer obligatorio el CI antes de fusionar

Que el CI esté en rojo solo **avisa**. Para que GitHub **impida** fusionar un PR con el CI
en rojo, hay que configurar una regla de protección de ramas.

> **Requisito:** los nombres `backend` y `frontend` solo aparecen para elegir **después** de
> que el CI haya corrido al menos una vez (paso 2 de la sección 9).

> **Ojo con el tipo de cuenta:** según la documentación de GitHub al escribir esta guía,
> las reglas de protección de ramas funcionan en repositorios **públicos** con cuenta
> gratuita; en repositorios **privados** necesitan GitHub Pro, Team o Education (el GitHub
> Student Developer Pack incluye GitHub Pro gratis para estudiantes). Si la opción aparece
> pero no se aplica, revisar esto.

### Opción A: *rulesets* (interfaz actual)

1. **Settings** → **Rules** → **Rulesets** (o **Settings** → **Branches** → **Add branch
   ruleset**).
2. **New ruleset** → **New branch ruleset**.
3. **Ruleset name:** `Proteger develop y main`. **Enforcement status:** `Active`.
4. **Target branches** → **Add target** → **Include by pattern**: `develop`; repetir con
   `main`.
5. En **Rules**, marcar:
   - **Restrict deletions** (nadie borra estas ramas).
   - **Require a pull request before merging** (no se sube directo; todo entra por PR).
   - **Require status checks to pass** → **Add checks** → buscar y agregar **`backend`** y
     **`frontend`**. Opcional: **Require branches to be up to date before merging** (el PR
     debe tener lo último de la rama destino; más seguro, pero obliga a actualizar el PR
     más seguido).
   - **Block force pushes**.
6. **Create**.

### Opción B: regla clásica

1. **Settings** → **Branches** → **Add classic branch protection rule**.
2. **Branch name pattern:** `develop` (después crear otra igual para `main`).
3. Marcar **Require a pull request before merging** y **Require status checks to pass before
   merging**, y en el buscador agregar `backend` y `frontend`.
4. **Create**.

### Qué cambia después

- El botón **Merge pull request** queda gris mientras el CI no esté en verde.
- Ya no se puede hacer `git push origin develop` directo: todo entra por PR. (Por eso el
  paso 1 de la sección 9 se hace **antes** de crear la regla.)
- Los administradores pueden saltarse la regla solo si la configuración lo permite. Lo
  recomendable es no hacerlo.

> La interfaz de GitHub cambia con el tiempo: si un nombre no coincide exactamente, buscar
> la opción equivalente ("branch protection", "required status checks").

---

## 11. El día a día con el CI

El flujo de ramas del README, con el CI incluido:

```
1. git checkout develop && git pull
2. git checkout -b feature/mi-cambio
3. ...programar...
4. Correr en local lo que toca (ahorra vueltas):
     backend:  cd backend && mvn clean package
               (si tocaste SQL, DAO o servicios: recrear-bd-pruebas.sh + mvn verify -Pintegracion)
     frontend: cd frontend && npm run lint && npm test -- --run
5. git commit (Conventional Commits) y git push -u origin feature/mi-cambio
6. Abrir el PR hacia develop
        │
        ▼
   GitHub ejecuta el CI sobre "develop + tu PR"
        │
   ┌────┴────┐
   ✅        ❌ → leer el log, corregir, nuevo commit y push → el CI corre otra vez
   │
7. Revisión del equipo y Merge
        │
        ▼
   El merge es un push a develop → el CI corre otra vez sobre develop (insignia)
8. Antes de pasar develop a main: correr también las E2E en local (npm run test:e2e)
```

Buenas costumbres:

- **No fusionar con el CI en rojo**, aunque "seguro es otra cosa".
- Si el CI falla por algo que no tocaste, avisar al equipo: quizá `develop` ya estaba roto.
- Un PR pequeño se revisa y se prueba más rápido que uno gigante.

---

## 12. Cuando el CI falla

### 12.1 Cómo leer el error

1. Abrir el job en rojo y el paso en rojo.
2. Bajar hasta el **primer** error: los siguientes suelen ser consecuencia de ese.
3. Según el paso:
   - **Maven:** buscar `[ERROR] Failures:` o `[ERROR] Errors:` y la línea
     `Tests run: X, Failures: Y`. Indica la clase y el método de la prueba
     (`RestriccionesTest.identificadorDuplicadoFalla`), el valor esperado (`expected`) y el
     que llegó (`but was`).
   - **Vitest:** buscar `FAIL` y el nombre del archivo y de la prueba, con la diferencia
     entre lo esperado y lo recibido.
   - **ESLint:** archivo, línea, columna y el nombre de la regla.
4. **Reproducirlo en local** con el mismo comando (sección 13), corregir, commit y push.

### 12.2 Problemas comunes

| Dónde falla | Mensaje típico | Causa probable | Qué hacer |
|---|---|---|---|
| `npm ci` | `npm ci can only install packages when your package.json and package-lock.json ... are in sync` | Se agregó o cambió una dependencia y no se subió el `package-lock.json` | `cd frontend && npm install`, y hacer commit del `package-lock.json` |
| Lint | `error  'x' is assigned a value but never used` | Código con un problema de calidad | `npm run lint` en local, corregir; `npm run format` para el formato |
| Vitest | `Test timed out in 5000ms` (casi siempre en `accesibilidad.test.jsx`) | Máquina lenta en ese momento: axe-core es pesado | **Re-run failed jobs**. Si se repite siempre, revisar la prueba |
| Vitest | `AssertionError` / `Unable to find role=...` | Un cambio en una pantalla rompió lo que la prueba espera | Correr esa prueba en local: `npm test -- --run src/pages/...` |
| Crear la base | `ERROR: Falló la migración V006__...sql` | Error de SQL en una migración nueva | Probar en local con `./database/scripts/recrear-bd-pruebas.sh`; corregir la migración (si **no** se ha fusionado aún) |
| Configurar MySQL | `Can't connect to MySQL server on '127.0.0.1:3306'` | MySQL no terminó de arrancar o el servicio falló | Re-run; si se repite, revisar la sección `services` del workflow |
| Maven | `Access denied for user 'parqueadero_user'` | Las claves de `env:` y de `services.mysql.env` no coinciden | Deben ser iguales en los dos bloques |
| Maven | `Las pruebas de integración solo usan una base que termine en _test` | `DB_NAME` no termina en `_test` | El perfil la fija; revisar que no se haya cambiado en `pom.xml` |
| Maven | Una prueba de cobro o de fechas falla con horas raras ("la entrada ... es posterior a la hora actual") | MySQL quedó en otra zona horaria | Revisar en el log del paso "Configurar MySQL" que diga `-05:00` |
| Maven | `Tests run: ..., Failures: 1` en una prueba de `bd/` o `api/` | Un cambio en el SQL, un DAO o un servicio rompió una regla | Reproducir en local con `mvn verify -Pintegracion -Dtest=NombreDeLaClase` |
| Cualquiera | Job **cancelado** (gris) | Llegó un push más nuevo al mismo PR o rama (`concurrency`) | Nada: la ejecución nueva es la que cuenta |
| Cualquiera | `The job running on runner ... has exceeded the maximum execution time` | Algo se quedó colgado | Revisar el último paso que imprimió algo |

### 12.3 Pruebas "inestables" (*flaky*)

Una prueba inestable falla a veces sin que el código haya cambiado. Volver a ejecutar sirve
**una** vez. Si la misma prueba falla de vez en cuando, hay que arreglarla (más tiempo de
espera, datos únicos, no depender del orden), porque un CI que falla "porque sí" termina
siendo ignorado por el equipo.

---

## 13. Reproducir el CI en tu computador

Cuando el CI falla y en tu computador todo pasa, la diferencia suele ser el entorno. Estas
recetas imitan lo que hace GitHub. Así se probó el workflow antes de subirlo.

### 13.1 Job `backend` con un MySQL desechable

Usa un contenedor aparte en el puerto **3399**, así no toca tu MySQL de desarrollo:

```bash
# 1. MySQL igual al del CI (sin argumentos de zona horaria, como en GitHub)
docker run -d --rm --name parqueadero-ci-simulacion -p 3399:3306 \
  -e MYSQL_ROOT_PASSWORD=clave_root_solo_ci -e MYSQL_DATABASE=parqueadero \
  -e MYSQL_USER=parqueadero_user -e MYSQL_PASSWORD=clave_app_solo_ci \
  -e TZ=America/Bogota mysql:8.4
# Esperar a que responda por TCP (unos 20 segundos). Con -h 127.0.0.1: mientras se
# inicializa, la imagen enciende un MySQL temporal sin red que respondería por el socket.
until docker exec parqueadero-ci-simulacion mysqladmin ping -h 127.0.0.1 -uroot -pclave_root_solo_ci --silent; do sleep 2; done

# 2. Las mismas variables que el job
export DB_HOST=127.0.0.1 DB_PORT=3399 DB_NAME=parqueadero_test DB_USER=parqueadero_user \
       DB_PASSWORD=clave_app_solo_ci DB_ROOT_PASSWORD=clave_root_solo_ci

# 3. Paso "Configurar MySQL"
MYSQL_PWD=$DB_ROOT_PASSWORD mysql -h 127.0.0.1 -P 3399 --protocol=TCP -uroot -e "
  SET PERSIST time_zone = '-05:00';
  SET PERSIST character_set_server = 'utf8mb4';
  SET PERSIST collation_server = 'utf8mb4_unicode_ci';"

# 4. Paso "Crear la base de pruebas"
MODO_MYSQL=directo ./database/scripts/recrear-bd-pruebas.sh

# 5. Paso "Pruebas del backend"
cd backend && mvn -B verify -Pintegracion && cd ..

# 6. Apagar y borrar el contenedor (--rm lo borra al detenerlo)
docker stop parqueadero-ci-simulacion
unset DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD DB_ROOT_PASSWORD
```

Requiere el cliente `mysql` instalado en el computador (en Kali o Ubuntu:
`sudo apt install default-mysql-client`).

### 13.2 Job `frontend` en una copia limpia

`git archive` saca una copia de lo que está **en el último commit**, sin `node_modules` ni
`.env.local`, igual que el checkout de GitHub:

```bash
rm -rf /tmp/ci-frontend && mkdir -p /tmp/ci-frontend
git archive HEAD frontend | tar -x -C /tmp/ci-frontend
cd /tmp/ci-frontend/frontend
npm ci && npm run lint && npm test -- --run && npm run build
```

Si aquí falla y en tu carpeta normal no, lo más probable es que falte subir un archivo, o
que dependas de algo que solo tienes tú (por ejemplo `.env.local`).

---

## 14. Bugs: del issue a la corrección

El CI y las pruebas manuales encuentran errores. El ciclo para corregirlos:

1. **Reportar:** en GitHub, **Issues** → **New issue** → plantilla **Reporte de bug**
   ([`.github/ISSUE_TEMPLATE/bug.md`](../.github/ISSUE_TEMPLATE/bug.md)). Llenar los pasos
   para reproducir, el resultado esperado y el obtenido, capturas, el caso de prueba
   relacionado (por ejemplo `CP-RF07-05`) y una etiqueta de severidad: `crítico`, `alto`,
   `medio` o `bajo`.
2. **Corregir:** rama `fix/<numero>-<descripcion>` desde `develop`. Primero se escribe una
   **prueba automática que reproduzca el bug y falle**; después se corrige el código; al
   final se confirma que la prueba pasa. Así el bug no vuelve a aparecer sin que el CI lo
   note.
3. **Pull Request** hacia `develop` con `Closes #N` en la descripción (N = número del
   issue). El CI debe pasar. Al fusionar, GitHub cierra el issue solo.
4. **Verificar:** el equipo de testing vuelve a ejecutar el caso manual y lo marca como
   aprobado.

---

## 15. Mejoras posibles

No están hechas; quedan como ideas si el proyecto crece:

| Mejora | Para qué |
|---|---|
| Subir los reportes como *artifacts* (`actions/upload-artifact`) | Descargar desde GitHub los reportes de Surefire o de cobertura de una ejecución |
| Correr las E2E en el CI | Encender MySQL (servicio), el backend (`java -jar ... &`) y Playwright con `npx playwright install --with-deps chromium`. Tardaría unos minutos más por ejecución |
| Dependabot | PR automáticos cuando salgan versiones nuevas de las dependencias y de las acciones |
| Guardar las claves del CI como *secrets* | Que ni siquiera las claves del MySQL desechable queden escritas en el archivo |

---

## 16. Preguntas frecuentes (sustentación)

**¿Por qué las pruebas de integración usan otra base de datos?**
Porque crean, modifican y borran datos. Si usaran `parqueadero`, ensuciarían los datos con
los que trabaja el equipo. `parqueadero_test` se puede borrar y crear de nuevo en segundos
con el script, y hay dos protecciones: las pruebas se niegan a correr y el script se niega a
borrar si el nombre no termina en `_test`.

**¿Por qué las pruebas de la base terminan en `rollback()`?**
Cada prueba abre una transacción, inserta lo que necesita, comprueba la regla y deshace
todo. La base queda igual que antes, así las pruebas no dependen unas de otras ni del orden
en que se ejecuten.

**¿Qué demuestra la prueba de concurrencia?**
Que si dos operarios cobran la salida del mismo vehículo al mismo tiempo, solo se registra
un pago. El servicio lee el registro con `SELECT ... FOR UPDATE`, que lo bloquea hasta
terminar la transacción. Se comprobó también al revés: al quitar temporalmente el `FOR
UPDATE`, la prueba falló las 3 veces que se ejecutó.

**¿Cómo sabemos que las pruebas detectan errores de verdad y no pasan siempre?**
Se hicieron pruebas de "sabotaje": se rompió algo a propósito (se borró un trigger, se quitó
el `FOR UPDATE`), se comprobó que las pruebas fallaban y luego se restauró el código.

**¿Por qué las E2E no corren en GitHub?**
Necesitan tres cosas encendidas al mismo tiempo (MySQL, el backend y el servidor de Vite) y
un navegador. Además, tres de ellas esperan más de un minuto, porque el backend no cobra el
primer minuto. Se decidió correrlas en local antes de pasar `develop` a `main`. Se pueden
agregar al CI más adelante (sección 15).

**¿Qué pasa si alguien sube código que rompe una prueba?**
El CI se pone en rojo en el PR y en el commit. Con la regla de la sección 10, GitHub no deja
fusionar ese PR hasta que se corrija.

**¿El CI usa las contraseñas reales?**
No. Usa claves que solo existen dentro de un MySQL desechable que GitHub crea para cada
ejecución y destruye al terminar. Las claves reales están en el `.env` de cada computador,
que nunca se sube.

**¿Por qué `npm ci` y no `npm install`?**
Porque instala exactamente las versiones del `package-lock.json` y falla si no coincide con
`package.json`. Así el CI prueba lo mismo que tiene el equipo.

**¿Qué es el ✅ que aparece junto a los commits?**
El resultado del CI para ese commit: los jobs `backend` y `frontend` pasaron.

---

## 17. Glosario

| Término | Significado |
|---|---|
| **CI** (integración continua) | Ejecutar automáticamente las pruebas cada vez que se sube código |
| **GitHub Actions** | El servicio de CI incluido en GitHub |
| **Workflow** | Archivo YAML en `.github/workflows/` que describe qué ejecutar y cuándo |
| **Job** | Grupo de pasos que corre en una máquina; los jobs de un workflow van en paralelo |
| **Step** | Un paso de un job: un comando (`run`) o una acción (`uses`) |
| **Runner** | Máquina virtual de GitHub que ejecuta un job (`ubuntu-latest`) |
| **Service container** | Contenedor que GitHub enciende junto al job (aquí, MySQL) |
| **Health check** | Comando que comprueba si un servicio ya está listo |
| **Status check** | Resultado ✅/❌ de un job, visible en commits y PR |
| **Ruleset / branch protection** | Regla de GitHub que impide fusionar si los checks no pasan |
| **Badge** | Insignia del README con el estado del CI |
| **Perfil de Maven** | Configuración alternativa que se activa con `-P` (aquí, `-Pintegracion`) |
| **`@Tag("integracion")`** | Marca de JUnit para las pruebas que necesitan MySQL |
| **Migración** | Archivo `V{n}__descripcion.sql` que cambia el esquema de la base |
| **E2E** | Prueba de extremo a extremo: un navegador real usa la app completa |
| **Flaky** | Prueba inestable: a veces pasa y a veces falla sin cambios en el código |
| **Rollback** | Deshacer todo lo que hizo una transacción |
| **`FOR UPDATE`** | Lectura que bloquea la fila hasta el final de la transacción |
| **Lockfile** (`package-lock.json`) | Archivo con las versiones exactas de cada dependencia instalada |
