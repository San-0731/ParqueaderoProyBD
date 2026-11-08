-- =============================================================================
-- V008__auditoria.sql
-- Auditoría: quién cambió qué y cuándo, registrado por TRIGGERS.
--
-- Qué se audita: los INSERT y UPDATE que hacen operadores y administradores
-- desde la aplicación en cliente, vehiculo, registro_parqueo (entradas y
-- salidas), pago y espacio (habilitar o deshabilitar). 8 triggers AFTER: se
-- ejecutan después de guardar la fila, así solo queda lo que de verdad se
-- guardó. Como corren dentro de la misma transacción, si la operación se
-- deshace (rollback), su fila de auditoría también.
--
-- Qué NO se audita (decisión del proyecto):
--   - lo que hace el DBA, ni desde la aplicación ni directamente en MySQL;
--   - los DELETE (la aplicación nunca borra);
--   - zona, marca, modelo y usuario: solo los cambia el DBA.
--
-- Cómo sabe el trigger quién hizo el cambio: MySQL no sabe quién inició sesión
-- en la web (el backend siempre se conecta con la misma cuenta). Por eso el
-- backend, al abrir cada conexión, ejecuta SET @id_usuario_app = <id>, una
-- variable de sesión que solo existe en esa conexión, y los triggers la leen.
-- Un cambio hecho fuera de la aplicación no tiene esa variable (vale NULL) y
-- no se audita.
--
-- Quién ve qué: el DBA, todo (vista vw_auditoria); el administrador, solo los
-- cambios de los operadores (vista vw_auditoria_operadores). El backend elige
-- la vista según el rol.
--
-- Para aplicarla a una base que ya existe (la de desarrollo):
--   ./database/scripts/aplicar-migracion.sh database/migrations/V008__auditoria.sql
-- =============================================================================

SET NAMES utf8mb4;


-- -----------------------------------------------------------------------------
-- auditoria: una fila por cada cambio auditado.
-- id_fila no es llave foránea: apunta a tablas distintas según "tabla".
-- id_rol es el rol que tenía el usuario EN ESE MOMENTO (una foto, como
-- valor_total en registro_parqueo): si un operador asciende a administrador,
-- lo que hizo como operador sigue viéndose como de operador.
-- datos_antes y datos_despues guardan la fila como JSON, con algunos datos
-- legibles (placa, código del espacio...) para que la pantalla no tenga que
-- buscarlos: así una sola tabla sirve para todas.
-- -----------------------------------------------------------------------------
CREATE TABLE auditoria (
    id_auditoria  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    fecha         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tabla         VARCHAR(30)     NOT NULL,
    operacion     VARCHAR(6)      NOT NULL,
    id_fila       INT UNSIGNED    NOT NULL,
    id_usuario    INT UNSIGNED    NOT NULL,
    id_rol        INT UNSIGNED    NOT NULL,
    datos_antes   JSON            NULL,
    datos_despues JSON            NOT NULL,

    CONSTRAINT pk_auditoria PRIMARY KEY (id_auditoria),
    CONSTRAINT chk_auditoria_tabla
        CHECK (tabla IN ('cliente', 'vehiculo', 'espacio', 'registro_parqueo', 'pago')),
    CONSTRAINT chk_auditoria_operacion CHECK (operacion IN ('INSERT', 'UPDATE')),
    -- Un INSERT no tiene "antes"; un UPDATE sí.
    CONSTRAINT chk_auditoria_datos_coherentes
        CHECK ((operacion = 'INSERT' AND datos_antes IS NULL)
            OR (operacion = 'UPDATE' AND datos_antes IS NOT NULL)),

    INDEX idx_auditoria_fecha (fecha),              -- filtrar por fechas
    INDEX idx_auditoria_tabla_fila (tabla, id_fila), -- la historia de una fila
    INDEX idx_auditoria_usuario (id_usuario),
    INDEX idx_auditoria_rol (id_rol),

    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_auditoria_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DELIMITER $$

-- -----------------------------------------------------------------------------
-- fn_rol_auditable: el rol del usuario si sus cambios se auditan, o NULL si no
-- (no hay usuario de la aplicación, no existe o es DBA). La usan los 8
-- triggers, para no repetir la misma consulta en cada uno.
-- READS SQL DATA: solo lee datos (con el registro binario activo, MySQL exige
-- declararlo para crear una función).
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_rol_auditable(p_id_usuario INT UNSIGNED)
RETURNS INT UNSIGNED
READS SQL DATA
BEGIN
    DECLARE v_id_rol INT UNSIGNED;
    DECLARE v_rol    VARCHAR(20);

    IF p_id_usuario IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT u.id_rol, r.nombre INTO v_id_rol, v_rol
    FROM usuario u
    JOIN rol r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = p_id_usuario;

    IF v_rol IS NULL OR v_rol = 'DBA' THEN
        RETURN NULL;
    END IF;
    RETURN v_id_rol;
END$$


-- -----------------------------------------------------------------------------
-- cliente
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_cliente_auditar_insert
AFTER INSERT ON cliente
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_despues)
        VALUES ('cliente', 'INSERT', NEW.id_cliente, @id_usuario_app, v_id_rol,
                JSON_OBJECT('documento', NEW.documento, 'nombres', NEW.nombres,
                            'apellidos', NEW.apellidos, 'telefono', NEW.telefono));
    END IF;
