-- =============================================================================
-- V003__datos_prueba.sql
-- Datos de prueba para desarrollar y probar el backend y el frontend:
-- marcas y modelos, 10 clientes, 15 vehículos, 27 parqueos finalizados con su
-- pago (del 14-sep al 29-oct-2026) y 4 parqueos activos (sin salida).
--
-- Reglas que respetan estos datos:
-- - Cobro por hora o fracción: horas = CEIL(minutos / 60) y
--   valor_total = horas x valor_hora. Ejemplo: 155 min -> 3 h. La regla real de
--   redondeo la define el negocio; si cambia, estos datos deben ajustarse.
-- - Tarifa aplicable según la fecha de entrada: antes del 2026-10-01 se usa la
--   antigua; desde esa fecha, la actual (ver V002).
-- - La suma de los pagos de cada parqueo es igual a su valor_total. PSE, Nequi
--   y Daviplata llevan referencia; el efectivo no.
-- - El tipo del vehículo coincide con el tipo del espacio, ningún parqueo usa
--   el espacio deshabilitado 2-B-04 y no hay horarios que se crucen para el
--   mismo vehículo ni para el mismo espacio.
--
-- Como en V002, los ids se buscan por datos naturales (documento, placa,
-- piso/zona/número, nombre). Si una búsqueda no encuentra nada devuelve NULL y
-- la restricción NOT NULL detiene el script, así que no se pierden datos en
-- silencio.
-- =============================================================================

-- El cliente mysql que usa Docker para correr las migraciones se conecta en
-- latin1. Sin esta línea, los acentos (Camión, Gómez) quedarían mal codificados.
SET NAMES utf8mb4;

SET @tipo_moto     = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Moto');
SET @tipo_bicicleta = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Bicicleta');
SET @tipo_carro     = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Carro');
SET @tipo_camion    = (SELECT id_tipo FROM tipo_vehiculo WHERE nombre = 'Camión');

SET @pse       = (SELECT id_metodo FROM metodo_pago WHERE nombre = 'PSE');
SET @nequi     = (SELECT id_metodo FROM metodo_pago WHERE nombre = 'Nequi');
SET @daviplata = (SELECT id_metodo FROM metodo_pago WHERE nombre = 'Daviplata');
SET @efectivo  = (SELECT id_metodo FROM metodo_pago WHERE nombre = 'Efectivo');


-- -----------------------------------------------------------------------------
-- Marcas y modelos.
-- -----------------------------------------------------------------------------
INSERT INTO marca (nombre) VALUES
    ('Chevrolet'), ('Renault'), ('Mazda'), ('Kia'), ('Toyota'),
    ('Yamaha'), ('Honda'), ('Bajaj'), ('Trek');

-- Cada modelo busca su marca por nombre.
INSERT INTO modelo (id_marca, nombre)
SELECT m.id_marca, d.modelo
FROM marca m
JOIN (
              SELECT 'Chevrolet' AS marca, 'Spark' AS modelo
    UNION ALL SELECT 'Chevrolet', 'Onix'
    UNION ALL SELECT 'Chevrolet', 'NHR'
    UNION ALL SELECT 'Renault',   'Logan'
    UNION ALL SELECT 'Renault',   'Duster'
    UNION ALL SELECT 'Mazda',     'CX-30'
    UNION ALL SELECT 'Kia',       'Picanto'
    UNION ALL SELECT 'Toyota',    'Corolla'
    UNION ALL SELECT 'Yamaha',    'NMAX'
    UNION ALL SELECT 'Honda',     'CB 190R'
    UNION ALL SELECT 'Bajaj',     'Pulsar NS 200'
    UNION ALL SELECT 'Trek',      'Marlin 5'
) AS d ON d.marca = m.nombre;


