# Guía de Docker para el proyecto

Guía para quien empieza a trabajar con contenedores. Explica qué es Docker,
cómo encenderlo y apagarlo, cómo se usa Docker Compose en este proyecto y
responde las dudas más comunes. Todo está pensado para la base de datos del
parqueadero (MySQL 8.4 en el contenedor `parqueadero-mysql`).

---

## 1. ¿Qué es Docker?

Docker permite ejecutar programas dentro de **contenedores**: cajas aisladas
que traen el programa y todo lo que necesita para funcionar. En este proyecto
lo usamos para tener MySQL **sin instalarlo en el computador**. Todo el equipo
usa exactamente la misma versión y la misma configuración.

Analogía con Java:

| Java | Docker |
|---|---|
| Una **clase** (el molde) | Una **imagen** (por ejemplo `mysql:8.4`) |
| Un **objeto** creado con `new` | Un **contenedor** creado a partir de la imagen |
| Se pueden crear muchos objetos de una clase | Se pueden crear muchos contenedores de una imagen |

### Cómo encajan las piezas

```
Tu computador
└── docker.service   ← el ÚNICO servicio que se enciende con systemctl
    │                  (el "motor" de Docker)
    ├── contenedor parqueadero-mysql      (creado con la imagen mysql:8.4)
    │     └── guarda los datos en el volumen parqueaderoproybd_mysql_data
    ├── contenedor de otro proyecto...
    └── ...
```

El motor de Docker se enciende **una sola vez**. Todos los contenedores
(uno, dos o veinte) corren dentro de ese mismo motor.

---

## 2. Glosario

| Término | Qué significa |
|---|---|
| **Docker Engine** (motor, *daemon*, `dockerd`) | El programa de fondo que crea y ejecuta los contenedores. En Linux es el servicio `docker`. Si está apagado, ningún comando `docker` funciona. |
| **Imagen** | Plantilla de solo lectura con un programa ya instalado y configurado (por ejemplo, MySQL). Se descarga una vez y queda guardada en el equipo. |
| **Tag** (etiqueta) | La versión de una imagen, lo que va después de los dos puntos: en `mysql:8.4` la imagen es `mysql` y el tag es `8.4`. |
| **Contenedor** | Un programa en ejecución creado a partir de una imagen. Se puede encender, apagar y borrar. Borrarlo **no** borra la imagen. |
| **Docker Hub** (registro) | La "tienda" en internet de donde Docker descarga las imágenes. |
| **Docker Compose** | Herramienta para describir uno o varios contenedores en un archivo (`docker-compose.yml`) y manejarlos con un solo comando. |
| **`docker-compose.yml`** | El archivo de Compose. En este proyecto está en la raíz del repositorio. |
| **Servicio (de Compose)** | Cada bloque dentro de `services:` en el `docker-compose.yml`. Aquí hay uno: `mysql`. **No es lo mismo** que un servicio de `systemctl` (ver la pregunta 7.1). |
| **Proyecto (de Compose)** | El grupo de contenedores, redes y volúmenes de un `docker-compose.yml`. Por defecto se llama como la carpeta: aquí, `parqueaderoproybd`. |
| **Volumen** | Espacio de almacenamiento que maneja Docker y que **sobrevive** aunque el contenedor se borre. Aquí guarda los datos de MySQL (`mysql_data`). Sin volumen, los datos se perderían al borrar el contenedor. |
| **Montaje de carpeta** (*bind mount*) | Conecta una carpeta de tu computador con una carpeta del contenedor. Aquí, `database/migrations` se ve dentro del contenedor para que MySQL ejecute los scripts. |
| **Puerto / mapeo de puertos** | `"3307:3306"` significa: lo que llegue al puerto 3307 **de tu computador** se envía al puerto 3306 **del contenedor**. El primer número es el de afuera y el segundo el de adentro. |
| **Red** (*network*) | Compose crea una red privada (`parqueaderoproybd_default`) para que los contenedores del proyecto se comuniquen entre sí usando el nombre del servicio. |
| **Variables de entorno** | Valores de configuración que recibe el contenedor (usuario, contraseña, nombre de la base). Compose las toma del archivo `.env`. |
| **`.env`** | Archivo con tus valores reales (contraseñas, puertos). **No se sube a Git**; se crea copiando `.env.example`. |
| **`-d`** (*detached*, segundo plano) | Arranca los contenedores y te devuelve la terminal. Sin `-d`, la terminal se queda mostrando los logs. |
| **Logs** | Los mensajes que imprime el programa del contenedor. Sirven para ver errores y saber si MySQL ya está listo. |
| **Política de reinicio** | `restart: unless-stopped`: el contenedor arranca solo cada vez que arranca Docker, **salvo** que lo hayas detenido tú a mano. |

