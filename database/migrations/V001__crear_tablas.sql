-- =============================================================================
-- V001__crear_tablas.sql
-- Esquema inicial del sistema de parqueadero (MySQL 8.4, InnoDB, utf8mb4).
-- Basado en especificacion_bd_parqueadero.md.
--
-- - No crea la base de datos ni hace USE: Docker crea la base a partir de
--   DB_NAME (.env) y ejecuta este script dentro de ella. Para correrlo a mano:
--   mysql -u <usuario> -p <base> < V001__crear_tablas.sql
-- - Las tablas se crean en orden de dependencias (primero las referenciadas).
-- - Prefijos de las restricciones: pk_ (llave primaria), fk_ (llave foránea),
--   uq_ (única), chk_ (CHECK), idx_ (índice). MySQL acepta el nombre pk_...,
--   pero internamente la llave primaria siempre se llama PRIMARY.
-- - Todas las llaves foráneas usan ON DELETE RESTRICT ON UPDATE RESTRICT para
--   no perder el historial de parqueos y pagos. Las llaves primarias son
--   AUTO_INCREMENT y nunca se actualizan, así que ON UPDATE CASCADE no aportaría
--   nada.
-- - Cada columna FK tiene un índice idx_ explícito: InnoDB exige un índice en
--   cada FK y, si no existe, crea uno con el nombre de la FK (fk_...). Se omite
--   cuando un UNIQUE compuesto ya empieza por esa columna.
-- - La collation utf8mb4_unicode_ci coincide con la del servidor
--   (docker-compose.yml). Si solo se indicara el charset, MySQL usaría
--   utf8mb4_0900_ai_ci y quedarían collations mezcladas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- tipo_vehiculo: catálogo de tipos de vehículo (moto, bicicleta, carro, camión).
-- -----------------------------------------------------------------------------
CREATE TABLE tipo_vehiculo (
    id_tipo INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre  VARCHAR(30)  NOT NULL,

    CONSTRAINT pk_tipo_vehiculo PRIMARY KEY (id_tipo),
    CONSTRAINT uq_tipo_vehiculo_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- tarifa: precio por hora de cada tipo de vehículo a lo largo del tiempo
-- (relación 1:N con tipo_vehiculo). La tarifa aplicable a un parqueo es la del
-- vigente_desde más reciente que no sea posterior a la fecha de entrada; esa
-- regla la aplica el backend.
-- -----------------------------------------------------------------------------
CREATE TABLE tarifa (
    id_tarifa     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_tipo       INT UNSIGNED  NOT NULL,
    valor_hora    DECIMAL(10,2) NOT NULL,
    vigente_desde DATE          NOT NULL,

    CONSTRAINT pk_tarifa PRIMARY KEY (id_tarifa),
    -- Dos tarifas del mismo tipo no pueden empezar el mismo día.
    -- Como empieza por id_tipo, este índice también sirve a la FK.
    CONSTRAINT uq_tarifa_tipo_vigencia UNIQUE (id_tipo, vigente_desde),
    -- El precio por hora siempre debe ser positivo.
    CONSTRAINT chk_tarifa_valor_hora_positivo CHECK (valor_hora > 0),
    CONSTRAINT fk_tarifa_tipo_vehiculo FOREIGN KEY (id_tipo)
        REFERENCES tipo_vehiculo (id_tipo)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- marca: fabricantes de vehículos (Chevrolet, Yamaha, ...).
-- -----------------------------------------------------------------------------
CREATE TABLE marca (
    id_marca INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre   VARCHAR(50)  NOT NULL,

    CONSTRAINT pk_marca PRIMARY KEY (id_marca),
    CONSTRAINT uq_marca_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- modelo: línea comercial de una marca (Spark, NMAX, NHR). No incluye el año,
-- que es propio de cada vehículo. Separar marca y modelo evita la dependencia
-- transitiva modelo -> marca (tercera forma normal).
-- -----------------------------------------------------------------------------
CREATE TABLE modelo (
    id_modelo INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_marca  INT UNSIGNED NOT NULL,
    nombre    VARCHAR(60)  NOT NULL,

    CONSTRAINT pk_modelo PRIMARY KEY (id_modelo),
    -- Una marca no puede tener dos modelos con el mismo nombre; marcas
    -- distintas sí. Como empieza por id_marca, este índice también sirve a la FK.
    CONSTRAINT uq_modelo_marca_nombre UNIQUE (id_marca, nombre),
    CONSTRAINT fk_modelo_marca FOREIGN KEY (id_marca)
        REFERENCES marca (id_marca)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- cliente: propietarios de los vehículos.
-- -----------------------------------------------------------------------------
CREATE TABLE cliente (
    id_cliente INT UNSIGNED NOT NULL AUTO_INCREMENT,
    documento  VARCHAR(20)  NOT NULL,
    nombres    VARCHAR(80)  NOT NULL,
    apellidos  VARCHAR(80)  NOT NULL,
    telefono   VARCHAR(15)  NULL,

    CONSTRAINT pk_cliente PRIMARY KEY (id_cliente),
    -- Un documento de identidad corresponde a un solo cliente.
    CONSTRAINT uq_cliente_documento UNIQUE (documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- vehiculo: cada vehículo registrado. identificador guarda la placa (motos,
-- carros, camiones) o el número de marco o código interno (bicicletas); es lo
-- que el operario lee en el vehículo y lo que se busca. id_vehiculo es una
-- llave sustituta interna, necesaria porque las bicicletas no tienen placa.
-- -----------------------------------------------------------------------------
CREATE TABLE vehiculo (
    id_vehiculo   INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    identificador VARCHAR(40)       NOT NULL,
    id_tipo       INT UNSIGNED      NOT NULL,
    id_modelo     INT UNSIGNED      NULL,  -- opcional: muchas bicicletas no tienen modelo identificable
    id_cliente    INT UNSIGNED      NOT NULL,
    color         VARCHAR(30)       NULL,
    anio          SMALLINT UNSIGNED NULL,

    CONSTRAINT pk_vehiculo PRIMARY KEY (id_vehiculo),
    -- La placa o código no se repite. Este UNIQUE es también el índice para
    -- buscar por placa; un idx_ aparte sería un índice duplicado.
    CONSTRAINT uq_vehiculo_identificador UNIQUE (identificador),
    -- Solo letras mayúsculas y dígitos, sin espacios ni guiones. La bandera 'c'
    -- hace la comparación sensible a mayúsculas: sin ella, con la collation _ci,
    -- 'abc123' también pasaría. El formato exacto de placa de carro (ABC123) lo
    -- valida la aplicación, porque esta columna también guarda placas de moto
    -- (ABC12D) y códigos de bicicleta.
    CONSTRAINT chk_vehiculo_identificador_formato
        CHECK (REGEXP_LIKE(identificador, '^[A-Z0-9]+$', 'c')),
    CONSTRAINT chk_vehiculo_anio_rango CHECK (anio BETWEEN 1900 AND 2100),

    INDEX idx_vehiculo_tipo (id_tipo),
    INDEX idx_vehiculo_modelo (id_modelo),
    INDEX idx_vehiculo_cliente (id_cliente),

    CONSTRAINT fk_vehiculo_tipo_vehiculo FOREIGN KEY (id_tipo)
        REFERENCES tipo_vehiculo (id_tipo)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_vehiculo_modelo FOREIGN KEY (id_modelo)
        REFERENCES modelo (id_modelo)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_vehiculo_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- espacio: cada lugar de parqueo, demarcado para un tipo de vehículo.
-- habilitado indica si está en servicio. La ocupación NO se guarda aquí: se
-- calcula desde registro_parqueo (registro con salida en NULL).
-- -----------------------------------------------------------------------------
CREATE TABLE espacio (
    id_espacio INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_tipo    INT UNSIGNED NOT NULL,
    piso       VARCHAR(10)  NOT NULL,
    zona       VARCHAR(10)  NOT NULL,
    numero     VARCHAR(10)  NOT NULL,
    habilitado BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_espacio PRIMARY KEY (id_espacio),
    -- No puede haber dos espacios en la misma ubicación física.
    CONSTRAINT uq_espacio_ubicacion UNIQUE (piso, zona, numero),

    INDEX idx_espacio_tipo (id_tipo),

    CONSTRAINT fk_espacio_tipo_vehiculo FOREIGN KEY (id_tipo)
        REFERENCES tipo_vehiculo (id_tipo)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- registro_parqueo: entidad central. Se crea cuando el vehículo entra y se
-- completa cuando sale. minutos_totales y valor_total son derivados, pero se
-- guardan a propósito como foto del cobro, para que un cambio de tarifa futuro
-- no altere cobros pasados. La tarifa no se guarda aquí: se deduce de
-- vehiculo -> tipo -> tarifa.
--
-- estado indica en qué punto está el registro:
--   'ACTIVO' -> el vehículo sigue adentro (sin salida ni cobro).
--   'PAGO'   -> el vehículo salió y el cobro quedó registrado.
-- Al cerrar el registro, la aplicación guarda salida, minutos_totales,
-- valor_total y estado = 'PAGO', e inserta los pagos en la misma transacción.
-- -----------------------------------------------------------------------------
CREATE TABLE registro_parqueo (
    id_registro     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_vehiculo     INT UNSIGNED  NOT NULL,
    id_espacio      INT UNSIGNED  NOT NULL,
    entrada         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    salida          DATETIME      NULL,
    minutos_totales INT UNSIGNED  NULL,
    valor_total     DECIMAL(10,2) NULL,
    -- utf8mb4_bin compara distinguiendo mayúsculas: 'activo' no es válido.
    -- Por defecto 'ACTIVO': al registrar una entrada no hace falta indicarlo.
    estado          VARCHAR(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
                    NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT pk_registro_parqueo PRIMARY KEY (id_registro),
    -- Solo existen dos estados.
    CONSTRAINT chk_registro_estado_valido CHECK (estado IN ('ACTIVO', 'PAGO')),
    -- El estado debe coincidir con los datos del cobro: un registro ACTIVO no
    -- tiene salida ni cobro; uno PAGO los tiene todos.
    CONSTRAINT chk_registro_estado_coherente
        CHECK ((estado = 'ACTIVO' AND salida IS NULL AND minutos_totales IS NULL AND valor_total IS NULL)
            OR (estado = 'PAGO' AND salida IS NOT NULL AND minutos_totales IS NOT NULL AND valor_total IS NOT NULL)),
    -- La salida debe ser posterior a la entrada.
    CONSTRAINT chk_registro_salida_posterior
        CHECK (salida IS NULL OR salida > entrada),
    -- Los minutos guardados deben ser exactamente los que hay entre entrada y
    -- salida (TIMESTAMPDIFF es determinista, por eso se permite en un CHECK).
    CONSTRAINT chk_registro_minutos_coherentes
        CHECK (minutos_totales IS NULL OR minutos_totales = TIMESTAMPDIFF(MINUTE, entrada, salida)),
    -- Puede ser 0 (por ejemplo, un tiempo de gracia), pero nunca negativo.
    CONSTRAINT chk_registro_valor_total_no_negativo CHECK (valor_total >= 0),

    -- Un vehículo no puede tener dos registros ACTIVO, ni un espacio dos
    -- vehículos a la vez. Son índices UNIQUE funcionales: indexan el resultado
    -- de la expresión, que vale el id si el registro está ACTIVO y NULL si está
    -- PAGO. Un UNIQUE admite muchos NULL, así que los registros pagados nunca
    -- chocan y solo se comparan los activos. MySQL guarda la expresión en una
    -- columna virtual oculta: no aparece en SELECT * ni se llena en el INSERT.
    -- Lo garantiza la base aunque dos operarios registren al mismo tiempo.
    UNIQUE INDEX uq_registro_vehiculo_activo ((IF(estado = 'ACTIVO', id_vehiculo, NULL))),
    UNIQUE INDEX uq_registro_espacio_activo ((IF(estado = 'ACTIVO', id_espacio, NULL))),

    INDEX idx_registro_entrada (entrada),  -- consultas y reportes por fecha de entrada
    INDEX idx_registro_vehiculo (id_vehiculo),
    INDEX idx_registro_espacio (id_espacio),

    CONSTRAINT fk_registro_vehiculo FOREIGN KEY (id_vehiculo)
        REFERENCES vehiculo (id_vehiculo)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_registro_espacio FOREIGN KEY (id_espacio)
        REFERENCES espacio (id_espacio)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- metodo_pago: catálogo de formas de pago (PSE, Nequi, Daviplata, Efectivo).
-- requiere_referencia indica si el método exige un código de transacción
-- (pago.referencia). Esa regla la valida la aplicación al registrar el pago.
-- No tiene DEFAULT para obligar a indicarlo al crear cada método.
-- -----------------------------------------------------------------------------
CREATE TABLE metodo_pago (
    id_metodo           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre              VARCHAR(20)  NOT NULL,
    requiere_referencia BOOLEAN      NOT NULL,

    CONSTRAINT pk_metodo_pago PRIMARY KEY (id_metodo),
    CONSTRAINT uq_metodo_pago_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- pago: pagos de un registro de parqueo. Un registro puede tener varios pagos
-- (relación 1:N), lo que permite dividir el cobro entre métodos. Que la suma
-- de los pagos sea igual a valor_total lo controla la aplicación.
-- -----------------------------------------------------------------------------
CREATE TABLE pago (
    id_pago     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_registro INT UNSIGNED  NOT NULL,
    id_metodo   INT UNSIGNED  NOT NULL,
    monto       DECIMAL(10,2) NOT NULL,
    fecha_pago  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    referencia  VARCHAR(60)   NULL,  -- código de transacción de PSE, Nequi o Daviplata; NULL en efectivo

    CONSTRAINT pk_pago PRIMARY KEY (id_pago),
    -- Un código de transacción no puede registrarse dos veces. Los pagos en
    -- efectivo llevan NULL y no chocan entre sí.
    CONSTRAINT uq_pago_referencia UNIQUE (referencia),
    -- Todo pago debe ser por un monto positivo.
    CONSTRAINT chk_pago_monto_positivo CHECK (monto > 0),

    INDEX idx_pago_fecha_pago (fecha_pago),  -- consultas y reportes por fecha de pago
    INDEX idx_pago_registro (id_registro),
    INDEX idx_pago_metodo (id_metodo),

    CONSTRAINT fk_pago_registro FOREIGN KEY (id_registro)
        REFERENCES registro_parqueo (id_registro)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_pago_metodo FOREIGN KEY (id_metodo)
        REFERENCES metodo_pago (id_metodo)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
