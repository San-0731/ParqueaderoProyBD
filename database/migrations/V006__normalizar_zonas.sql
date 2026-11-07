-- =============================================================================
-- V006__normalizar_zonas.sql
-- Saca el piso y el tipo de vehículo de la tabla espacio y los pasa a una
-- tabla nueva, zona.
--
-- Por qué: hasta V005, cada espacio guardaba su piso, su zona y su tipo. Pero
-- una zona (por ejemplo, la A del piso 1) está demarcada para un solo tipo de
-- vehículo, así que se cumple la dependencia funcional
--     (piso, zona) -> id_tipo
-- y, con ella, id_espacio -> (piso, zona) -> id_tipo: el tipo dependía del
-- espacio solo A TRAVÉS de su zona. Es una dependencia transitiva, que la
-- tercera forma normal (3FN) no permite. Consecuencias:
--   - redundancia: el tipo se repetía en cada espacio de la zona (8 veces en
--     la zona A del piso 1);
--   - anomalía de inserción: nada impedía crear un espacio de motos en una
--     zona de carros, y no se podía crear una zona sin crear un espacio;
--   - anomalía de actualización: cambiarle el tipo a una zona obligaba a
--     modificar todos sus espacios, y si se escapaba uno la zona quedaba
--     mezclada.
--
-- Con la tabla zona, el piso y el tipo se guardan una sola vez por zona y la
-- regla "una zona, un tipo" se cumple por la estructura misma, sin triggers.
--
-- Nomenclatura: la misma letra puede repetirse en pisos distintos. Por eso la
-- llave única de zona es (piso, letra) y en pantalla la zona se nombra con la
-- letra seguida del piso: A1 es la zona A del piso 1, A2 la del piso 2. Un
-- espacio se nombra zona-número: A1-01.
--
-- Los ids de los espacios NO cambian, así que registro_parqueo no se toca.
-- Las vistas de V004 y los triggers de V005 que leían espacio.piso,
-- espacio.zona o espacio.id_tipo se vuelven a crear aquí (nunca se modifica una
-- migración ya aplicada).
--
-- Para aplicarla a una base que ya existe (la de desarrollo):
--   ./database/scripts/aplicar-migracion.sh database/migrations/V006__normalizar_zonas.sql
-- (hace un respaldo antes; ver documentacion/guia_docker.md).
-- =============================================================================

-- Los mensajes de los triggers llevan tildes; ver la nota de V002 sobre latin1.
SET NAMES utf8mb4;