### Tres nombres que se confunden

| Nombre | Qué es | Dónde se usa |
|---|---|---|
| `mysql` | El **servicio** en el `docker-compose.yml` | Comandos `docker compose ...` (por ejemplo `docker compose logs mysql`) |
| `parqueadero-mysql` | El **contenedor** (`container_name`) | Comandos `docker ...` (por ejemplo `docker logs parqueadero-mysql`) |
| `mysql:8.4` | La **imagen** de la que sale el contenedor | La línea `image:` del `docker-compose.yml` |

---

## 3. El servicio Docker: encender y apagar el motor

### En Linux

```bash
systemctl is-active docker        # "active" = encendido, "inactive" = apagado
sudo systemctl start docker       # encender
sudo systemctl stop docker docker.socket   # apagar
sudo systemctl restart docker     # reiniciar
```

> Al apagar hay que detener también `docker.socket`. Si no se detiene, Docker
> se vuelve a encender solo en cuanto alguien ejecuta un comando `docker`.

Arranque automático al prender el computador:

```bash
systemctl is-enabled docker       # "enabled" = arranca solo al encender el PC
sudo systemctl enable docker      # activar el arranque automático
sudo systemctl disable docker     # desactivarlo (habrá que encenderlo a mano)
```

**Usar `docker` sin `sudo`:** el usuario debe estar en el grupo `docker`.

```bash
id -nG | grep -w docker           # si aparece "docker", ya estás en el grupo
sudo usermod -aG docker $USER     # agregarte (después cierra sesión y vuelve a entrar)
```

> Estar en el grupo `docker` da permisos casi de administrador sobre el equipo.
> Es normal en un computador personal, pero no se hace en servidores compartidos.

### En Windows o Mac

Ahí no existe `systemctl`. El "servicio" es la aplicación **Docker Desktop**:

- **Encender:** abrir Docker Desktop y esperar a que diga que el motor está
  corriendo (*Engine running*).
- **Apagar:** clic derecho en el ícono de la ballena → *Quit Docker Desktop*.
- **Arranque automático:** en *Settings → General*, la opción de iniciar
  Docker Desktop al iniciar sesión.

Los comandos `docker compose ...` de las siguientes secciones son **iguales**
en todos los sistemas operativos.

---

## 4. El `docker-compose.yml` del proyecto, línea por línea

```yaml
services:
  mysql:                          # nombre del servicio
    image: mysql:8.4              # imagen y versión (MySQL 8.4 LTS)
    container_name: parqueadero-mysql   # nombre fijo del contenedor
    restart: unless-stopped       # arranca solo con Docker, salvo que lo detengas tú
    environment:                  # variables que recibe MySQL (vienen del .env)
      MYSQL_DATABASE: ${DB_NAME}          # base que se crea la primera vez
      MYSQL_USER: ${DB_USER}              # usuario de la aplicación
      MYSQL_PASSWORD: ${DB_PASSWORD}      # su contraseña
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}   # contraseña del administrador
      TZ: America/Bogota          # zona horaria del contenedor
    command:                      # opciones extra para el servidor MySQL
      - --character-set-server=utf8mb4        # soporta tildes, ñ y emojis
      - --collation-server=utf8mb4_unicode_ci
      - --default-time-zone=-05:00            # hora de Colombia
    ports:
      - "${DB_PORT}:3306"         # puerto de tu PC (DB_PORT) → puerto 3306 del contenedor
    volumes:
      - mysql_data:/var/lib/mysql # volumen: aquí MySQL guarda los datos
      - ./database/migrations:/docker-entrypoint-initdb.d:ro
                                  # carpeta de migraciones; ":ro" = solo lectura

volumes:
  mysql_data:                     # declara el volumen (Docker lo llama parqueaderoproybd_mysql_data)
```