-- -----------------------------------------------------------------------------
-- Clientes (datos ficticios).
-- -----------------------------------------------------------------------------
INSERT INTO cliente (documento, nombres, apellidos, telefono) VALUES
    ('1012345678', 'Laura Camila',    'Gómez Rojas',       '3104567890'),
    ('79845123',   'Carlos Andrés',   'Martínez Peña',     '3152345678'),
    ('1020456789', 'Valentina',       'Herrera Castro',    '3008765432'),
    ('52789456',   'Diana Marcela',   'López Suárez',      NULL),
    ('1032478965', 'Juan Sebastián',  'Ramírez Ortiz',     '3216549870'),
    ('80123654',   'Jorge Enrique',   'Torres Vargas',     '3187654321'),
    ('1015987412', 'María Fernanda',  'Rincón Díaz',       '3045678912'),
    ('1098765432', 'Andrés Felipe',   'Moreno Cárdenas',   NULL),
    ('1023456781', 'Santiago',        'Castillo Mejía',    '3112233445'),
    ('39654321',   'Paula Andrea',    'Jiménez Salazar',   '3129988776');


-- -----------------------------------------------------------------------------
-- Vehículos: 9 carros, 3 motos, 1 camión y 2 bicicletas.
-- Varios clientes tienen dos vehículos. Los nombres de modelo no se repiten
-- entre marcas en estos datos, por eso basta buscar el modelo por su nombre.
-- -----------------------------------------------------------------------------
INSERT INTO vehiculo (identificador, id_tipo, id_modelo, id_cliente, color, anio) VALUES
    -- Carros (placa ABC123)
    ('KLM234', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Spark'),
        (SELECT id_cliente FROM cliente WHERE documento = '1012345678'), 'Rojo', 2018),
    ('BCD567', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Logan'),
        (SELECT id_cliente FROM cliente WHERE documento = '79845123'), 'Gris', 2016),
    ('RTX918', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'CX-30'),
        (SELECT id_cliente FROM cliente WHERE documento = '1020456789'), 'Blanco', 2022),
    ('HJP402', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Picanto'),
        (SELECT id_cliente FROM cliente WHERE documento = '52789456'), 'Azul', 2020),
    ('NQS771', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Corolla'),
        (SELECT id_cliente FROM cliente WHERE documento = '1032478965'), 'Negro', 2021),
    ('FGH135', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Onix'),
        (SELECT id_cliente FROM cliente WHERE documento = '80123654'), 'Plata', 2023),
    ('WZE620', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Duster'),
        (SELECT id_cliente FROM cliente WHERE documento = '1015987412'), 'Verde', 2019),
    ('JTU389', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Spark'),
        (SELECT id_cliente FROM cliente WHERE documento = '1023456781'), 'Blanco', 2015),
    ('MVC054', @tipo_carro,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Picanto'),
        (SELECT id_cliente FROM cliente WHERE documento = '39654321'), 'Rojo', 2024),
    -- Motos (placa ABC12D)
    ('ABC12D', @tipo_moto,
        (SELECT id_modelo FROM modelo WHERE nombre = 'NMAX'),
        (SELECT id_cliente FROM cliente WHERE documento = '1012345678'), 'Negro', 2022),
    ('QWE45F', @tipo_moto,
        (SELECT id_modelo FROM modelo WHERE nombre = 'CB 190R'),
        (SELECT id_cliente FROM cliente WHERE documento = '1032478965'), 'Rojo', 2021),
    ('XYZ78G', @tipo_moto,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Pulsar NS 200'),
        (SELECT id_cliente FROM cliente WHERE documento = '1098765432'), 'Azul', 2020),
    -- Camión
    ('TSR482', @tipo_camion,
        (SELECT id_modelo FROM modelo WHERE nombre = 'NHR'),
        (SELECT id_cliente FROM cliente WHERE documento = '80123654'), 'Blanco', 2017),
    -- Bicicletas: una identificada por número de marco y otra por código
    -- interno, sin modelo ni año conocidos.
    ('WTU2024A0153', @tipo_bicicleta,
        (SELECT id_modelo FROM modelo WHERE nombre = 'Marlin 5'),
        (SELECT id_cliente FROM cliente WHERE documento = '1020456789'), 'Negro', 2024),
    ('BICI0007', @tipo_bicicleta,
        NULL,
        (SELECT id_cliente FROM cliente WHERE documento = '1098765432'), 'Amarillo', NULL);


