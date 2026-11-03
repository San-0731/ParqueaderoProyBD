# Sistema de Parqueadero

Aplicación para registrar y controlar los vehículos que solicitan parqueo:
información de los vehículos, tiempos de parqueo, ubicaciones (espacios),
fechas de parqueo y formas de pago (PSE, Nequi, Daviplata y efectivo).

Proyecto académico de la materia **Bases de Datos**.

## Tecnologías

| Capa          | Tecnología                                                             |
|---------------|------------------------------------------------------------------------|
| Base de datos | MySQL 8 (con Docker)                                                   |
| Backend       | Java 21 sin frameworks: `com.sun.net.httpserver.HttpServer` + JDBC puro |
| Frontend      | React + Vite + Tailwind CSS                                            |

## Requisitos

- [Java 21](https://adoptium.net/) (JDK)
- [Maven](https://maven.apache.org/) 3.9 o superior
- [Node.js](https://nodejs.org/) 24.15 o superior (incluye npm)
- [Docker](https://www.docker.com/) con Docker Compose

Extensiones de VS Code recomendadas: al abrir el proyecto, VS Code las sugiere
automáticamente (ver `.vscode/extensions.json`).

## Estructura de carpetas

```
.
├── database/
│   └── migrations/     # Migraciones SQL versionadas (V{n}__descripcion.sql)
├── backend/            # Proyecto Maven (config, model, dao, service, handler, util)
├── frontend/           # Proyecto React + Vite + Tailwind CSS
├── .vscode/            # Extensiones recomendadas para el equipo
├── docker-compose.yml  # MySQL 8 (se crea en la Fase 1; usa el .env de la raíz)
├── .editorconfig       # Formato común: UTF-8, LF, indentación
├── .env.example        # Plantilla de variables de entorno
├── CLAUDE.md           # Reglas del proyecto
└── LICENSE             # Licencia GNU GPL v3
```

> Los cambios de esquema van **solo** en archivos nuevos dentro de
> `database/migrations/`. Nunca se modifica una migración ya existente.

## Flujo de ramas

```
main      ← versión estable / entregable
  └── develop   ← rama de integración
        ├── feature/<descripcion>   ← funcionalidades nuevas
        └── fix/<descripcion>       ← correcciones
```

1. Actualizar `develop`: `git checkout develop && git pull`
2. Crear la rama: `git checkout -b feature/registro-vehiculos`
3. Hacer commits pequeños con [Conventional Commits](https://www.conventionalcommits.org/es/):
   - `feat: agregar registro de vehículos`
   - `fix: corregir cálculo de tarifa`
   - `docs: actualizar README`
   - `refactor:`, `test:`, `chore:`
4. Subir la rama y abrir un Pull Request hacia `develop`.
5. Cuando `develop` esté estable, se integra en `main`.

## Cómo ejecutar

### 1. Variables de entorno

Primer paso común: copiar la plantilla de variables de entorno y ajustar los valores.

```bash
cp .env.example .env
```

### 2. Base de datos

Desde la raíz del repositorio (la primera vez crea las tablas y carga los datos
de prueba de `database/migrations/`):

```bash
docker compose up -d
```

Más detalles (encender y apagar Docker, volúmenes, errores comunes) en
[`documentacion/guia_docker.md`](documentacion/guia_docker.md).

### 3. Backend

Con MySQL encendido:

```bash
cd backend
mvn clean package                         # compila y ejecuta las pruebas JUnit
java -jar target/parqueadero-backend.jar  # inicia el servidor
```

Para comprobar que funciona, en otra terminal:

```bash
curl http://localhost:8080/api/salud
# {"estado":"OK","baseDatos":"OK"}
```

El servidor se detiene con `Ctrl+C`. Variables opcionales del `.env`:

| Variable      | Por defecto             | Para qué sirve                                         |
|---------------|-------------------------|--------------------------------------------------------|
| `PORT`        | `8080`                  | Puerto del servidor HTTP                               |
| `CORS_ORIGIN` | `http://localhost:5173` | Dirección del frontend que puede llamar a la API (CORS) |

Para probar la API sin escribir `curl`, abre [`backend/api.http`](backend/api.http)
con la extensión **REST Client** de VS Code y haz clic en *Send Request*: cada
petición indica el resultado esperado.

### 4. Frontend

Hecho con React + Vite + Tailwind CSS v4. La primera vez, desde `frontend/`, se
crea el archivo de variables de entorno y se instalan las dependencias:

```bash
cd frontend
cp .env.example .env.local   # VITE_API_URL=http://localhost:8080/api
npm install
```

`.env.local` no se sube al repositorio: cada integrante crea el suyo.

| Comando             | Para qué sirve                                                  |
|---------------------|-----------------------------------------------------------------|
| `npm run dev`       | Servidor de desarrollo en http://localhost:5173 (recarga en caliente) |
| `npm test -- --run` | Ejecuta las pruebas una vez (Vitest + Testing Library)          |
| `npm test`          | Ejecuta las pruebas en modo observador (se repiten al guardar)  |
| `npm run build`     | Compila la versión de producción en `frontend/dist/`            |
| `npm run preview`   | Sirve localmente la versión compilada                           |
| `npm run lint`      | Revisa la calidad del código con ESLint                         |
| `npm run format`    | Formatea el código con Prettier (y ordena las clases de Tailwind) |

Para que el frontend pueda llamar a la API, el backend debe estar encendido y
su `CORS_ORIGIN` (en el `.env` de la raíz) debe ser `http://localhost:5173`.