**Dato clave:** MySQL ejecuta los scripts de `docker-entrypoint-initdb.d` (las
migraciones V001, V002, ...) **solo la primera vez**, cuando el volumen está
vacío. Si el volumen ya tiene datos, no los vuelve a ejecutar (ver la pregunta
7.7).

---

## 5. Comandos de Docker Compose

Se ejecutan **desde la raíz del repositorio** (donde está `docker-compose.yml`).

### Encender y apagar

| Comando | Qué hace | ¿Se pierden los datos? |
|---|---|---|
| `docker compose up -d` | Crea (si hace falta) y enciende los contenedores en segundo plano. Si ya están encendidos, no hace nada. | No |
| `docker compose stop` | Apaga los contenedores. Siguen existiendo, solo detenidos. | No |
| `docker compose start` | Vuelve a encender lo que se apagó con `stop`. | No |
| `docker compose restart` | Apaga y vuelve a encender. | No |
| `docker compose down` | Apaga **y borra** los contenedores y la red. El volumen se conserva. | No |
| `docker compose down -v` | Igual que `down`, pero **también borra el volumen**. | ⚠️ **Sí, todos** |

> ⚠️ `docker compose down -v` deja la base vacía. En el siguiente `up -d`,
> MySQL ejecuta otra vez las migraciones desde cero. Úsalo solo cuando quieras
> reiniciar la base a propósito (por ejemplo, antes de las pruebas).

### Ver qué está pasando

```bash
docker compose ps            # contenedores encendidos del proyecto ("Up ..." = encendido)
docker compose ps -a         # incluye también los apagados
docker compose logs mysql    # mensajes de MySQL
docker compose logs -f mysql # mensajes en vivo (salir con Ctrl+C; el contenedor sigue encendido)
```

MySQL tarda unos segundos en arrancar. Está listo cuando en los logs aparece
`ready for connections`.

### Entrar a la consola de MySQL dentro del contenedor

```bash
docker compose exec mysql mysql -u parqueadero_user -p parqueadero
```

Cambia `parqueadero_user` y `parqueadero` por el `DB_USER` y el `DB_NAME` de
tu `.env`. Pide la contraseña (`DB_PASSWORD`). Para salir: `exit`.

`docker compose exec <servicio> <comando>` ejecuta un comando **dentro** del
contenedor. Así no hace falta tener instalado el cliente de MySQL en tu
computador.

### Actualizar la imagen

```bash
docker compose pull          # descarga la versión más reciente del tag (8.4.x)
docker compose up -d         # recrea el contenedor con la imagen nueva (los datos se conservan)
```

---

## 6. Comandos generales de Docker

Estos comandos muestran **todo** lo que hay en Docker, no solo este proyecto:

```bash
docker ps                    # todos los contenedores encendidos
docker ps -a                 # todos, incluidos los apagados
docker images                # imágenes descargadas
docker volume ls             # volúmenes
docker stats                 # consumo de CPU y RAM en vivo (salir con Ctrl+C)
docker system df             # cuánto disco ocupa Docker
```

---

## 7. Preguntas frecuentes

### 7.1 Si creo dos contenedores, ¿tengo que encender dos servicios con `systemctl`?

