# Plan de pruebas — Sistema de Parqueadero

> **Borrador** generado al cerrar las pruebas automáticas de la Fase 4. El equipo de
> testing lo revisa, completa los datos marcados con `[completar]`, ejecuta los casos de
> [`casos-de-prueba.md`](casos-de-prueba.md) y da la aprobación formal (sección 9).

| Documento | Versión | Fecha | Estado |
|---|---|---|---|
| Plan de pruebas | 0.1 (borrador) | 07/11/2026 | En revisión del equipo de testing |

---

## 1. Objetivo

Demostrar que el sistema completo (base de datos, backend y frontend) funciona y cumple
el enunciado del proyecto:

> Registro y control de la información de cada uno de los carros que solicitan parqueo,
> permitir la actualización y consulta de la información de carros, tiempos de parqueo,
> ubicaciones, fechas de parqueo y formas de pago (PSE, Nequi, Daviplata o efectivo).

## 2. Alcance

**Incluye:**

| ID | Requisito (sale del enunciado) |
|---|---|
| RF-01 | Registro de carros (y demás vehículos) y de su propietario |
| RF-02 | Actualización de la información de vehículos y propietarios |
| RF-03 | Consulta de la información de vehículos |
| RF-04 | Tiempos de parqueo (tiempo dentro, duración y valor cobrado) |
| RF-05 | Ubicaciones (espacios: tablero, disponibilidad por tipo, habilitar y deshabilitar) |
| RF-06 | Fechas de parqueo (historial con filtros de fechas) |
| RF-07 | Formas de pago: PSE, Nequi, Daviplata y efectivo; recibo y reportes de ingresos |
| RNF | Uso en celular, teclado, mensajes de error claros, comportamiento sin conexión y concurrencia |

**No incluye:** rendimiento con muchos usuarios, despliegue en un servidor (Fase 5),
otros navegadores distintos al indicado en el entorno, ni seguridad avanzada (no hay
inicio de sesión: la app es para el operario del parqueadero).

## 3. Niveles de prueba

| Nivel | Qué prueba | Herramienta | Cómo se ejecuta | Responsable |
|---|---|---|---|---|
| Unitarias | Lógica aislada (cobro, validaciones, formato) | JUnit 6, Vitest | `cd backend && mvn clean package` · `cd frontend && npm test -- --run` | Desarrollo |
| Base de datos | Restricciones, triggers y vistas | JUnit + JDBC | `./database/scripts/recrear-bd-pruebas.sh` y `cd backend && mvn verify -Pintegracion` | Desarrollo |
| API | Endpoints contra MySQL real, reglas, concurrencia y seguridad | JUnit + `HttpClient` | (igual que la anterior) | Desarrollo |
| Extremo a extremo | Flujos completos en un Chromium real | Playwright | `cd frontend && npm run test:e2e` (ver README) | Desarrollo |
| Integración continua | Unitarias, BD, API y frontend en cada PR | GitHub Actions | Automático en cada push y PR a `develop` y `main` | Desarrollo |
| **Manuales** | **Casos contra el enunciado, desde la pantalla** | **Este plan** | [`casos-de-prueba.md`](casos-de-prueba.md) | **Equipo de testing** |

La relación entre cada parte del enunciado, los casos manuales y las pruebas automáticas
está en [`matriz-trazabilidad.md`](matriz-trazabilidad.md).

## 4. Entorno de pruebas

| Pieza | Versión usada al preparar el plan | Versión usada al ejecutar |
|---|---|---|
| Sistema operativo | Kali Linux (rolling) | `[completar]` |
| Java | OpenJDK 21.0.12 | `[completar]` |
| Maven | 3.9.12 | `[completar]` |
| Node.js / npm | 24.21.0 / 12.2.0 | `[completar]` |
| MySQL | 8.4.13 (imagen `mysql:8.4` de Docker) | `[completar]` |
| Navegador | Chromium 158 (pruebas E2E); Brave o Chrome actual para las manuales | `[completar]` |
| Rama y commit | `develop` | `[completar: git log -1 --oneline]` |

Bibliotecas principales: MySQL Connector/J 26.10.0, Gson 2.15.0, React 19.3, React Router
8.5, Vite 8.3, Tailwind CSS 4.3, Vitest 5.1, Playwright 1.65.

### Preparación antes de cada ronda

1. Actualizar el código: `git checkout develop && git pull`.
2. Dejar la base con los datos iniciales (borra todo lo que se haya creado antes):
   `docker compose down -v && docker compose up -d`.
3. Encender el backend: `cd backend && mvn clean package && java -jar target/parqueadero-backend.jar`.
4. Encender el frontend: `cd frontend && npm install && npm run dev` y abrir http://localhost:5173.
5. Comprobar que el indicador bajo "Parqueadero" dice **Conectado** en verde.

