# Guía de pruebas de la base de datos

Guía para el equipo de pruebas. El objetivo es verificar que la base de datos
del parqueadero rechaza los datos inválidos y acepta los válidos. Al terminar
se entrega un reporte (sección 7) que dice si hubo fallas o si todo está en
buen estado.

Cada prueba indica qué hacer y qué resultado se espera. **Una falla es
cualquier resultado distinto al esperado**: un error que debía salir y no
salió, un error distinto o un dato que quedó guardado cuando no debía.

---

## 1. Preparar el entorno

1. Requisitos: Docker con Docker Compose y un cliente SQL (DBeaver, MySQL
   Workbench, la extensión Database Client de VS Code o la terminal).
2. En la raíz del repositorio, copiar la plantilla de variables:
   `cp .env.example .env`. Si el puerto 3306 ya está ocupado en tu equipo
   (por ejemplo, por otro MySQL), cambia `DB_PORT` a otro puerto, como 3307.
3. Crear la base desde cero. Esto **borra** los datos que tuviera:
   ```bash
   docker compose down -v
   docker compose up -d
   ```
4. Comprobar la carga con `docker logs parqueadero-mysql`. Deben aparecer 5
   líneas `running /docker-entrypoint-initdb.d/V00X__...sql` (de V001 a V005),
   luego `MySQL init process done` y ningún `ERROR`. Si aparece un error, la
   prueba 0 ya falló: repórtalo y no sigas.
5. Conexión desde el cliente SQL:

   | Dato | Valor |
   |---|---|
   | Host | `127.0.0.1` |
   | Puerto | `DB_PORT` de tu `.env` |
   | Base | `DB_NAME` (por defecto `parqueadero`) |
   | Usuario / contraseña | `DB_USER` / `DB_PASSWORD` de tu `.env` |

### Regla de oro: no dañar los datos

Cada prueba manual va dentro de una transacción que se deshace al final:

```sql
START TRANSACTION;
-- ... instrucciones de la prueba ...
ROLLBACK;
```

- Si una instrucción da error, los pasos anteriores **no** se deshacen solos:
  ejecuta igual el `ROLLBACK`.
- Algunos clientes abren una conexión nueva para cada ejecución. Ahí el
  `ROLLBACK` no sirve: si notas datos de más, recrea la base (paso 3).
- Después de un `ROLLBACK`, los números `AUTO_INCREMENT` no se reutilizan. Que
  los ids nuevos se salten números **no es una falla**.

---

## 2. La base en un vistazo

| Tabla | Qué guarda |
|---|---|
| `tipo_vehiculo` | Moto, Bicicleta, Carro, Camión |
| `tarifa` | Precio por hora de cada tipo; cada tipo tiene una tarifa antigua y una actual |
| `marca`, `modelo` | Fabricante y línea del vehículo |
| `cliente` | Dueños de los vehículos |
| `vehiculo` | `identificador` = placa, o código si es bicicleta |
| `espacio` | Lugar físico (piso, zona, número) para un solo tipo de vehículo; `habilitado` = en servicio |
| `registro_parqueo` | Cada parqueo: entrada, salida, minutos, valor y `estado` |
| `metodo_pago` | PSE, Nequi, Daviplata y Efectivo; `requiere_referencia` indica si exige código de transacción |
| `pago` | Uno o varios pagos por registro |

**`estado` de `registro_parqueo`:**
- `'ACTIVO'`: el vehículo está adentro, sin salida, minutos ni valor. Es el valor por defecto.
- `'PAGO'`: el vehículo salió y se cobró; salida, minutos y valor son obligatorios.

**Importante:** `habilitado = 0` significa que el espacio está en
mantenimiento, **no** que esté ocupado. Un espacio ocupado tiene un registro
`ACTIVO` y sigue con `habilitado = 1`.

### Datos que deben existir al crear la base

| Dato | Esperado |
|---|---|
| Tipos / métodos de pago / tarifas | 4 / 4 / 8 |
| Espacios | 20 (solo el 2-B-04 está deshabilitado) |
| Marcas / modelos / clientes / vehículos | 9 / 12 / 10 / 15 |
| Registros | 31: 27 `PAGO` y 4 `ACTIVO` |
| Pagos | 29, que suman 505.600 |
| `vw_espacios_disponibles` / `vw_parqueos_activos` / `vw_historial_parqueos` | 15 / 4 / 27 filas |

Tarifas por hora:

| Tipo | Antigua (desde 2025-01-01) | Actual (desde 2026-10-01) |
|---|---|---|
| Moto | 1.800 | 2.000 |
| Bicicleta | 800 | 1.000 |
| Carro | 4.500 | 5.000 |
| Camión | 8.000 | 9.000 |