END$$

CREATE TRIGGER trg_cliente_auditar_update
AFTER UPDATE ON cliente
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_antes, datos_despues)
        VALUES ('cliente', 'UPDATE', NEW.id_cliente, @id_usuario_app, v_id_rol,
                JSON_OBJECT('documento', OLD.documento, 'nombres', OLD.nombres,
                            'apellidos', OLD.apellidos, 'telefono', OLD.telefono),
                JSON_OBJECT('documento', NEW.documento, 'nombres', NEW.nombres,
                            'apellidos', NEW.apellidos, 'telefono', NEW.telefono));
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- vehiculo (con el tipo, la marca y modelo y el documento del propietario,
-- para que el cambio se entienda sin buscar los id)
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_vehiculo_auditar_insert
AFTER INSERT ON vehiculo
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_despues)
        VALUES ('vehiculo', 'INSERT', NEW.id_vehiculo, @id_usuario_app, v_id_rol,
                JSON_OBJECT(
                    'placa', NEW.identificador,
                    'tipo', (SELECT nombre FROM tipo_vehiculo WHERE id_tipo = NEW.id_tipo),
                    'modelo', (SELECT CONCAT(ma.nombre, ' ', mo.nombre) FROM modelo mo
                               JOIN marca ma ON ma.id_marca = mo.id_marca
                               WHERE mo.id_modelo = NEW.id_modelo),
                    'propietario', (SELECT documento FROM cliente WHERE id_cliente = NEW.id_cliente),
                    'color', NEW.color, 'anio', NEW.anio));
    END IF;
END$$

CREATE TRIGGER trg_vehiculo_auditar_update
AFTER UPDATE ON vehiculo
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_antes, datos_despues)
        VALUES ('vehiculo', 'UPDATE', NEW.id_vehiculo, @id_usuario_app, v_id_rol,
                JSON_OBJECT(
                    'placa', OLD.identificador,
                    'tipo', (SELECT nombre FROM tipo_vehiculo WHERE id_tipo = OLD.id_tipo),
                    'modelo', (SELECT CONCAT(ma.nombre, ' ', mo.nombre) FROM modelo mo
                               JOIN marca ma ON ma.id_marca = mo.id_marca
                               WHERE mo.id_modelo = OLD.id_modelo),
                    'propietario', (SELECT documento FROM cliente WHERE id_cliente = OLD.id_cliente),
                    'color', OLD.color, 'anio', OLD.anio),
                JSON_OBJECT(
                    'placa', NEW.identificador,
                    'tipo', (SELECT nombre FROM tipo_vehiculo WHERE id_tipo = NEW.id_tipo),
                    'modelo', (SELECT CONCAT(ma.nombre, ' ', mo.nombre) FROM modelo mo
                               JOIN marca ma ON ma.id_marca = mo.id_marca
                               WHERE mo.id_modelo = NEW.id_modelo),
                    'propietario', (SELECT documento FROM cliente WHERE id_cliente = NEW.id_cliente),
                    'color', NEW.color, 'anio', NEW.anio));
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- registro_parqueo: INSERT = entrada; UPDATE = salida (estado ACTIVO → PAGO).
-- El espacio va con su código de pantalla (A1-01).
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_registro_parqueo_auditar_insert
AFTER INSERT ON registro_parqueo
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_despues)
        VALUES ('registro_parqueo', 'INSERT', NEW.id_registro, @id_usuario_app, v_id_rol,
                JSON_OBJECT(
                    'placa', (SELECT identificador FROM vehiculo WHERE id_vehiculo = NEW.id_vehiculo),
                    'espacio', (SELECT CONCAT(z.letra, z.piso, '-', e.numero) FROM espacio e
                                JOIN zona z ON z.id_zona = e.id_zona
                                WHERE e.id_espacio = NEW.id_espacio),
                    'entrada', DATE_FORMAT(NEW.entrada, '%Y-%m-%d %H:%i:%s'),
                    'estado', NEW.estado));
    END IF;