-- -----------------------------------------------------------------------------
-- 1. Tabla zona: un área de un piso demarcada para un tipo de vehículo.
-- -----------------------------------------------------------------------------
CREATE TABLE zona (
    id_zona INT UNSIGNED NOT NULL AUTO_INCREMENT,
    piso    VARCHAR(2)   NOT NULL,
    letra   CHAR(1)      NOT NULL,
    id_tipo INT UNSIGNED NOT NULL,

    CONSTRAINT pk_zona PRIMARY KEY (id_zona),
    -- La misma letra puede repetirse en pisos distintos (A1, A2), pero no dos
    -- veces en el mismo piso.
    CONSTRAINT uq_zona_piso_letra UNIQUE (piso, letra),
    -- El piso es un número del 1 al 99, sin ceros a la izquierda ('1', no '01'):
    -- así '1' y '01' no pueden quedar como pisos distintos.
    CONSTRAINT chk_zona_piso_formato CHECK (REGEXP_LIKE(piso, '^[1-9][0-9]?$')),
    -- Una sola letra mayúscula. La bandera 'c' hace la comparación sensible a
    -- mayúsculas (sin ella, con la collation _ci, 'a' también pasaría).
    CONSTRAINT chk_zona_letra_formato CHECK (REGEXP_LIKE(letra, '^[A-Z]$', 'c')),

    INDEX idx_zona_tipo (id_tipo),

    CONSTRAINT fk_zona_tipo_vehiculo FOREIGN KEY (id_tipo)
        REFERENCES tipo_vehiculo (id_tipo)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 2. Pasar los datos: una zona por cada combinación distinta de piso, zona y
-- tipo que haya en espacio.
-- Esto también comprueba que los datos cumplen la regla: si una zona tuviera
-- espacios de dos tipos, saldrían dos filas con el mismo (piso, letra) y el
-- UNIQUE detendría la migración. Si un piso o una zona no cumplen el formato,
-- la detienen los CHECK. En ambos casos hay que corregir los datos (o
-- restaurar el respaldo) antes de volver a intentarlo.
-- -----------------------------------------------------------------------------
INSERT INTO zona (piso, letra, id_tipo)
SELECT DISTINCT piso, zona, id_tipo
FROM espacio;


-- -----------------------------------------------------------------------------
-- 3. Conectar cada espacio con su zona.
-- -----------------------------------------------------------------------------
ALTER TABLE espacio ADD COLUMN id_zona INT UNSIGNED NULL AFTER id_espacio;

UPDATE espacio e
JOIN zona z ON z.piso = e.piso AND z.letra = e.zona
SET e.id_zona = z.id_zona;


-- -----------------------------------------------------------------------------
-- 4. Quitar de espacio lo que ahora vive en zona.
-- Primero la llave foránea: InnoDB no deja borrar el índice que la sostiene
-- mientras ella exista.
-- -----------------------------------------------------------------------------
ALTER TABLE espacio
    DROP FOREIGN KEY fk_espacio_tipo_vehiculo,
    DROP INDEX uq_espacio_ubicacion;

ALTER TABLE espacio
    DROP INDEX idx_espacio_tipo,
    DROP COLUMN id_tipo,
    DROP COLUMN piso,
    DROP COLUMN zona,
    MODIFY COLUMN id_zona INT UNSIGNED NOT NULL,
    MODIFY COLUMN numero  VARCHAR(2)   NOT NULL,
    -- Dentro de una zona no se repite el número. Como empieza por id_zona,
    -- este índice también sirve a la llave foránea (no hace falta un idx_).
    ADD CONSTRAINT uq_espacio_zona_numero UNIQUE (id_zona, numero),
    -- Dos dígitos, del 01 al 99.
    ADD CONSTRAINT chk_espacio_numero_formato
        CHECK (REGEXP_LIKE(numero, '^(0[1-9]|[1-9][0-9])$')),
    ADD CONSTRAINT fk_espacio_zona FOREIGN KEY (id_zona)
        REFERENCES zona (id_zona)
        ON DELETE RESTRICT ON UPDATE RESTRICT;


-- -----------------------------------------------------------------------------
-- 5. Vistas de V004 que usaban espacio.piso, espacio.zona o espacio.id_tipo.
-- Ahora los toman de zona, pero conservan EXACTAMENTE los mismos nombres de
-- columna (piso, zona, numero, id_tipo): el código que consulta las vistas no
-- se entera del cambio de tablas. Es la independencia lógica de los datos que
-- dan las vistas.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_espacios_disponibles AS
SELECT
    e.id_espacio,
    z.piso,
    z.letra AS zona,
    e.numero,
    z.id_tipo,
    t.nombre AS tipo_vehiculo
FROM espacio e
JOIN zona z          ON z.id_zona = e.id_zona
JOIN tipo_vehiculo t ON t.id_tipo = z.id_tipo
WHERE e.habilitado = TRUE
  AND NOT EXISTS (
        SELECT 1
        FROM registro_parqueo r
        WHERE r.id_espacio = e.id_espacio
          AND r.estado = 'ACTIVO'
  );


CREATE OR REPLACE VIEW vw_parqueos_activos AS
SELECT
    r.id_registro,
    v.identificador AS placa,
    t.nombre AS tipo_vehiculo,
    c.documento AS documento_cliente,
    CONCAT(c.nombres, ' ', c.apellidos) AS nombre_cliente,
    e.id_espacio,
    z.piso,
    z.letra AS zona,
    e.numero,
    r.entrada,
    TIMESTAMPDIFF(MINUTE, r.entrada, NOW()) AS minutos_transcurridos
FROM registro_parqueo r
JOIN vehiculo v      ON v.id_vehiculo = r.id_vehiculo
JOIN tipo_vehiculo t ON t.id_tipo = v.id_tipo
JOIN cliente c       ON c.id_cliente = v.id_cliente
JOIN espacio e       ON e.id_espacio = r.id_espacio
JOIN zona z          ON z.id_zona = e.id_zona
WHERE r.estado = 'ACTIVO';


CREATE OR REPLACE VIEW vw_historial_parqueos AS
SELECT
    r.id_registro,
    v.identificador AS placa,
    t.nombre AS tipo_vehiculo,
    z.piso,
    z.letra AS zona,
    e.numero,
    r.entrada,
    r.salida,
    r.minutos_totales,
    r.valor_total,
    p.metodos_pago,
    p.referencias
FROM registro_parqueo r
JOIN vehiculo v      ON v.id_vehiculo = r.id_vehiculo
JOIN tipo_vehiculo t ON t.id_tipo = v.id_tipo
JOIN espacio e       ON e.id_espacio = r.id_espacio
JOIN zona z          ON z.id_zona = e.id_zona
LEFT JOIN (
    SELECT
        pg.id_registro,
        GROUP_CONCAT(m.nombre ORDER BY pg.id_pago SEPARATOR ' + ') AS metodos_pago,
        GROUP_CONCAT(pg.referencia ORDER BY pg.id_pago SEPARATOR ' + ') AS referencias
    FROM pago pg
    JOIN metodo_pago m ON m.id_metodo = pg.id_metodo
    GROUP BY pg.id_registro
) AS p ON p.id_registro = r.id_registro
WHERE r.estado = 'PAGO';


-- -----------------------------------------------------------------------------
-- 6. Triggers de V005 que leían espacio.id_tipo: se borran y se vuelven a
-- crear igual, salvo que el tipo del espacio ahora sale de su zona. Las reglas
-- y los mensajes no cambian.
-- -----------------------------------------------------------------------------
DROP TRIGGER trg_registro_validar_insert;
DROP TRIGGER trg_registro_validar_update;

DELIMITER $$

-- Al registrar una entrada: el vehículo debe ser del mismo tipo que la zona
-- del espacio y el espacio debe estar habilitado. Si el vehículo o el espacio
-- no existen, las variables quedan en NULL, no se lanza ningún SIGNAL y la
-- llave foránea responde con su propio error (1452).
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

    SELECT z.id_tipo, e.habilitado INTO v_tipo_espacio, v_habilitado
    FROM espacio e
    JOIN zona z ON z.id_zona = e.id_zona
    WHERE e.id_espacio = NEW.id_espacio;

    IF v_tipo_vehiculo <> v_tipo_espacio THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El tipo del vehículo no coincide con el tipo del espacio';
    END IF;

    IF v_habilitado = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El espacio no está habilitado';
    END IF;
END$$

-- Al modificar un registro: solo se valida si cambia el vehículo o el espacio
-- (por ejemplo, al mover un vehículo de espacio). Cerrar un registro no toca
-- esas columnas, así que se puede cerrar aunque el espacio se haya
-- deshabilitado mientras el vehículo estaba adentro.
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

        SELECT z.id_tipo, e.habilitado INTO v_tipo_espacio, v_habilitado
        FROM espacio e
        JOIN zona z ON z.id_zona = e.id_zona
        WHERE e.id_espacio = NEW.id_espacio;

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
