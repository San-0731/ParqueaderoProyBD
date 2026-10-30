-- =============================================================================
-- V005__triggers.sql
-- Triggers definidos en la especificación (sección "Reglas implementadas con
-- triggers"):
--   1. Normalizar el identificador del vehículo (mayúsculas, sin espacios ni
--      guiones).
--   2. El tipo del vehículo debe coincidir con el tipo del espacio.
--   3. Solo se puede parquear en espacios habilitados.
--
-- Un trigger es código que MySQL ejecuta automáticamente antes o después de un
-- INSERT, UPDATE o DELETE sobre una tabla. NEW es la fila que se va a guardar
-- (en un BEFORE se puede modificar) y OLD es la fila como estaba (en UPDATE).
-- Los triggers BEFORE se ejecutan antes de revisar los CHECK, por eso
-- 'abc-123' se normaliza a 'ABC123' y luego pasa el CHECK de formato.
--
-- Para rechazar una operación se usa SIGNAL SQLSTATE '45000' (error 1644) con
-- un mensaje que la aplicación puede mostrar al usuario.
--
-- DELIMITER cambia el fin de instrucción a $$ para que los ';' dentro del
-- cuerpo del trigger no corten la instrucción CREATE TRIGGER.
-- =============================================================================

-- Los mensajes llevan tildes; ver la nota de V002 sobre latin1.
SET NAMES utf8mb4;

DELIMITER $$


-- -----------------------------------------------------------------------------
-- Trigger 1: normalizar el identificador del vehículo al crearlo y al
-- modificarlo, para que 'abc-123', 'ABC 123' y 'ABC123' no queden como
-- vehículos distintos.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_vehiculo_normalizar_insert
BEFORE INSERT ON vehiculo
FOR EACH ROW
BEGIN
    SET NEW.identificador = UPPER(REPLACE(REPLACE(NEW.identificador, ' ', ''), '-', ''));
END$$

CREATE TRIGGER trg_vehiculo_normalizar_update
BEFORE UPDATE ON vehiculo
FOR EACH ROW
BEGIN
    SET NEW.identificador = UPPER(REPLACE(REPLACE(NEW.identificador, ' ', ''), '-', ''));
END$$


-- -----------------------------------------------------------------------------
-- Triggers 2 y 3 al registrar una entrada (combinados en un solo trigger, como
-- pide la especificación): el vehículo debe ser del mismo tipo que el espacio
-- y el espacio debe estar habilitado.
-- Si el vehículo o el espacio no existen, las variables quedan en NULL, no se
-- lanza ningún SIGNAL y la llave foránea responde con su propio error (1452).
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_registro_validar_insert
BEFORE INSERT ON registro_parqueo
FOR EACH ROW
BEGIN
    DECLARE v_tipo_vehiculo INT UNSIGNED;
    DECLARE v_tipo_espacio  INT UNSIGNED;
    DECLARE v_habilitado    BOOLEAN;

    SELECT id_tipo INTO v_tipo_vehiculo
    FROM vehiculo
    WHERE id_vehiculo = NEW.id_vehiculo;

    SELECT id_tipo, habilitado INTO v_tipo_espacio, v_habilitado
    FROM espacio
    WHERE id_espacio = NEW.id_espacio;

    IF v_tipo_vehiculo <> v_tipo_espacio THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El tipo del vehículo no coincide con el tipo del espacio';
    END IF;

    IF v_habilitado = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El espacio no está habilitado';
    END IF;
END$$


-- -----------------------------------------------------------------------------
-- Triggers 2 y 3 al modificar un registro. Solo se valida si cambia el
-- vehículo o el espacio (por ejemplo, al mover un vehículo de espacio). Cerrar
-- un registro no toca esas columnas, así que se puede cerrar aunque el espacio
-- se haya deshabilitado mientras el vehículo estaba adentro.
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_registro_validar_update
BEFORE UPDATE ON registro_parqueo
FOR EACH ROW
BEGIN
    DECLARE v_tipo_vehiculo INT UNSIGNED;
    DECLARE v_tipo_espacio  INT UNSIGNED;
    DECLARE v_habilitado    BOOLEAN;

    IF NEW.id_vehiculo <> OLD.id_vehiculo OR NEW.id_espacio <> OLD.id_espacio THEN
        SELECT id_tipo INTO v_tipo_vehiculo
        FROM vehiculo
        WHERE id_vehiculo = NEW.id_vehiculo;

        SELECT id_tipo, habilitado INTO v_tipo_espacio, v_habilitado
        FROM espacio
        WHERE id_espacio = NEW.id_espacio;

        IF v_tipo_vehiculo <> v_tipo_espacio THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'El tipo del vehículo no coincide con el tipo del espacio';
        END IF;

        -- Solo si se mueve a otro espacio: no se puede llevar a uno deshabilitado.
        IF NEW.id_espacio <> OLD.id_espacio AND v_habilitado = FALSE THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'El espacio no está habilitado';
        END IF;
    END IF;
END$$


DELIMITER ;