-- -----------------------------------------------------------------------------
-- Parqueos finalizados con su pago.
-- Cada bloque inserta el registro, guarda su id con LAST_INSERT_ID() e inserta
-- el pago (o los pagos, si se dividió entre dos métodos). El encabezado de
-- cada bloque muestra el cálculo: minutos -> horas cobradas x tarifa = total.
-- -----------------------------------------------------------------------------

-- ===== Semana del 14 de septiembre (tarifa antigua) =====

-- P01 · KLM234 (carro) en 1-A-01 · 155 min -> 3 h x 4.500 = 13.500 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'KLM234'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01'),
    '2026-09-14 07:45:00', '2026-09-14 10:20:00', 155, 13500.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 13500.00, '2026-09-14 10:20:00', NULL);

-- P02 · ABC12D (moto) en 1-M-01 · 55 min -> 1 h x 1.800 = 1.800 · Nequi
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'ABC12D'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'M' AND numero = '01'),
    '2026-09-14 08:10:00', '2026-09-14 09:05:00', 55, 1800.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @nequi, 1800.00, '2026-09-14 09:05:00', 'NEQ-0001');

-- P03 · BCD567 (carro) en 1-A-02 · 340 min -> 6 h x 4.500 = 27.000 · PSE
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'BCD567'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '02'),
    '2026-09-15 13:00:00', '2026-09-15 18:40:00', 340, 27000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @pse, 27000.00, '2026-09-15 18:40:00', 'PSE-0001');

-- P04 · WTU2024A0153 (bicicleta) en 2-K-01 · 555 min -> 10 h x 800 = 8.000 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'WTU2024A0153'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'K' AND numero = '01'),
    '2026-09-16 07:30:00', '2026-09-16 16:45:00', 555, 8000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 8000.00, '2026-09-16 16:45:00', NULL);

-- P05 · RTX918 (carro) en 1-A-01 · 105 min -> 2 h x 4.500 = 9.000 · Daviplata
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'RTX918'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01'),
    '2026-09-17 09:15:00', '2026-09-17 11:00:00', 105, 9000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @daviplata, 9000.00, '2026-09-17 11:00:00', 'DAV-0001');

-- ===== Semana del 21 de septiembre (tarifa antigua) =====

-- P06 · HJP402 (carro) en 1-A-03 · 675 min -> 12 h x 4.500 = 54.000 · Efectivo 20.000 + Nequi 34.000
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'HJP402'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '03'),
    '2026-09-21 06:50:00', '2026-09-21 18:05:00', 675, 54000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 20000.00, '2026-09-21 18:05:00', NULL),
    (@registro, @nequi,    34000.00, '2026-09-21 18:05:00', 'NEQ-0002');

-- P07 · TSR482 (camión) en 2-C-01 · 160 min -> 3 h x 8.000 = 24.000 · PSE
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'TSR482'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'C' AND numero = '01'),
    '2026-09-22 05:30:00', '2026-09-22 08:10:00', 160, 24000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @pse, 24000.00, '2026-09-22 08:10:00', 'PSE-0002');

-- P08 · QWE45F (moto) en 1-M-02 · 40 min -> 1 h x 1.800 = 1.800 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'QWE45F'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'M' AND numero = '02'),
    '2026-09-22 10:00:00', '2026-09-22 10:40:00', 40, 1800.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 1800.00, '2026-09-22 10:40:00', NULL);

-- P09 · NQS771 (carro) en 2-B-01 · 150 min -> 3 h x 4.500 = 13.500 · Nequi
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'NQS771'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'B' AND numero = '01'),
    '2026-09-23 14:20:00', '2026-09-23 16:50:00', 150, 13500.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @nequi, 13500.00, '2026-09-23 16:50:00', 'NEQ-0003');

-- P10 · KLM234 (carro) en 1-A-04 · 270 min -> 5 h x 4.500 = 22.500 · Daviplata
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'KLM234'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '04'),
    '2026-09-24 08:00:00', '2026-09-24 12:30:00', 270, 22500.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @daviplata, 22500.00, '2026-09-24 12:30:00', 'DAV-0002');