**No.** `systemctl` solo enciende el **motor** de Docker (`docker.service`), y
hay uno solo por computador. Todos los contenedores corren dentro de ese motor:

```
sudo systemctl start docker     ← una vez (o automático al prender el PC)
docker compose up -d            ← enciende TODOS los servicios del docker-compose.yml
```

La confusión viene de que la palabra "servicio" significa dos cosas:

- **Servicio de `systemctl`:** un programa del sistema operativo, como `docker`.
- **Servicio de Compose:** cada bloque de `services:` en el `docker-compose.yml`, como `mysql`.

### 7.2 ¿Cómo creo varios contenedores?

**Opción A: varios servicios en el mismo `docker-compose.yml`.** Se agrega
otro bloque dentro de `services:`. Por ejemplo, una segunda base solo para
pruebas (**es un ejemplo; no está en el proyecto**):

```yaml
services:
  mysql:
    # ... (lo que ya existe)

  mysql-pruebas:                        # otro servicio
    image: mysql:8.4                    # puede usar la misma imagen
    container_name: parqueadero-mysql-pruebas   # nombre DISTINTO
    environment:
      MYSQL_DATABASE: parqueadero_pruebas
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    ports:
      - "3308:3306"                     # puerto de afuera DISTINTO
    volumes:
      - mysql_pruebas_data:/var/lib/mysql   # volumen DISTINTO

volumes:
  mysql_data:
  mysql_pruebas_data:
```

Con eso:

```bash
docker compose up -d                  # enciende los dos
docker compose up -d mysql-pruebas    # enciende solo uno
docker compose stop mysql-pruebas     # apaga solo uno
```

**Opción B: otro proyecto en otra carpeta** con su propio `docker-compose.yml`.
Cada carpeta es un proyecto independiente: `docker compose` solo afecta al
proyecto de la carpeta donde lo ejecutas. `docker ps` sí muestra todos.

### 7.3 ¿Dos contenedores pueden usar el mismo puerto?

**Adentro sí y afuera no.** Los dos MySQL escuchan en el 3306 dentro de su
contenedor, pero el puerto de **tu computador** (el número de la izquierda en
`ports`) debe ser distinto: 3307 para uno y 3308 para el otro.

### 7.4 ¿Dos contenedores pueden compartir un volumen?

Técnicamente sí, pero **nunca dos MySQL con el mismo volumen de datos**: los
dos escribirían los mismos archivos al mismo tiempo y dañarían la base. Cada
base de datos lleva su propio volumen.

### 7.5 Si ejecuto `docker compose up -d` dos veces, ¿se crean dos contenedores?

No. Compose compara lo que está corriendo con lo que dice el archivo. Si ya
está encendido e igual, no hace nada. Si cambiaste el `docker-compose.yml`,
recrea solo lo que cambió.

### 7.6 Si apago el computador, Docker o el contenedor, ¿pierdo los datos?

No. Los datos viven en el volumen, que solo se borra con `docker compose down -v`
o `docker volume rm`. Gracias a `restart: unless-stopped`, MySQL vuelve a
arrancar solo cuando arranca Docker, salvo que lo hubieras apagado con
`docker compose stop`.

### 7.7 Agregué una migración nueva (por ejemplo V006) y no se aplicó

Es lo esperado. Las migraciones se ejecutan **solo cuando el volumen está
vacío** (la primera vez). Para aplicarla tienes dos caminos:

- **Conservar los datos:** ejecutar el script a mano desde el cliente SQL, o
  desde la terminal:
  ```bash
  docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < database/migrations/V006__....sql
  ```
  - `-T` es necesario porque la entrada viene de un archivo y no del teclado.
  - `$MYSQL_ROOT_PASSWORD` y `$MYSQL_DATABASE` son variables que ya existen
    **dentro** del contenedor, así que no hay que escribir la contraseña. Las
    comillas simples hacen que se lean adentro y no en tu terminal.
  - Sale el aviso `Using a password on the command line interface can be
    insecure`. Es normal y se puede ignorar.
  - No sirve usar `-p` para que pida la contraseña: la pregunta lee el archivo
    en vez del teclado y el resultado es `Access denied`.
