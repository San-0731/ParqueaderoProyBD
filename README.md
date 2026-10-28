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
- [Node.js 24](https://nodejs.org/) (incluye npm)
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

> ⚠️ **Pendiente.** Esta sección se completará en la Fase 1 (base de datos) y
> en la Fase 2 (backend).

Primer paso común: copiar la plantilla de variables de entorno y ajustar los valores.

```bash
cp .env.example .env
```