-- ===== Semana del 28 de septiembre (cambio de tarifa el 1 de octubre) =====

-- P11 · FGH135 (carro) en 1-A-05 · 50 min -> 1 h x 4.500 = 4.500 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'FGH135'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '05'),
    '2026-09-28 07:10:00', '2026-09-28 08:00:00', 50, 4500.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 4500.00, '2026-09-28 08:00:00', NULL);

-- P12 · TSR482 (camión) en 2-C-02 · pasa la noche: entra el 30-sep y sale el
-- 1-oct. Se cobra con la tarifa antigua porque cuenta la fecha de ENTRADA.
-- 870 min -> 15 h x 8.000 = 120.000 · PSE
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'TSR482'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'C' AND numero = '02'),
    '2026-09-30 18:00:00', '2026-10-01 08:30:00', 870, 120000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @pse, 120000.00, '2026-10-01 08:30:00', 'PSE-0003');

-- P13 · WZE620 (carro) en 1-A-06 · 90 min -> 2 h x 5.000 = 10.000 · Nequi (primer día de la tarifa actual)
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'WZE620'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '06'),
    '2026-10-01 09:00:00', '2026-10-01 10:30:00', 90, 10000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @nequi, 10000.00, '2026-10-01 10:30:00', 'NEQ-0004');

-- P14 · XYZ78G (moto) en 1-M-03 · 165 min -> 3 h x 2.000 = 6.000 · Daviplata
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'XYZ78G'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'M' AND numero = '03'),
    '2026-10-02 12:15:00', '2026-10-02 15:00:00', 165, 6000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @daviplata, 6000.00, '2026-10-02 15:00:00', 'DAV-0003');

-- ===== Semana del 5 de octubre (tarifa actual) =====

-- P15 · JTU389 (carro) en 2-B-02 · 540 min -> 9 h x 5.000 = 45.000 · PSE 25.000 + Daviplata 20.000
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'JTU389'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'B' AND numero = '02'),
    '2026-10-05 08:30:00', '2026-10-05 17:30:00', 540, 45000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @pse,       25000.00, '2026-10-05 17:30:00', 'PSE-0004'),
    (@registro, @daviplata, 20000.00, '2026-10-05 17:30:00', 'DAV-0004');

-- P16 · BICI0007 (bicicleta) en 2-K-02 · 375 min -> 7 h x 1.000 = 7.000 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'BICI0007'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'K' AND numero = '02'),
    '2026-10-06 07:00:00', '2026-10-06 13:15:00', 375, 7000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 7000.00, '2026-10-06 13:15:00', NULL);

-- P17 · MVC054 (carro) en 1-A-07 · 75 min -> 2 h x 5.000 = 10.000 · Nequi
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'MVC054'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '07'),
    '2026-10-07 15:45:00', '2026-10-07 17:00:00', 75, 10000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @nequi, 10000.00, '2026-10-07 17:00:00', 'NEQ-0005');

-- P18 · ABC12D (moto) en 1-M-01 · 235 min -> 4 h x 2.000 = 8.000 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'ABC12D'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'M' AND numero = '01'),
    '2026-10-08 08:05:00', '2026-10-08 12:00:00', 235, 8000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 8000.00, '2026-10-08 12:00:00', NULL);

-- ===== Semana del 12 de octubre (tarifa actual) =====

-- P19 · RTX918 (carro) en 1-A-08 · 200 min -> 4 h x 5.000 = 20.000 · PSE
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'RTX918'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '08'),
    '2026-10-13 10:00:00', '2026-10-13 13:20:00', 200, 20000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @pse, 20000.00, '2026-10-13 13:20:00', 'PSE-0005');

-- P20 · BCD567 (carro) en 2-B-03 · 80 min -> 2 h x 5.000 = 10.000 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'BCD567'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'B' AND numero = '03'),
    '2026-10-14 07:40:00', '2026-10-14 09:00:00', 80, 10000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 10000.00, '2026-10-14 09:00:00', NULL);

