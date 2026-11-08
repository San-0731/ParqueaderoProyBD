# Guía para sustentar la Fase 5

Resumen de lo que hay que saber explicar de la Fase 5: la tabla `zona` (normalización), los
usuarios y roles, la auditoría con triggers y el rol de MySQL de mínimo privilegio. Cada tema
dice dónde está en el código y una forma de mostrarlo en vivo.

---

## 1. La tabla `zona` y la dependencia transitiva (V006)

**Qué había antes.** `espacio(id_espacio, id_tipo, piso, zona, numero, habilitado)`. Pero una zona
(por ejemplo, la A del piso 1) está demarcada para un solo tipo de vehículo, así que:

```
(piso, zona) → id_tipo           (dependencia funcional)
id_espacio → (piso, zona) → id_tipo   (el tipo depende del espacio A TRAVÉS de su zona)
```

Eso es una **dependencia transitiva**, que la **tercera forma normal (3FN)** no permite: un
atributo que no es llave (`id_tipo`) dependía de otro conjunto que no identifica la fila
(`piso, zona`: hay 8 filas con piso 1 y zona A).

**Qué problemas causaba (anomalías).**
- *Redundancia:* "carro" repetido en los 8 espacios de la zona A.
- *Inserción:* nada impedía un espacio de motos en una zona de carros, y no se podía crear una
  zona sin crear un espacio.
- *Actualización:* cambiar el tipo de una zona obligaba a cambiar todos sus espacios; si se
  escapaba uno, la zona quedaba mezclada.

**La corrección.** `zona(id_zona, piso, letra, id_tipo)` con `UNIQUE (piso, letra)` y
`espacio(id_espacio, id_zona, numero, habilitado)` con `UNIQUE (id_zona, numero)`. Cada dato se
guarda una vez y la regla "una zona, un tipo" la garantiza la estructura. La misma letra puede
repetirse en otro piso: por eso en pantalla la zona se llama **A1** (letra + piso) y el espacio
**A1-01**.

**Cómo se migró sin perder datos.** `INSERT INTO zona SELECT DISTINCT piso, zona, id_tipo FROM
espacio`, luego `ALTER TABLE espacio ADD id_zona`, `UPDATE espacio JOIN zona ... SET id_zona` y por
último se borraron las columnas viejas. Los `id_espacio` no cambiaron, así que `registro_parqueo`
no se tocó.

**Independencia lógica.** Las tres vistas se volvieron a crear con un `JOIN zona`, pero con **los
mismos nombres de columna**: el backend que las consulta no cambió.

**Para mostrar:** `SELECT * FROM zona;` y `SHOW CREATE TABLE espacio;`.

---

## 2. Usuarios y roles de la aplicación (V007)

**Por qué en tablas y no un usuario de MySQL por persona.** Con un usuario de MySQL por persona,
el backend tendría que guardar la contraseña de MySQL de cada uno, la cuenta del backend
necesitaría permisos casi de root para crear usuarios, y reglas como "ver el historial pero no
los reportes" no se pueden expresar con `GRANT` (leen las mismas tablas).

- `rol` (DBA, ADMINISTRADOR, OPERADOR), `usuario` y `sesion`.
- **Contraseñas:** se guarda `PBKDF2-HMAC-SHA256` con sal aleatoria y 600.000 iteraciones
  (`util/Contrasenas.java`), nunca la contraseña. Dos usuarios con la misma clave tienen hashes
  distintos.
- **Sesiones:** un token aleatorio de 32 bytes; en la base solo queda su **hash SHA-256**. Si
  alguien lee la tabla `sesion`, no puede entrar con eso.
- **Permisos:** cada ruta de la API declara su rol mínimo (`Servidor.java`). Sin sesión → 401;
  con un rol que no alcanza → 403. El frontend solo oculta botones y pestañas: protege el backend.
- **Siempre queda un DBA activo:** al editar un usuario, se bloquean las filas de los DBA con
  `SELECT ... FOR UPDATE OF u` dentro de una transacción. Si dos DBA intentan desactivarse a la
  vez, el segundo espera y luego ve que solo queda uno.

**Para mostrar:** `SELECT nombre_usuario, clave_hash FROM usuario;` (se ve el hash, no la clave).

