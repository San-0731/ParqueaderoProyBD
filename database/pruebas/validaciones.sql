-- Active: 1793386631191@@127.0.0.1@3307@parqueadero
-- =============================================================================
-- validaciones.sql
-- Pruebas manuales para correr instrucción por instrucción desde el cliente
-- SQL. Cada bloque dice qué resultado se espera y por qué.
-- =============================================================================


-- 1) Espacios deshabilitados (en mantenimiento).
--    Esperado: solo 2-B-04.
--    "habilitado" NO dice si el espacio está ocupado: indica si está en
--    servicio. Un espacio ocupado sigue habilitado.
SELECT * FROM espacio WHERE habilitado = FALSE;


-- 2) Espacios ocupados ahora (registro en estado 'ACTIVO').
--    Esperado: 4 espacios (1-A-02, 2-B-02, 1-M-02 y 2-K-02), todos con
--    habilitado = 1: están en servicio y ahora tienen un vehículo.
--    Por eso las consultas 1 y 2 no devuelven lo mismo: miden cosas distintas.
SELECT e.piso, e.zona, e.numero, e.habilitado, e.id_espacio, v.identificador AS placa
FROM registro_parqueo rp
JOIN espacio e  ON rp.id_espacio = e.id_espacio
JOIN vehiculo v ON v.id_vehiculo = rp.id_vehiculo
WHERE rp.estado = 'ACTIVO';


-- 3) Espacios libres = habilitados y sin registro ACTIVO.
--    Esperado: 15 (20 espacios - 1 deshabilitado - 4 ocupados).
SELECT * FROM vw_espacios_disponibles;


-- 4) Registrar entradas.
--    Antes, el INSERT fallaba con el error 3105 porque intentaba escribir en
--    las columnas generadas vehiculo_abierto y espacio_abierto, que MySQL
--    calcula solo. Ya no existen: ahora basta con id_vehiculo, id_espacio y
--    entrada, y estado toma 'ACTIVO' por defecto.
--
--    Recomendaciones:
--    - Buscar vehículo y espacio por placa y ubicación, no por id (los ids son
--      internos y cambian si se recrea la base).
--    - Usar fechas 'AAAA-MM-DD HH:MM:SS'. El separador '/' está obsoleto, y una
--      fecha como 2024 no tiene tarifa (la primera rige desde 2025-01-01).
--
--    Todo va dentro de una transacción que se deshace al final con ROLLBACK,
--    para que las pruebas no cambien los datos.
START TRANSACTION;

-- 4a) BCD567 (carro) entra al 1-A-01, que está libre.
--     Esperado: 1 fila insertada, con estado 'ACTIVO'.
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada)
VALUES ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'BCD567'),
        (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01'),
        NOW());

SELECT * FROM registro_parqueo WHERE id_registro = LAST_INSERT_ID();

-- 4b) RTX918 (carro) intenta entrar al mismo 1-A-01.
--     Esperado: ERROR 1062 en uq_registro_espacio_activo, porque el espacio ya
--     tiene un registro ACTIVO (el de BCD567).
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada)
VALUES ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'RTX918'),
        (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01'),
        NOW());

-- 4c) MVC054 ya está adentro (1-A-02) e intenta entrar otra vez, al 1-A-03.
--     Esperado: ERROR 1062 en uq_registro_vehiculo_activo.
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada)
VALUES ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'MVC054'),
        (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '03'),
        NOW());

-- 4d) Una moto (ABC12D) en un espacio de carros (1-A-04).
--     Esperado: ERROR 1644 del trigger: 'El tipo del vehículo no coincide...'.
INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada)
VALUES ((SELECT id_vehiculo FROM vehiculo WHERE identificador = 'ABC12D'),
        (SELECT id_espacio FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '04'),
        NOW());

-- 4e) Cerrar el registro de BCD567 (90 minutos, 2 h x 5.000 = 10.000) y pagar
--     en efectivo. Esperado: el UPDATE y el INSERT funcionan, y el 1-A-01
--     vuelve a aparecer en vw_espacios_disponibles.
SET @r = (SELECT id_registro FROM registro_parqueo
          WHERE estado = 'ACTIVO'
            AND id_vehiculo = (SELECT id_vehiculo FROM vehiculo WHERE identificador = 'BCD567'));

UPDATE registro_parqueo
SET salida = entrada + INTERVAL 90 MINUTE,
    minutos_totales = 90,
    valor_total = 10000,
    estado = 'PAGO'
WHERE id_registro = @r;

INSERT INTO pago (id_registro, id_metodo, monto, fecha_pago)
VALUES (@r, (SELECT id_metodo FROM metodo_pago WHERE nombre = 'Efectivo'), 10000,
        (SELECT salida FROM registro_parqueo WHERE id_registro = @r));

SELECT * FROM vw_espacios_disponibles WHERE piso = '1' AND zona = 'A' AND numero = '01';

-- Deshace todo lo de la sección 4.
ROLLBACK;
