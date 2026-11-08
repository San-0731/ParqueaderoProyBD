-- =============================================================================
-- V007__usuarios_y_sesiones.sql
-- Usuarios de la APLICACIÓN (las personas que inician sesión en la web), sus
-- roles y sus sesiones.
--
-- Ojo: no son usuarios de MySQL. El backend sigue conectándose a MySQL con una
-- sola cuenta (DB_USER del .env); estas tablas solo guardan quién puede entrar
-- a la aplicación y con qué rol. El backend revisa el rol en cada petición.
--
-- Roles (jerárquicos: cada uno puede todo lo del anterior):
--   OPERADOR      entradas, salidas y registrar vehículos y clientes nuevos.
--   ADMINISTRADOR además edita vehículos y propietarios, habilita o
--                 deshabilita espacios y ve los reportes y la auditoría de
--                 los operadores.
--   DBA           además administra usuarios, zonas, espacios, marcas y modelos.
--
-- El primer DBA no se crea aquí (sería escribir una contraseña en el código):
-- lo crea el backend al arrancar, con DBA_USUARIO y DBA_CLAVE_INICIAL del .env.
--
-- Para aplicarla a una base que ya existe (la de desarrollo):
--   ./database/scripts/aplicar-migracion.sh database/migrations/V007__usuarios_y_sesiones.sql
-- =============================================================================

SET NAMES utf8mb4;


-- -----------------------------------------------------------------------------
-- rol: catálogo de roles de la aplicación.
-- -----------------------------------------------------------------------------
CREATE TABLE rol (
    id_rol INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(20)  NOT NULL,

    CONSTRAINT pk_rol PRIMARY KEY (id_rol),
    CONSTRAINT uq_rol_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO rol (nombre) VALUES
    ('DBA'),
    ('ADMINISTRADOR'),
    ('OPERADOR');


-- -----------------------------------------------------------------------------
-- usuario: personas que pueden iniciar sesión en la aplicación.
--
-- clave_hash NUNCA guarda la contraseña: guarda el resultado de PBKDF2 con una
-- sal aleatoria, en el formato pbkdf2_sha256$<iteraciones>$<sal>$<hash>
-- (sal y hash en Base64). Lo calcula el backend (util/Contrasenas.java). Como
-- cada usuario tiene su propia sal, dos contraseñas iguales dan hashes
-- distintos.
--
-- Los usuarios no se borran: se desactivan (activo = FALSE). Así no se pierde
-- quién hizo cada cambio en la auditoría.
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_usuario  VARCHAR(30)  NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    clave_hash      VARCHAR(255) NOT NULL,
    id_rol          INT UNSIGNED NOT NULL,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuario_nombre_usuario UNIQUE (nombre_usuario),
    -- De 3 a 30 caracteres: minúsculas sin tildes, números, punto y guion bajo
    -- (por ejemplo, ana.perez o operador_2). La bandera 'c' hace la
    -- comparación sensible a mayúsculas: 'Ana' no pasa.
    CONSTRAINT chk_usuario_nombre_formato
        CHECK (REGEXP_LIKE(nombre_usuario, '^[a-z0-9._]{3,30}$', 'c')),
    -- El nombre completo no puede quedar en blanco.
    CONSTRAINT chk_usuario_nombre_completo_no_vacio CHECK (TRIM(nombre_completo) <> ''),

    INDEX idx_usuario_rol (id_rol),

    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- sesion: sesiones abiertas. Al iniciar sesión, el backend genera un token
-- aleatorio y se lo entrega al navegador, que lo envía en cada petición
-- (cabecera Authorization: Bearer <token>).
--
-- Aquí NO se guarda el token, sino su hash SHA-256 (64 caracteres en
-- hexadecimal). Si alguien leyera esta tabla (por ejemplo, de un respaldo), no
-- podría usar esos datos para hacerse pasar por nadie.
--
-- Una sesión dura un turno (8 horas, lo decide el backend). Cerrar sesión, o
-- desactivar al usuario, borra sus filas.
-- -----------------------------------------------------------------------------
CREATE TABLE sesion (
    token_hash CHAR(64)     NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    creada     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira     DATETIME     NOT NULL,

    CONSTRAINT pk_sesion PRIMARY KEY (token_hash),
    -- Exactamente 64 dígitos hexadecimales en minúscula (lo que produce SHA-256).
    CONSTRAINT chk_sesion_token_hash_formato
        CHECK (REGEXP_LIKE(token_hash, '^[0-9a-f]{64}$', 'c')),
    CONSTRAINT chk_sesion_expira_posterior CHECK (expira > creada),

    INDEX idx_sesion_usuario (id_usuario),
    INDEX idx_sesion_expira (expira),  -- para borrar las sesiones vencidas

    CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
