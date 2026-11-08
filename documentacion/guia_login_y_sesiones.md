# Login y sesiones: tablas y funcionamiento

Explica las tablas que se agregaron para el inicio de sesión (migración
`V007__usuarios_y_sesiones.sql`), sus columnas y reglas, y cómo funciona una sesión de punta a
punta.

---

## 1. Antes de empezar: dos tipos de usuarios

| | Usuarios de **MySQL** | Usuarios de la **aplicación** |
|---|---|---|
| Quiénes son | `root` y `parqueadero_user` | Las personas que inician sesión en la web |
| Dónde viven | En MySQL (`CREATE USER`, `GRANT`) | En la tabla `usuario` |
| Para qué | El backend se conecta a la base **siempre** con `parqueadero_user` | Saber quién usa la app y qué puede hacer |

Las tablas de esta guía son de los **usuarios de la aplicación**.

```mermaid
erDiagram
  ROL ||--o{ USUARIO : tiene
  USUARIO ||--o{ SESION : abre
```

Un rol tiene muchos usuarios y un usuario puede tener varias sesiones abiertas, por ejemplo en
dos computadores.

---

## 2. Tabla `rol`

El catálogo de perfiles. V007 deja los tres creados.

| Columna | Tipo | Nulo | Restricciones |
|---|---|---|---|
| `id_rol` | INT UNSIGNED | No | PK, AUTO_INCREMENT |
| `nombre` | VARCHAR(20) | No | UNIQUE (`uq_rol_nombre`) |

Datos: `DBA`, `ADMINISTRADOR` y `OPERADOR`. Son **jerárquicos**: cada uno puede todo lo del
anterior (OPERADOR ⊆ ADMINISTRADOR ⊆ DBA). El backend tiene la misma lista en `model/Rol.java`.

---

## 3. Tabla `usuario`

Cada persona que puede iniciar sesión.

| Columna | Tipo | Nulo | Restricciones y para qué |
|---|---|---|---|
| `id_usuario` | INT UNSIGNED | No | PK, AUTO_INCREMENT |
| `nombre_usuario` | VARCHAR(30) | No | UNIQUE (`uq_usuario_nombre_usuario`). CHECK `chk_usuario_nombre_formato`: de 3 a 30 caracteres, solo minúsculas sin tildes, números, punto y guion bajo (`ana.perez`). Es con lo que se inicia sesión y no se cambia después |
| `nombre_completo` | VARCHAR(100) | No | CHECK `chk_usuario_nombre_completo_no_vacio`: no puede quedar en blanco |
| `clave_hash` | VARCHAR(255) | No | El **hash** de la contraseña, nunca la contraseña (sección 5) |
| `id_rol` | INT UNSIGNED | No | FK `fk_usuario_rol` → `rol(id_rol)`, con su índice `idx_usuario_rol` |
| `activo` | BOOLEAN | No | DEFAULT TRUE. FALSE = no puede iniciar sesión |
| `creado_en` | DATETIME | No | DEFAULT CURRENT_TIMESTAMP |

Reglas que cumple el backend:
- **Los usuarios no se borran, se desactivan** (`activo = FALSE`). La auditoría (V008) guarda
  quién hizo cada cambio con una llave foránea a `usuario`, y borrar el usuario dejaría esos
  registros sin dueño.
- **Siempre queda al menos un DBA activo.** No se puede desactivar ni quitarle el rol al único
  DBA: nadie podría volver a administrar las cuentas.
- La contraseña debe tener entre 8 y 100 caracteres.
- **El primer DBA** no está en ninguna migración, porque eso sería escribir una contraseña en el
  código. El backend lo crea al arrancar, si no hay ningún DBA activo, con `DBA_USUARIO` y
  `DBA_CLAVE_INICIAL` del `.env`. Las demás cuentas las crea ese DBA en **Sistema → Usuarios**.

---

## 4. Tabla `sesion`

Las sesiones abiertas.

| Columna | Tipo | Nulo | Restricciones y para qué |
|---|---|---|---|
| `token_hash` | CHAR(64) | No | PK (`pk_sesion`). El **hash SHA-256 del token**, no el token. CHECK `chk_sesion_token_hash_formato`: exactamente 64 dígitos hexadecimales en minúscula |
| `id_usuario` | INT UNSIGNED | No | FK `fk_sesion_usuario` → `usuario(id_usuario)`, con `idx_sesion_usuario` |
| `creada` | DATETIME | No | DEFAULT CURRENT_TIMESTAMP |
| `expira` | DATETIME | No | Cuándo vence: 8 horas después (un turno). CHECK `chk_sesion_expira_posterior`: `expira > creada`. Índice `idx_sesion_expira` para borrar rápido las vencidas |

---

## 5. La contraseña: hash, no encriptación

- **Encriptar** es reversible: con la llave se recupera el texto.
- **Hashear** es de una sola vía: de `clave_hash` no se puede sacar la contraseña.

Al iniciar sesión, el backend calcula el hash de lo que la persona escribió y lo compara con el
guardado. Se usa **PBKDF2-HMAC-SHA256**, que viene en Java, sin librerías
(`util/Contrasenas.java`). Lo que se guarda tiene este formato:

```
pbkdf2_sha256$600000$<sal en Base64>$<hash en Base64>
```

- **Sal:** 16 bytes aleatorios, distintos para cada usuario. Dos personas con la misma
  contraseña tienen hashes diferentes.
- **600.000 iteraciones:** el cálculo se repite muchas veces a propósito, para que probar
  contraseñas a la fuerza sea muy lento. El número va dentro del texto, así se puede subir en el
  futuro sin invalidar las contraseñas que ya existen.