END$$

CREATE TRIGGER trg_registro_parqueo_auditar_update
AFTER UPDATE ON registro_parqueo
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_antes, datos_despues)
        VALUES ('registro_parqueo', 'UPDATE', NEW.id_registro, @id_usuario_app, v_id_rol,
                JSON_OBJECT(
                    'placa', (SELECT identificador FROM vehiculo WHERE id_vehiculo = OLD.id_vehiculo),
                    'salida', DATE_FORMAT(OLD.salida, '%Y-%m-%d %H:%i:%s'),
                    'minutos_totales', OLD.minutos_totales,
                    'valor_total', OLD.valor_total,
                    'estado', OLD.estado),
                JSON_OBJECT(
                    'placa', (SELECT identificador FROM vehiculo WHERE id_vehiculo = NEW.id_vehiculo),
                    'salida', DATE_FORMAT(NEW.salida, '%Y-%m-%d %H:%i:%s'),
                    'minutos_totales', NEW.minutos_totales,
                    'valor_total', NEW.valor_total,
                    'estado', NEW.estado));
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- pago (solo INSERT: los pagos no se modifican)
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_pago_auditar_insert
AFTER INSERT ON pago
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_despues)
        VALUES ('pago', 'INSERT', NEW.id_pago, @id_usuario_app, v_id_rol,
                JSON_OBJECT(
                    'placa', (SELECT v.identificador FROM registro_parqueo r
                              JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo
                              WHERE r.id_registro = NEW.id_registro),
                    'id_registro', NEW.id_registro,
                    'metodo', (SELECT nombre FROM metodo_pago WHERE id_metodo = NEW.id_metodo),
                    'monto', NEW.monto,
                    'referencia', NEW.referencia));
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- espacio (solo UPDATE: la aplicación solo cambia "habilitado"; crear espacios
-- es del DBA, que no se audita). CAST(... AS JSON) guarda true o false (no 1 o 0).
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_espacio_auditar_update
AFTER UPDATE ON espacio
FOR EACH ROW
BEGIN
    DECLARE v_id_rol INT UNSIGNED DEFAULT fn_rol_auditable(@id_usuario_app);
    IF v_id_rol IS NOT NULL THEN
        INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_antes, datos_despues)
        VALUES ('espacio', 'UPDATE', NEW.id_espacio, @id_usuario_app, v_id_rol,
                JSON_OBJECT(
                    'espacio', (SELECT CONCAT(z.letra, z.piso, '-', OLD.numero) FROM zona z
                                WHERE z.id_zona = OLD.id_zona),
                    'habilitado', CAST(IF(OLD.habilitado, 'true', 'false') AS JSON)),
                JSON_OBJECT(
                    'espacio', (SELECT CONCAT(z.letra, z.piso, '-', NEW.numero) FROM zona z
                                WHERE z.id_zona = NEW.id_zona),
                    'habilitado', CAST(IF(NEW.habilitado, 'true', 'false') AS JSON)));
    END IF;
END$$

DELIMITER ;


-- -----------------------------------------------------------------------------
-- Vistas para consultar la auditoría con el nombre del usuario y su rol.
-- vw_auditoria: todo (lo usa el DBA).
-- vw_auditoria_operadores: solo los cambios hechos con rol OPERADOR (lo usa
-- el administrador). Filtrar en una vista, y no solo en el código, deja la
-- regla en la base: quien consulte esa vista nunca ve los cambios de otros
-- administradores.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_auditoria AS
SELECT
    a.id_auditoria,
    a.fecha,
    a.tabla,
    a.operacion,
    a.id_fila,
    a.id_usuario,
    u.nombre_usuario,
    u.nombre_completo,
    r.nombre AS rol,
    a.datos_antes,
    a.datos_despues
FROM auditoria a
JOIN usuario u ON u.id_usuario = a.id_usuario
JOIN rol r     ON r.id_rol = a.id_rol;

CREATE VIEW vw_auditoria_operadores AS
SELECT *
FROM vw_auditoria
WHERE rol = 'OPERADOR';