- **Reiniciar la base:** `docker compose down -v` y `docker compose up -d`.
  **Se pierden los datos** y se ejecutan todas las migraciones desde cero.

### 7.8 Cambié la contraseña o el usuario en el `.env` y ahora no conecta

Por la misma razón que la pregunta anterior: `MYSQL_USER`, `MYSQL_PASSWORD`,
`MYSQL_DATABASE` y `MYSQL_ROOT_PASSWORD` **solo se usan la primera vez**.
Después, MySQL sigue usando los valores con los que se creó. Puedes volver a
poner los valores anteriores en el `.env` o reiniciar la base con
`docker compose down -v` (se pierden los datos).

### 7.9 ¿Necesito instalar MySQL en mi computador?

No. El servidor MySQL está dentro del contenedor. Solo necesitas un
**cliente** para ver los datos (DBeaver, MySQL Workbench, la extensión Database
Client de VS Code) o usar `docker compose exec` (sección 5).

### 7.10 ¿Qué diferencia hay entre `docker-compose` (con guion) y `docker compose`?

`docker-compose` es la versión 1, antigua y sin soporte. `docker compose` (con
espacio) es la actual y viene incluida en Docker. Usa siempre la segunda.

### 7.11 `docker compose ps` no muestra nada

Puede ser por una de estas razones:

- El contenedor está apagado: revisa con `docker compose ps -a`.
- No estás en la raíz del repositorio (donde está `docker-compose.yml`).
- El motor de Docker está apagado (ver sección 3).

### 7.12 En `docker compose ps` aparece `33060/tcp`, ¿qué es?

Es otro puerto que MySQL abre para una forma de conexión que no usamos (el
*X Protocol*). Aparece sin flecha (`->`) porque no está conectado a ningún
puerto de tu computador. Se puede ignorar.

### 7.13 ¿Consume recursos si lo dejo encendido?

Un poco: MySQL usa unos cientos de MB de RAM aunque nadie lo esté usando. Lo
puedes ver con `docker stats`. Si necesitas liberar memoria, apágalo con
`docker compose stop` y enciéndelo con `docker compose start` cuando lo
necesites.

---

## 8. Errores comunes

| Mensaje | Causa | Solución |
|---|---|---|
| `Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?` | El motor de Docker está apagado | `sudo systemctl start docker` (o abrir Docker Desktop) |
| `permission denied while trying to connect to the Docker daemon socket` | Tu usuario no está en el grupo `docker` | `sudo usermod -aG docker $USER` y volver a iniciar sesión (sección 3) |
| `port is already allocated` o `address already in use` | El puerto `DB_PORT` ya lo usa otro programa (por ejemplo, un MySQL instalado en el PC u otro contenedor) | Cambiar `DB_PORT` en el `.env` (por ejemplo, a 3307) y ejecutar `docker compose up -d` |
| `Access denied for user ...` | Usuario o contraseña distintos a los de la creación de la base | Ver la pregunta 7.8 |
| `no configuration file provided: not found` | El comando no se ejecutó en la raíz del repositorio | `cd` a la carpeta que tiene `docker-compose.yml` |

---

## 9. Resumen rápido

```bash
# ¿Está todo encendido?
systemctl is-active docker        # motor (Linux)
docker compose ps                 # contenedor del proyecto

# Uso diario
docker compose up -d              # encender MySQL
docker compose stop               # apagar MySQL (sin perder datos)
docker compose logs -f mysql      # ver qué está pasando
docker compose exec mysql mysql -u parqueadero_user -p parqueadero   # consola SQL

# Reiniciar la base desde cero (⚠️ borra todos los datos)
docker compose down -v
docker compose up -d
```