### Datos útiles para armar las pruebas

| Para | Usar |
|---|---|
| Vehículos **adentro** (`ACTIVO`) | MVC054 (carro, 1-A-02), WZE620 (carro, 2-B-02), XYZ78G (moto, 1-M-02), WTU2024A0153 (bicicleta, 2-K-02) |
| Vehículos **afuera** | Carros: KLM234, BCD567, RTX918. Motos: ABC12D, QWE45F. Camión: TSR482. Bicicleta: BICI0007 |
| Espacios **libres** | Carro: 1-A-01, 1-A-03 a 1-A-08, 2-B-01, 2-B-03. Moto: 1-M-01. Camión: 2-C-01. Bicicleta: 2-K-01 |
| Espacio **deshabilitado** | 2-B-04 |
| Cliente existente | documento `1012345678` |
| Referencias de pago existentes | `NEQ-0001`, `PSE-0001`, `DAV-0001` |

---

## 3. Pruebas automáticas (hacerlas primero)

| ID | Prueba | Cómo | Esperado |
|---|---|---|---|
| A1 | Consistencia de los datos | Abrir y ejecutar `database/pruebas/01_consistencia_datos.sql` | En la consulta 3, **todas** las filas con `cantidad = 0`; los conteos iguales a la sección 2 |
| A2 | Reglas (59 casos) | `bash database/pruebas/02_probar_reglas.sh` (en Linux, macOS o Git Bash) | Termina con `TODAS LAS PRUEBAS PASARON` y ninguna línea `FALLO` |

Si A2 muestra `FALLO`, la línea dice qué código se esperaba y cuál salió.
Cópiala en el reporte.

---

## 4. Plantillas SQL para las pruebas manuales

Los ids son internos: busca vehículos, espacios y métodos por sus datos.

```sql
-- id de un vehículo por placa
(SELECT id_vehiculo FROM vehiculo WHERE identificador = 'KLM234')
-- id de un espacio por ubicación
(SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01')
-- id de un método de pago
(SELECT id_metodo FROM metodo_pago WHERE nombre = 'Nequi')
```

**Registrar una entrada** (el estado queda en `'ACTIVO'` solo):

```sql
INSERT INTO registro_parqueo (id_vehiculo, id_espacio)
VALUES ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'KLM234'),
        (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01'));
```

**Cerrar y pagar** un registro activo. `@r` guarda su id y solo existe en la
misma conexión:

```sql
SET @r = (SELECT id_registro FROM registro_parqueo
          WHERE estado = 'ACTIVO'
            AND id_vehiculo = (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'MVC054'));

UPDATE registro_parqueo
SET salida = entrada + INTERVAL 90 MINUTE, minutos_totales = 90, valor_total = 10000, estado = 'PAGO'
WHERE id_registro = @r;

INSERT INTO pago (id_registro, id_metodo, monto, referencia)
VALUES (@r, (SELECT id_metodo FROM metodo_pago WHERE nombre = 'Nequi'), 10000, 'NEQ-9001');
```

**Errores esperados** y lo que significan:

| Código | Significa |
|---|---|
| 1062 | Valor repetido en un UNIQUE (el mensaje nombra el índice `uq_...`) |
| 3819 | Se violó un CHECK (el mensaje nombra el `chk_...`) |
| 1451 | No se puede borrar ni cambiar un dato que otros usan (llave foránea) |
| 1452 | Se referencia un dato que no existe (llave foránea) |
| 1364 | Falta un valor obligatorio que no tiene valor por defecto |
| 1644 | Lo rechazó un trigger (trae un mensaje en español) |

---

## 5. Pruebas manuales

En cada fila, marca **OK** si el resultado coincide con lo esperado y
**FALLA** si no.

### 5.1 Registro de parqueos: estado y un solo registro activo