- La comparación se hace en tiempo constante (`MessageDigest.isEqual`), para que el tiempo de
  respuesta no dé pistas.

---

## 6. Cómo funciona una sesión, paso a paso

```
Navegador                         Backend                               MySQL
   │  POST /api/auth/login           │                                     │
   │  {nombreUsuario, clave}  ─────▶ │ busca el usuario y verifica el hash ─▶ usuario
   │                                 │ genera un token aleatorio           │
   │                                 │ guarda SHA-256(token), +8 h  ──────▶ sesion
   │  ◀─── {token, usuario}          │                                     │
   │                                 │                                     │
   │  GET /api/vehiculos             │                                     │
   │  Authorization: Bearer <token> ▶│ SHA-256(token) → ¿sesión vigente    │
   │                                 │ y usuario activo? ¿rol suficiente? ─▶ sesion + usuario + rol
   │  ◀─── 200 / 401 / 403           │                                     │
   │                                 │                                     │
   │  POST /api/auth/logout ───────▶ │ borra esa sesión ──────────────────▶ sesion
```

1. **Iniciar sesión** (`POST /api/auth/login`). El backend busca el usuario y verifica la
   contraseña. Si todo está bien, genera un **token** (32 bytes de `SecureRandom`, 43
   caracteres), guarda en `sesion` solo su hash con `expira = NOW() + 8 horas` y le devuelve al
   navegador el token y los datos del usuario (nunca el hash).
   - Si el usuario no existe, está desactivado o la contraseña está mal, la respuesta es la
     misma: 401 "Usuario o contraseña incorrectos.". Así no se puede averiguar qué usuarios
     existen. Cuando el usuario no existe, igual se calcula un hash de relleno para que la
     respuesta tarde lo mismo.
   - De paso, se borran las sesiones vencidas de todos los usuarios.
2. **El navegador guarda la sesión** en `sessionStorage` (clave `parqueadero.sesion`). Dura lo
   que la pestaña: al cerrar el navegador se cierra la sesión, lo que conviene en el computador
   compartido de la caseta.
3. **Cada petición** lleva `Authorization: Bearer <token>`. El backend calcula el hash del token
   y busca en `sesion` una fila vigente (`expira > NOW()`) cuyo usuario esté activo. Después
   revisa que el rol alcance para esa ruta:
   - sin token → 401 "Inicia sesión para continuar.";
   - token vencido, inventado o de un usuario desactivado → 401 "Tu sesión terminó o no es
     válida. Inicia sesión de nuevo.";
   - rol insuficiente → 403, por ejemplo "Solo un usuario Administrador o DBA puede hacer esto.".
4. **Si el frontend recibe 401**, cierra la sesión del navegador y vuelve a la pantalla de inicio
   con el aviso "Tu sesión terminó. Inicia sesión de nuevo.". Al recargar la página, confirma la
   sesión guardada con `GET /api/auth/yo`, que también trae el rol actualizado.
5. **Cerrar sesión** (`POST /api/auth/logout`) borra esa fila de `sesion`; el token deja de
   servir. Las demás sesiones del mismo usuario siguen abiertas.
6. **Cambios que cierran todas las sesiones de un usuario:** cuando el DBA lo desactiva, le
   cambia el rol o le pone una contraseña nueva. Así el cambio aplica de inmediato.

**¿Por qué guardar el hash del token y no el token?** Si alguien leyera la tabla `sesion` (por
ejemplo, de un respaldo), no podría usar esos datos para entrar como otra persona. Aquí basta
SHA-256 sin sal: el token ya es aleatorio y larguísimo, y el cálculo debe ser rápido porque se
hace en cada petición.

---

## 7. Qué más se agregó alrededor

| Qué | Dónde |
|---|---|
| Rutas de la sesión: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/yo` | `AutenticacionHandler`, `AutenticacionService` |
| Administración de cuentas (solo el DBA): `GET`/`POST /api/usuarios`, `PUT /api/usuarios/{id}`, `PUT /api/usuarios/{id}/clave` | `UsuarioHandler`, `UsuarioService` |
| Rol mínimo de cada ruta, con 401 y 403 | `Router` y `Servidor.java` |
| Permisos de MySQL sobre estas tablas (V009): `usuario` SELECT, INSERT y UPDATE (nunca DELETE); `sesion` SELECT, INSERT y DELETE; `rol` solo SELECT | `V009__rol_aplicacion.sql` |
| La auditoría guarda el usuario y su rol en ese momento | `V008__auditoria.sql` |
| Pantalla de inicio de sesión, menú según el rol y Sistema → Usuarios | `frontend/src/pages/login/`, `context/ProveedorSesion.jsx`, `pages/sistema/usuarios/` |

---

## 8. Consultas para mostrar en la sustentación

```sql
-- Los roles y cuántos usuarios tiene cada uno
SELECT r.nombre, COUNT(u.id_usuario) AS usuarios
FROM rol r LEFT JOIN usuario u ON u.id_rol = r.id_rol
GROUP BY r.id_rol, r.nombre;

-- Las contraseñas no están: solo su hash
SELECT nombre_usuario, LEFT(clave_hash, 40) AS inicio_del_hash, activo FROM usuario;

-- Sesiones abiertas: hash del token, de quién y cuándo vencen
SELECT LEFT(s.token_hash, 12) AS token_hash, u.nombre_usuario, s.creada, s.expira
FROM sesion s JOIN usuario u ON u.id_usuario = s.id_usuario
WHERE s.expira > NOW();
```

Las pruebas de estas reglas están en `backend/src/test/java/com/parqueadero/bd/UsuariosTest.java`
(restricciones de la base) y en `api/AutenticacionApiTest.java` y `api/UsuariosApiTest.java`
(API).
