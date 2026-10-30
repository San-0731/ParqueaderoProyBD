-- =============================================================================
-- 01_consistencia_datos.sql
-- Revisa que los datos guardados no tengan contradicciones. Solo hace SELECT:
-- no modifica nada. Se puede correr completo desde el cliente SQL o con:
--   docker exec -i parqueadero-mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -t "$MYSQL_DATABASE"' < database/pruebas/01_consistencia_datos.sql
--
-- La consulta 3 es la principal: cada fila es un tipo de problema y la
-- columna cantidad debe ser 0 en todas.
-- =============================================================================

-- 1) Conteos. Con los datos de V002 y V003 se espera:
--    4 tipos, 4 métodos, 8 tarifas, 20 espacios (1 deshabilitado), 9 marcas,
--    12 modelos, 10 clientes, 15 vehículos, 31 registros (27 PAGO y 4 ACTIVO)
--    y 29 pagos.
SELECT
    (SELECT COUNT(*) FROM tipo_vehiculo)                         AS tipos,
    (SELECT COUNT(*) FROM metodo_pago)                           AS metodos,
    (SELECT COUNT(*) FROM tarifa)                                AS tarifas,
    (SELECT COUNT(*) FROM espacio)                               AS espacios,
    (SELECT COUNT(*) FROM espacio WHERE habilitado = FALSE)      AS deshabilitados,
    (SELECT COUNT(*) FROM marca)                                 AS marcas,
    (SELECT COUNT(*) FROM modelo)                                AS modelos,
    (SELECT COUNT(*) FROM cliente)                               AS clientes,
    (SELECT COUNT(*) FROM vehiculo)                              AS vehiculos,
    (SELECT COUNT(*) FROM registro_parqueo)                      AS registros,
    (SELECT COUNT(*) FROM registro_parqueo WHERE estado = 'PAGO')   AS pagados,
    (SELECT COUNT(*) FROM registro_parqueo WHERE estado = 'ACTIVO') AS activos,
    (SELECT COUNT(*) FROM pago)                                  AS pagos;


-- 2) Métodos de pago. Se espera requiere_referencia = 1 en PSE, Nequi y
--    Daviplata, y 0 en Efectivo.
SELECT nombre, requiere_referencia FROM metodo_pago ORDER BY id_metodo;


-- 3) Problemas. Todas las cantidades deben ser 0.
SELECT 'registro ACTIVO con salida o cobro, o PAGO sin ellos' AS problema, COUNT(*) AS cantidad
FROM registro_parqueo
WHERE NOT ((estado = 'ACTIVO' AND salida IS NULL AND minutos_totales IS NULL AND valor_total IS NULL)
        OR (estado = 'PAGO' AND salida IS NOT NULL AND minutos_totales IS NOT NULL AND valor_total IS NOT NULL))

UNION ALL
SELECT 'minutos_totales distinto al tiempo entre entrada y salida', COUNT(*)
FROM registro_parqueo
WHERE estado = 'PAGO' AND minutos_totales <> TIMESTAMPDIFF(MINUTE, entrada, salida)

UNION ALL
-- Regla de cobro de los datos de prueba: hora o fracción con la tarifa vigente
-- en la fecha de entrada (consulta de referencia de la especificación).
SELECT 'valor_total distinto a CEIL(minutos/60) x tarifa aplicable', COUNT(*)
FROM registro_parqueo r
JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo
WHERE r.estado = 'PAGO'
  AND r.valor_total <> CEIL(r.minutos_totales / 60) * (
        SELECT t.valor_hora
        FROM tarifa t
        WHERE t.id_tipo = v.id_tipo AND t.vigente_desde <= DATE(r.entrada)
        ORDER BY t.vigente_desde DESC
        LIMIT 1)

UNION ALL
SELECT 'registro sin tarifa vigente en su fecha de entrada', COUNT(*)
FROM registro_parqueo r
JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo
WHERE NOT EXISTS (
        SELECT 1 FROM tarifa t
        WHERE t.id_tipo = v.id_tipo AND t.vigente_desde <= DATE(r.entrada))

UNION ALL
SELECT 'registro PAGO cuya suma de pagos no es igual a valor_total', COUNT(*)
FROM registro_parqueo r
WHERE r.estado = 'PAGO'
  AND r.valor_total <> (SELECT COALESCE(SUM(p.monto), 0) FROM pago p WHERE p.id_registro = r.id_registro)

UNION ALL
SELECT 'registro ACTIVO que ya tiene pagos', COUNT(*)
FROM registro_parqueo r
JOIN pago p ON p.id_registro = r.id_registro
WHERE r.estado = 'ACTIVO'