| ID | Qué probar | Cómo | Esperado |
|---|---|---|---|
| R01 | Entrada válida | Plantilla de entrada con KLM234 en 1-A-01 y luego `SELECT estado ...` del registro nuevo | Se inserta con `estado = 'ACTIVO'` |
| R02 | Vehículo que ya está adentro | Entrada de MVC054 en 1-A-01 | 1062 `uq_registro_vehiculo_activo` |
| R03 | Espacio ocupado | Entrada de KLM234 en 1-A-02 | 1062 `uq_registro_espacio_activo` |
| R04 | Estado inválido | Entrada con `estado = 'FINAL'` y otra con `'activo'` en minúsculas | 3819 en ambas |
| R05 | Registro activo con salida | Entrada con `salida` y sin `estado` | 3819 `chk_registro_estado_coherente` |
| R06 | `PAGO` sin cobro | `estado = 'PAGO'` con salida pero sin minutos ni valor | 3819 `chk_registro_estado_coherente` |
| R07 | Salida antes o igual a la entrada | Registro `PAGO` con entrada 08:00 y salida 08:00 | 3819 `chk_registro_salida_posterior` |
| R08 | Minutos que no cuadran | Entrada 08:00, salida 09:00 y `minutos_totales = 90` | 3819 `chk_registro_minutos_coherentes` |
| R09 | Valor negativo | `valor_total = -1` | 3819. Con `valor_total = 0` sí se acepta |
| R10 | Cierre correcto | Plantilla de cierre y pago con MVC054; luego consultar `vw_espacios_disponibles` | Funciona y 1-A-02 aparece como disponible |
| R11 | Cierre incompleto | `UPDATE` que pone solo `salida`, o solo `estado = 'PAGO'` | 3819 |
| R12 | Reabrir sin limpiar el cobro | `UPDATE ... SET estado = 'ACTIVO'` en un registro `PAGO` | 3819 |
| R13 | Reabrir un registro de un vehículo que ya está adentro | `UPDATE` de un registro `PAGO` de MVC054 a `ACTIVO`, con salida, minutos y valor en NULL | 1062 `uq_registro_vehiculo_activo` |
| R14 | Datos inexistentes | Entrada con `id_vehiculo = 9999` o `id_espacio = 9999` | 1452 |
| R15 | Volver a ocupar un espacio liberado | Cerrar MVC054 (R10) y luego hacer la entrada de KLM234 en 1-A-02 | Funciona |

### 5.2 Triggers

| ID | Qué probar | Cómo | Esperado |
|---|---|---|---|
| T01 | Normalizar la placa al crear | `INSERT INTO vehiculo (identificador, id_tipo, id_cliente)` con `'abc-123'` y también con `' xyz 987 '` | Se guardan como `ABC123` y `XYZ987` |
| T02 | Normalizar la placa al modificar | `UPDATE vehiculo SET identificador = 'klm-999' WHERE identificador = 'KLM234'` | Queda `KLM999` |
| T03 | Placa repetida escrita distinto | Crear un vehículo con `'klm-234'` | 1062 `uq_vehiculo_identificador` |
| T04 | Símbolos que el trigger no limpia | Crear un vehículo con `'ABC.123'` | 3819 |
| T05 | Tipo distinto al del espacio | Entrada de la moto ABC12D en 1-A-01 (espacio de carro) | 1644 `El tipo del vehículo no coincide con el tipo del espacio` |
| T06 | Espacio deshabilitado | Entrada de KLM234 en 2-B-04 | 1644 `El espacio no está habilitado` |
| T07 | Mover a un espacio de otro tipo | `UPDATE` del registro activo de MVC054 con `id_espacio` de 1-M-01 | 1644 |
| T08 | Mover a un espacio deshabilitado | `UPDATE` del registro activo de MVC054 con `id_espacio` de 2-B-04 | 1644 |
| T09 | Mover a un espacio válido | `UPDATE` del registro activo de MVC054 con `id_espacio` de 1-A-03 | Funciona |
| T10 | Cerrar en un espacio deshabilitado mientras el vehículo estaba adentro | Poner `habilitado = FALSE` en 1-A-02 y luego cerrar MVC054 | Funciona: cerrar nunca se bloquea |

### 5.3 Catálogos y pagos

| ID | Qué probar | Cómo | Esperado |
|---|---|---|---|
| C01 | Tarifa en 0 o negativa | `INSERT INTO tarifa` con `valor_hora = 0` | 3819 |
| C02 | Dos tarifas del mismo tipo y día | Tarifa de Carro con `vigente_desde = '2026-10-01'` | 1062 `uq_tarifa_tipo_vigencia` |
| C03 | Pago en 0 o negativo | `INSERT INTO pago` con `monto = 0` | 3819 |
| C04 | Referencia repetida | Pago con `referencia = 'NEQ-0001'` | 1062 `uq_pago_referencia` |
| C05 | Varios pagos en efectivo | Dos pagos con `referencia` NULL | Funciona (varios NULL no chocan) |
| C06 | Año fuera de rango | Vehículo con `anio = 1800` o `2101` | 3819 |
| C07 | Placa vacía | Vehículo con `identificador = ''` | 3819 |
| C08 | Placa de moto | Vehículo moto con `'JKL34M'` | Funciona |
| C09 | Espacio repetido | `INSERT INTO espacio` en piso 1, zona A, número 01 | 1062 `uq_espacio_ubicacion` |
| C10 | Documento repetido | Cliente con documento `1012345678` | 1062 |
| C11 | Modelo repetido en la misma marca | Modelo 'Spark' para Chevrolet | 1062. En otra marca sí se acepta |
| C12 | Nombres repetidos sin importar mayúsculas ni tildes | Tipo `'camion'` o marca `'chevrolet'` | 1062 (la collation ignora mayúsculas y tildes) |
| C13 | Método de pago sin `requiere_referencia` | `INSERT INTO metodo_pago (nombre) VALUES ('Tarjeta')` | 1364 |
| C14 | Pago a un registro inexistente | `id_registro = 9999` | 1452 |