### Datos iniciales que usan los casos

Vienen de `database/migrations/V003__datos_prueba.sql` (detalle en
[`../guia_pruebas_base_datos.md`](../guia_pruebas_base_datos.md)):

| Dato | Valor |
|---|---|
| Vehículos **dentro** | MVC054 (A-02, piso 1), XYZ78G (M-02), WZE620 (B-02, piso 2), WTU2024A0153 (K-02) |
| Vehículos **afuera** | Carros KLM234, BCD567, RTX918 · Motos ABC12D, QWE45F · Camión R48213 · Bicicleta BICI0007 |
| Espacio **deshabilitado** | B-04, piso 2 |
| Propietario existente | Documento 1012345678 (Laura Camila Gómez Rojas) |
| Referencias de pago ya usadas | NEQ-0001, PSE-0001, DAV-0001 |
| Tarifas vigentes por hora | Moto $ 2.000 · Bicicleta $ 1.000 · Carro $ 5.000 · Camión $ 9.000 |

## 5. Roles

| Rol | Responsabilidad | Persona |
|---|---|---|
| Líder de pruebas | Revisa este plan, reparte los casos, consolida resultados y da la aprobación | `[completar]` |
| Ejecutores | Ejecutan los casos y llenan "Resultado obtenido", "Estado" y "Bug" | `[completar]` |
| Desarrollo | Corrige los bugs en ramas `fix/<numero>-<descripcion>` con una prueba automática que los cubra | `[completar]` |

## 6. Cómo ejecutar y registrar

1. Ejecutar cada caso siguiendo sus pasos tal como están escritos.
2. Escribir en **Resultado obtenido** lo que pasó (copiar el mensaje exacto si hay uno).
3. Marcar el **Estado**: `Aprobado`, `Fallido` o `Bloqueado` (no se pudo ejecutar; decir por qué).
4. Si falla: crear un *issue* con la plantilla **Reporte de bug**
   ([`.github/ISSUE_TEMPLATE/bug.md`](../../.github/ISSUE_TEMPLATE/bug.md)) y anotar su
   número en la columna **Bug**.
5. Cuando el bug se corrija, volver a ejecutar el caso (prueba de regresión) y actualizar
   el estado.

## 7. Severidad de los bugs

| Severidad | Cuándo | Ejemplo |
|---|---|---|
| Crítico | El sistema no se puede usar, o se pierden o dañan datos | Un cobro se guarda dos veces |
| Alto | Una función del enunciado no funciona y no hay forma de evitarlo | No se puede pagar con Daviplata |
| Medio | Funciona, pero con un error que tiene una forma de evitarlo | Un filtro del historial no se aplica al primer clic |
| Bajo | Detalle visual, de texto o de comodidad | Un texto con un error de ortografía |

## 8. Criterios de aceptación

**Para empezar (entrada):**

- Las pruebas automáticas pasan: `mvn verify -Pintegracion`, `npm test -- --run`,
  `npm run lint`, `npm run build` y las E2E en local.
- El CI está en verde en `develop`.
- La base se recreó con los datos iniciales.

**Para aprobar el sistema (salida):**

- Todos los casos ejecutados (ninguno sin estado).
- Todos los casos de RF-01 a RF-07 en `Aprobado`.
- Ningún bug **crítico** ni **alto** abierto. Los medios y bajos quedan documentados con
  su issue.
- La matriz de trazabilidad no tiene ninguna parte del enunciado sin cubrir.

## 9. Aprobación

| Aprobación | Resultado | Fecha | Firma / nombre |
|---|---|---|---|
| Base de datos (pendiente desde la Fase 1) | `[Aprobada / Con observaciones]` | `[completar]` | `[completar]` |
| Sistema completo | `[Aprobado / Con observaciones]` | `[completar]` | `[completar]` |

## Anexo A. SQL de preparación

Algunos casos necesitan datos que no se pueden crear desde la pantalla (por ejemplo, un
parqueo que empezó ayer). Se ejecutan en el cliente SQL contra la base `parqueadero`
(usuario y contraseña del `.env`; ver la guía de pruebas de la base).

**A1. Parqueo que cruza la medianoche** (caso CP-RF04-04): BCD567 entró ayer a las 23:30
al espacio A-05.

```sql
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada)
VALUES ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'BCD567'),
        (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '05'),
        TIMESTAMP(CURDATE() - INTERVAL 1 DAY, '23:30:00'));
```

**A2. Comprobar que un cobro quedó una sola vez** (caso CP-RNF-06):

```sql
SELECT r.id_registro, r.estado, COUNT(p.id_pago) AS pagos
FROM registro_parqueo r LEFT JOIN pago p ON p.id_registro = r.id_registro
WHERE r.id_vehiculo = (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'WZE620')
GROUP BY r.id_registro, r.estado;
```
