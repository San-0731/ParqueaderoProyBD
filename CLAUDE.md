# Proyecto: Sistema de Parqueadero

Aplicación para registrar y controlar los carros que solicitan parqueo:
información de vehículos, tiempos de parqueo, ubicaciones (espacios),
fechas de parqueo y formas de pago (PSE, Nequi, Daviplata, efectivo).
Proyecto académico de la materia Bases de Datos.

## Reglas obligatorias (no negociables)
- Backend en Java 21 SIN frameworks. PROHIBIDO: Spring, Spring Boot,
  Jakarta EE, Quarkus, Micronaut, Javalin, Hibernate, JPA, MyBatis o
  cualquier ORM.
- Servidor HTTP: com.sun.net.httpserver.HttpServer (incluido en el JDK).
- Acceso a datos: JDBC puro, siempre con PreparedStatement y
  try-with-resources. El SQL se escribe a mano.
- Dependencias permitidas en el backend: MySQL Connector/J, Gson, JUnit 5.
  No agregar ninguna otra sin preguntar primero.
- Base de datos: MySQL 8. Los cambios de esquema van SOLO en archivos
  nuevos database/migrations/V{n}__descripcion.sql. Nunca modificar una
  migración ya existente.
- Frontend: React + Vite + Tailwind CSS. Aquí sí se permiten librerías.
- Nunca escribir credenciales en el código: usar variables de entorno
  (.env está en .gitignore; .env.example sirve de plantilla).

## Estructura
- database/  scripts SQL (migraciones)
- backend/   proyecto Maven (capas: config, model, dao, service, handler, util)
- frontend/  proyecto React + Vite
- docker-compose.yml  en la raíz (lee el .env de la raíz; se levanta con
  docker compose up -d)

## Convenciones
- Nombres del dominio en español (Vehiculo, Parqueo, Espacio, Pago).
- Comentarios y documentación en español.
- Commits estilo Conventional Commits: feat:, fix:, docs:, refactor:,
  test:, chore:
- Ramas: feature/<descripcion> o fix/<descripcion>, creadas desde develop.

## Comandos
- Frontend: cd frontend && npm install && npm run dev
- Backend: (se completará en la Fase 2)
- Base de datos: docker compose up -d (desde la raíz; detalles en la Fase 1)

## Forma de trabajar
- Antes de cambios grandes, presentar un plan y esperar aprobación.
- Explicar brevemente el código generado: el equipo debe entenderlo
  para sustentar el proyecto.
- Hacer cambios pequeños y enfocados en la tarea pedida.