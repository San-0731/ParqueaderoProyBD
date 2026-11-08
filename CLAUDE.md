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
- Dependencias permitidas en el backend: MySQL Connector/J, Gson y JUnit
  Jupiter (JUnit 6), en su última versión estable de Maven Central.
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

## Frontend (reglas que ya se siguen)
- Diseño, colores y componentes: documentacion/guia_diseno_frontend.md. Toda
  placa o código de vehículo se muestra con el componente <Placa>.
- La URL del backend solo va en VITE_API_URL (frontend/.env.local); las
  llamadas a la API solo salen de frontend/src/api/.
- El tipo de vehículo sale de la placa (backend: util/TipoPorPlaca.java;
  frontend: utils/tipoVehiculo.js; deben tener la misma regla). La placa y el
  tipo no se pueden editar.
- Todo tipo de vehículo que se muestre pasa por nombreTipoVisible() ("Camión"
  se ve como "Camión de carga pesada"; en la base sigue siendo "Camión").
- El frontend no calcula cobros: usa los valores de la liquidación del backend.
- npm test -- --run incluye la revisión de accesibilidad con axe-core
  (src/accesibilidad.test.jsx).
- Sesión y roles (OPERADOR ⊆ ADMINISTRADOR ⊆ DBA): useSesion().puede('ADMINISTRADOR'); el menú
  oculta lo que el rol no puede usar y RequiereRol protege la ruta. La regla de roles está en
  utils/roles.js y backend model/Rol.java (deben coincidir). Toda ruta nueva de la API declara
  su rol mínimo en Servidor.java (ServidorRutasTest falla si queda pública por olvido).
- Zonas: la zona se nombra letra + piso (A1) y el espacio A1-01 (utils/espacio.js).

## Comandos
- Frontend (desde frontend/; la primera vez: cp .env.example .env.local):
  npm install, npm run dev (http://localhost:5173), npm test -- --run
  (pruebas Vitest), npm run test:cobertura (cobertura, reporte en coverage/),
  npm run test:e2e (Playwright, e2e/; requiere MySQL y el backend con
  DB_NAME=parqueadero_test encendidos), npm run build, npm run lint (ESLint) y npm run format
  (Prettier)
- Backend: cd backend && mvn clean package (compila y corre las pruebas JUnit)
  y java -jar target/parqueadero-backend.jar (requiere MySQL encendido;
  responde en http://localhost:8080/api; salud en /api/salud)
- Pruebas de integración (MySQL real, base aparte parqueadero_test; las
  pruebas llevan @Tag("integracion") heredando de integracion/PruebaIntegracion
  y mvn clean package las salta):
  ./database/scripts/recrear-bd-pruebas.sh
  cd backend && mvn verify -Pintegracion
- Probar la API: backend/api.http (extensión REST Client; primero "Iniciar sesión")
- Base de datos: docker compose up -d (desde la raíz; ver documentacion/guia_docker.md)
- Migración nueva en una base que ya existe (respalda antes):
  ./database/scripts/aplicar-migracion.sh database/migrations/V00N__descripcion.sql
- Permisos del usuario de la app (rol de MySQL de V009): ./database/scripts/aplicar-permisos.sh
  y ./database/scripts/verificar-permisos.sh. La base de pruebas conserva ALL.
- Las e2e inician sesión con DBA_USUARIO/DBA_CLAVE_INICIAL del .env: el backend crea ese DBA al
  arrancar, así que después de recrear la base de pruebas hay que reiniciar el backend.

## Forma de trabajar
- Antes de cambios grandes, presentar un plan y esperar aprobación.
- Explicar brevemente el código generado: el equipo debe entenderlo
  para sustentar el proyecto.
- Hacer cambios pequeños y enfocados en la tarea pedida.