UNION ALL
SELECT 'pago con método que exige referencia pero sin referencia', COUNT(*)
FROM pago p
JOIN metodo_pago m ON m.id_metodo = p.id_metodo
WHERE m.requiere_referencia = TRUE AND p.referencia IS NULL

UNION ALL
SELECT 'pago en efectivo con referencia', COUNT(*)
FROM pago p
JOIN metodo_pago m ON m.id_metodo = p.id_metodo
WHERE m.requiere_referencia = FALSE AND p.referencia IS NOT NULL

UNION ALL
SELECT 'pago con fecha anterior a la salida del registro', COUNT(*)
FROM pago p
JOIN registro_parqueo r ON r.id_registro = p.id_registro
WHERE p.fecha_pago < r.salida

UNION ALL
SELECT 'vehículo en un espacio de otro tipo (trigger 2)', COUNT(*)
FROM registro_parqueo r
JOIN vehiculo v ON v.id_vehiculo = r.id_vehiculo
JOIN espacio e ON e.id_espacio = r.id_espacio
WHERE v.id_tipo <> e.id_tipo

UNION ALL
SELECT 'registro en un espacio deshabilitado (trigger 3)', COUNT(*)
FROM registro_parqueo r
JOIN espacio e ON e.id_espacio = r.id_espacio
WHERE e.habilitado = FALSE

UNION ALL
SELECT 'identificador sin normalizar (trigger 1)', COUNT(*)
FROM vehiculo
WHERE identificador <> UPPER(REPLACE(REPLACE(identificador, ' ', ''), '-', ''))

UNION ALL
-- Dos registros se cruzan si cada uno empieza antes de que el otro termine.
-- Un registro ACTIVO "termina" ahora (NOW()).
SELECT 'mismo vehículo con horarios cruzados', COUNT(*)
FROM registro_parqueo a
JOIN registro_parqueo b ON b.id_vehiculo = a.id_vehiculo AND b.id_registro > a.id_registro
WHERE a.entrada < COALESCE(b.salida, NOW()) AND b.entrada < COALESCE(a.salida, NOW())

UNION ALL
SELECT 'mismo espacio con horarios cruzados', COUNT(*)
FROM registro_parqueo a
JOIN registro_parqueo b ON b.id_espacio = a.id_espacio AND b.id_registro > a.id_registro
WHERE a.entrada < COALESCE(b.salida, NOW()) AND b.entrada < COALESCE(a.salida, NOW())

UNION ALL
SELECT 'mismo cliente con dos vehículos adentro a la vez', COUNT(*)
FROM registro_parqueo a
JOIN vehiculo va ON va.id_vehiculo = a.id_vehiculo
JOIN registro_parqueo b ON b.id_registro > a.id_registro
JOIN vehiculo vb ON vb.id_vehiculo = b.id_vehiculo
WHERE va.id_cliente = vb.id_cliente
  AND a.entrada < COALESCE(b.salida, NOW()) AND b.entrada < COALESCE(a.salida, NOW())

UNION ALL
SELECT 'registro con entrada en el futuro', COUNT(*)
FROM registro_parqueo
WHERE entrada > NOW();


-- 4) Pagos por método. Se espera: Efectivo 10 pagos (117.800), Nequi 7
--    (92.300), PSE 6 (221.000) y Daviplata 6 (74.500).
SELECT m.nombre AS metodo, COUNT(*) AS pagos, SUM(p.monto) AS total
FROM pago p
JOIN metodo_pago m ON m.id_metodo = p.id_metodo
GROUP BY m.nombre
ORDER BY pagos DESC;


-- 5) Parqueos pagados por tarifa. Se espera 12 con la antigua y 15 con la
--    actual (rige desde el 2026-10-01).
SELECT IF(DATE(entrada) < '2026-10-01', 'antigua', 'actual') AS tarifa, COUNT(*) AS parqueos
FROM registro_parqueo
WHERE estado = 'PAGO'
GROUP BY tarifa;


-- 6) Vistas. Se espera 15 espacios disponibles, 4 parqueos activos, 27 en el
--    historial y 505.600 recaudados.
SELECT
    (SELECT COUNT(*) FROM vw_espacios_disponibles)            AS disponibles,
    (SELECT COUNT(*) FROM vw_parqueos_activos)                AS activos,
    (SELECT COUNT(*) FROM vw_historial_parqueos)              AS historial,
    (SELECT SUM(total_recaudado) FROM vw_ingresos_por_metodo) AS recaudado;