---

## 3. Auditoría con triggers (V008)

**Qué registra.** Quién (usuario y su rol **en ese momento**), cuándo, qué tabla, qué fila, y la
fila antes y después en JSON. 8 triggers `AFTER INSERT/UPDATE` en `cliente`, `vehiculo`,
`registro_parqueo` (entrada y salida), `pago` y `espacio`.

**El problema: MySQL no sabe quién inició sesión en la web.** El backend siempre se conecta con la
misma cuenta. La solución es una **variable de sesión de MySQL**:

```
Router (usuario de la petición) → UsuarioActual (ThreadLocal)
  → ConexionBD: SET @id_usuario_app = 7   (en cada conexión)
    → trigger: fn_rol_auditable(@id_usuario_app) → INSERT INTO auditoria ...
```

- `fn_rol_auditable` es una **función almacenada** que devuelve el rol si el cambio se audita, o
  NULL si no hay usuario (cambio hecho fuera de la aplicación) o si es el DBA (decisión del
  proyecto: el DBA no se audita).
- Los triggers son `AFTER`: solo se registra lo que de verdad se guardó.
- Corren **en la misma transacción**: si una salida falla y se hace `ROLLBACK`, su fila de
  auditoría también se deshace.
- **Quién ve qué:** el DBA consulta `vw_auditoria` (todo); el administrador,
  `vw_auditoria_operadores` (filtra `rol = 'OPERADOR'`). La regla queda en la base, en una vista.

**Para mostrar:** registrar una entrada como operador y luego
`SELECT tabla, operacion, rol, datos_despues FROM vw_auditoria ORDER BY id_auditoria DESC LIMIT 3;`.

---

## 4. Rol de MySQL de mínimo privilegio (V009)

**Antes:** Docker crea `parqueadero_user` con `ALL PRIVILEGES` (podía hacer `DROP TABLE`).
**Ahora:** solo tiene el rol `rol_aplicacion`:

| Puede | No puede |
|---|---|
| leer, crear y modificar lo que usa la app | borrar (salvo sesiones) |
| `UPDATE` de espacio **solo en la columna `habilitado`** | cambiar la zona o el número de un espacio (`ERROR 1143`) |
| leer la auditoría | escribir o borrar en la auditoría |
| `LOCK TABLES` (para los `SELECT ... FOR UPDATE`) | `DROP`, `ALTER`, `CREATE`, `GRANT` |

- Un **rol** es un paquete de permisos con nombre: `CREATE ROLE`, `GRANT ... TO rol`,
  `GRANT rol TO usuario`, `SET DEFAULT ROLE`.
- Los triggers escriben en `auditoria` aunque el usuario no pueda, porque se ejecutan con los
  permisos de su **DEFINER** (root). Así nadie puede alterar la auditoría desde la aplicación.
- Dos capas de control: el backend responde 403 según el rol de la app; MySQL responde 1142
  según el rol de la base, aunque el backend tuviera un error.

**Para mostrar:**

```bash
./database/scripts/verificar-permisos.sh        # 17 comprobaciones
docker compose exec mysql mysql -u parqueadero_user -p parqueadero
mysql> DELETE FROM pago;   -- ERROR 1142 (42000): DELETE command denied ...
```

---

## 5. Preguntas que pueden hacer

- **¿Por qué `zona` y no una tabla `piso`?** El piso no tiene datos propios: un piso existe
  cuando tiene zonas. Lo que sí rompía la 3FN era el tipo que dependía de la zona.
- **¿Por qué guardar el rol en la auditoría si se puede sacar del usuario?** Porque el rol
  cambia: si un operador asciende, lo que hizo como operador debe seguir apareciendo así. Es una
  foto, como `valor_total` en `registro_parqueo`.
- **¿El DBA puede saltarse todo?** Sí: como root puede borrar triggers o filas. Por eso el
  proyecto no lo audita; en producción se usaría una auditoría fuera de la base (binlog o
  herramientas del servidor).
- **¿Qué pasa si alguien llama la API sin pasar por el frontend?** Lo mismo: el backend revisa
  el token y el rol en cada ruta (401 o 403).