-- P21 · HJP402 (carro) en 1-A-02 · 180 min -> 3 h x 5.000 = 15.000 · Daviplata
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'HJP402'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '02'),
    '2026-10-15 11:30:00', '2026-10-15 14:30:00', 180, 15000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @daviplata, 15000.00, '2026-10-15 14:30:00', 'DAV-0005');

-- ===== Semana del 19 de octubre (tarifa actual) =====

-- P22 · TSR482 (camión) en 2-C-01 · 105 min -> 2 h x 9.000 = 18.000 · Nequi
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'TSR482'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'C' AND numero = '01'),
    '2026-10-20 06:00:00', '2026-10-20 07:45:00', 105, 18000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @nequi, 18000.00, '2026-10-20 07:45:00', 'NEQ-0006');

-- P23 · NQS771 (carro) en 1-A-03 · 170 min -> 3 h x 5.000 = 15.000 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'NQS771'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '03'),
    '2026-10-21 18:10:00', '2026-10-21 21:00:00', 170, 15000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 15000.00, '2026-10-21 21:00:00', NULL);

-- P24 · WTU2024A0153 (bicicleta) en 2-K-01 · 250 min -> 5 h x 1.000 = 5.000 · Nequi
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'WTU2024A0153'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'K' AND numero = '01'),
    '2026-10-22 08:00:00', '2026-10-22 12:10:00', 250, 5000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @nequi, 5000.00, '2026-10-22 12:10:00', 'NEQ-0007');

-- ===== Semana del 26 de octubre (tarifa actual) =====

-- P25 · FGH135 (carro) en 1-A-01 · 60 min exactos -> 1 h x 5.000 = 5.000 · PSE
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'FGH135'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01'),
    '2026-10-26 09:00:00', '2026-10-26 10:00:00', 60, 5000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @pse, 5000.00, '2026-10-26 10:00:00', 'PSE-0006');

-- P26 · QWE45F (moto) en 1-M-04 · 35 min -> 1 h x 2.000 = 2.000 · Daviplata
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'QWE45F'),
    (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'M' AND numero = '04'),
    '2026-10-27 13:00:00', '2026-10-27 13:35:00', 35, 2000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @daviplata, 2000.00, '2026-10-27 13:35:00', 'DAV-0006');

-- P27 · KLM234 (carro) en 2-B-01 · 330 min -> 6 h x 5.000 = 30.000 · Efectivo
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total) VALUES (
    (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'KLM234'),
    (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'B' AND numero = '01'),
    '2026-10-29 07:20:00', '2026-10-29 12:50:00', 330, 30000.00);
SET @registro = LAST_INSERT_ID();
INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago, referencia) VALUES
    (@registro, @efectivo, 30000.00, '2026-10-29 12:50:00', NULL);


-- -----------------------------------------------------------------------------
-- Parqueos activos: vehículos que siguen en el parqueadero (salida en NULL,
-- sin cobro ni pago). La entrada se calcula desde NOW() para que siempre
-- parezcan recientes, sin importar cuándo se cree la base.
-- -----------------------------------------------------------------------------
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada) VALUES
    -- RTX918 (carro) en 1-A-02, desde hace 2 h 30 min
    ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'RTX918'),
     (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '02'),
     NOW() - INTERVAL 150 MINUTE),
    -- WZE620 (carro) en 2-B-02, desde hace 45 min
    ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'WZE620'),
     (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'B' AND numero = '02'),
     NOW() - INTERVAL 45 MINUTE),
    -- XYZ78G (moto) en 1-M-02, desde hace 1 h 35 min
    ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'XYZ78G'),
     (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'M' AND numero = '02'),
     NOW() - INTERVAL 95 MINUTE),
    -- BICI0007 (bicicleta) en 2-K-02, desde hace 5 h 20 min
    ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'BICI0007'),
     (SELECT id_espacio FROM espacio WHERE piso = '2' AND zona = 'K' AND numero = '02'),
     NOW() - INTERVAL 320 MINUTE);