### 5.4 Borrados y cambios protegidos (llaves foráneas)

| ID | Qué probar | Cómo | Esperado |
|---|---|---|---|
| F01 | Borrar un registro con pagos | `DELETE FROM registro_parqueo WHERE id_registro = 1` | 1451 |
| F02 | Borrar datos en uso | Borrar el vehículo KLM234, el cliente `1012345678`, el tipo 'Carro', el método 'Nequi', la marca 'Chevrolet' o el espacio 1-A-01 | 1451 en cada uno |
| F03 | Cambiar el id de un tipo en uso | `UPDATE tipo_vehiculo SET id_tipo = 99 WHERE nombre = 'Carro'` | 1451 |
| F04 | Borrados permitidos | Borrar un pago; borrar el registro activo de MVC054 (no tiene pagos); borrar el espacio 2-B-04 (sin historial) | Funcionan |

### 5.5 Vistas y codificación

| ID | Qué probar | Cómo | Esperado |
|---|---|---|---|
| V01 | Espacios disponibles | `SELECT * FROM vw_espacios_disponibles` | 15 filas, sin 2-B-04 ni los 4 ocupados |
| V02 | Parqueos activos | `SELECT * FROM vw_parqueos_activos` dos veces, con un minuto de diferencia | 4 filas; `minutos_transcurridos` aumenta |
| V03 | Historial | `SELECT * FROM vw_historial_parqueos` | 27 filas; los registros de HJP402 (21-sep) y JTU389 (5-oct) muestran dos métodos unidos con ' + ' |
| V04 | Ingresos | `SELECT SUM(total_recaudado) FROM vw_ingresos_por_metodo` | 505600.00 |
| V05 | Tildes | `SELECT nombre FROM tipo_vehiculo` | Se lee `Camión` (no `CamiÃ³n`) |

---

## 6. Limitaciones conocidas (no se reportan como falla)

Estas reglas son responsabilidad de la aplicación (backend), no de la base. Si
la base las acepta, el comportamiento es correcto. Repórtalas solo como
**observación**, si crees que deberían controlarse en la base.

- La suma de los pagos de un registro debe ser igual a su `valor_total`.
- `valor_total` debe corresponder a la tarifa vigente (cobro por hora o fracción).
- Un pago por PSE, Nequi o Daviplata debe llevar `referencia`, y uno en efectivo no.
- Se pueden insertar pagos sobre un registro `ACTIVO`.
- La base acepta entradas con fecha futura, entradas anteriores a toda tarifa
  (antes de 2025-01-01) y horarios que se crucen con registros ya cerrados.
- Un cliente puede tener dos vehículos adentro a la vez.
- Cambiar el tipo de un espacio o de un vehículo mientras tiene un registro
  `ACTIVO` no está bloqueado.
- `documento` y `telefono` del cliente no tienen validación de formato.

---

## 7. Reporte final

Copia esta plantilla, llénala y entrégala:

```text
REPORTE DE PRUEBAS – BASE DE DATOS PARQUEADERO
Probado por: ____________   Fecha: __________   Rama/commit: __________

Entorno
- Carga de V001–V005 sin errores (sección 1, paso 4): OK / FALLA

Automáticas
- A1 consistencia de datos: OK / FALLA
- A2 script de reglas: OK / FALLA   (correctas: __ / 59)

Manuales (anota solo las que fallaron; las demás se entienden OK)
| ID | Esperado | Obtenido (código y mensaje) | SQL ejecutado |
|----|----------|-----------------------------|---------------|
|    |          |                             |               |

Observaciones (limitaciones de la sección 6 u otras ideas):
-

Resumen: __ pruebas ejecutadas, __ fallas.
VEREDICTO: [ ] Todo en excelente estado   [ ] Hay fallas (detalladas arriba)
```

Para cada falla, incluye siempre el SQL exacto que ejecutaste y el mensaje
completo del error (o la falta de error), para poder reproducirla.
