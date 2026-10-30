-- =============================================================================
-- V002__datos_catalogo.sql
-- Datos de catálogo: tipos de vehículo, métodos de pago, tarifas y espacios.
-- Son datos que el sistema necesita para funcionar (no son datos de prueba).
--
-- Los ids AUTO_INCREMENT nunca se escriben a mano: se buscan por nombre y se
-- guardan en variables de sesión (@...), así el script no depende del orden
-- en que MySQL asigna los ids.
-- =============================================================================

-- El cliente mysql que usa Docker para correr las migraciones se conecta en
-- latin1. Sin esta línea, los acentos (Camión) quedarían mal codificados.
SET NAMES utf8mb4;


-- -----------------------------------------------------------------------------
-- Tipos de vehículo que admite el parqueadero.
-- -----------------------------------------------------------------------------
INSERT INTO tipo_vehiculo (nombre) VALUES
    ('Moto'),
    ('Bicicleta'),
    ('Carro'),
    ('Camión');

SET @tipo_moto      = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Moto');
SET @tipo_bicicleta = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Bicicleta');
SET @tipo_carro     = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Carro');
SET @tipo_camion    = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Camión');


-- -----------------------------------------------------------------------------
-- Métodos de pago. Los electrónicos exigen el código de transacción
-- (pago.referencia); el efectivo no.
-- -----------------------------------------------------------------------------
INSERT INTO metodo_pago (nombre, requiere_referencia) VALUES
    ('PSE',       TRUE),
    ('Nequi',     TRUE),
    ('Daviplata', TRUE),
    ('Efectivo',  FALSE);


-- -----------------------------------------------------------------------------
-- Tarifas por hora: una antigua y una actual por cada tipo de vehículo.
-- La tarifa aplicable a un parqueo es la de vigente_desde más reciente que no
-- sea posterior a la fecha de entrada. Por ejemplo, un carro que entró el
-- 2026-09-20 paga 4.500 por hora, y uno que entró el 2026-10-05 paga 5.000.
-- -----------------------------------------------------------------------------
INSERT INTO tarifa (id_tipo, valor_hora, vigente_desde) VALUES
    -- Tarifas antiguas
    (@tipo_moto,      1800.00, '2025-01-01'),
    (@tipo_bicicleta,  800.00, '2025-01-01'),
    (@tipo_carro,     4500.00, '2025-01-01'),
    (@tipo_camion,    8000.00, '2025-01-01'),
    -- Tarifas actuales
    (@tipo_moto,      2000.00, '2026-10-01'),
    (@tipo_bicicleta, 1000.00, '2026-10-01'),
    (@tipo_carro,     5000.00, '2026-10-01'),
    (@tipo_camion,    9000.00, '2026-10-01');


-- -----------------------------------------------------------------------------
-- Espacios: 20 en total, repartidos en 2 pisos. Cada zona está demarcada para
-- un tipo de vehículo.
--   Piso 1: zona A (8 carros) y zona M (4 motos).
--   Piso 2: zona B (4 carros), zona C (2 camiones) y zona K (2 bicicletas).
-- El espacio 2-B-04 está deshabilitado (en mantenimiento): no se puede usar.
-- -----------------------------------------------------------------------------
INSERT INTO espacio (id_tipo, piso, zona, numero, habilitado) VALUES
    -- Piso 1, zona A: carros
    (@tipo_carro,     '1', 'A', '01', TRUE),
    (@tipo_carro,     '1', 'A', '02', TRUE),
    (@tipo_carro,     '1', 'A', '03', TRUE),
    (@tipo_carro,     '1', 'A', '04', TRUE),
    (@tipo_carro,     '1', 'A', '05', TRUE),
    (@tipo_carro,     '1', 'A', '06', TRUE),
    (@tipo_carro,     '1', 'A', '07', TRUE),
    (@tipo_carro,     '1', 'A', '08', TRUE),
    -- Piso 1, zona M: motos
    (@tipo_moto,      '1', 'M', '01', TRUE),
    (@tipo_moto,      '1', 'M', '02', TRUE),
    (@tipo_moto,      '1', 'M', '03', TRUE),
    (@tipo_moto,      '1', 'M', '04', TRUE),
    -- Piso 2, zona B: carros
    (@tipo_carro,     '2', 'B', '01', TRUE),
    (@tipo_carro,     '2', 'B', '02', TRUE),
    (@tipo_carro,     '2', 'B', '03', TRUE),
    (@tipo_carro,     '2', 'B', '04', FALSE),  -- en mantenimiento
    -- Piso 2, zona C: camiones
    (@tipo_camion,    '2', 'C', '01', TRUE),
    (@tipo_camion,    '2', 'C', '02', TRUE),
    -- Piso 2, zona K: bicicletas
    (@tipo_bicicleta, '2', 'K', '01', TRUE),
    (@tipo_bicicleta, '2', 'K', '02', TRUE);
