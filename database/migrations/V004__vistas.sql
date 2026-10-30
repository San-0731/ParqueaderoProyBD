-- =============================================================================
-- V004__vistas.sql
-- Vistas con las consultas que más usará la aplicación.
--
-- Una vista es una consulta guardada con nombre: no copia datos. Cada SELECT
-- sobre la vista ejecuta la consulta y lee las tablas en ese momento, así que
-- siempre muestra la información actual. El backend consulta la vista como si
-- fuera una tabla (SELECT * FROM vw_... WHERE ...) en lugar de repetir los JOIN.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- vw_espacios_disponibles: espacios habilitados que no tienen un registro en
-- estado 'ACTIVO'. Ojo: habilitado significa "en servicio" (no está en
-- mantenimiento); que esté libre u ocupado se calcula con los registros.
-- Incluye el tipo de vehículo que admite cada espacio, para filtrar, por
-- ejemplo, solo espacios para motos.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_espacios_disponibles AS
SELECT
    e.id_espacio,
    e.piso,
    e.zona,
    e.numero,
    e.id_tipo,
    t.nombre AS tipo_vehiculo
FROM espacio e
JOIN tipo_vehiculo t ON t.id_tipo = e.id_tipo
WHERE e.habilitado = TRUE
  AND NOT EXISTS (
        SELECT 1
        FROM registro_parqueo r
        WHERE r.id_espacio = e.id_espacio
          AND r.estado = 'ACTIVO'
  );


-- -----------------------------------------------------------------------------
-- vw_parqueos_activos: vehículos (de todos los tipos) que están adentro ahora,
-- es decir, registros en estado 'ACTIVO'.
-- minutos_transcurridos usa NOW(), que se evalúa cada vez que se consulta la
-- vista, no cuando se creó; por eso el valor aumenta con el tiempo.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_parqueos_activos AS
SELECT
    r.id_registro,
    v.identificador AS placa,
    t.nombre AS tipo_vehiculo,
    c.documento AS documento_cliente,
    CONCAT(c.nombres, ' ', c.apellidos) AS nombre_cliente,
    e.id_espacio,
    e.piso,
    e.zona,
    e.numero,
    r.entrada,
    TIMESTAMPDIFF(MINUTE, r.entrada, NOW()) AS minutos_transcurridos
FROM registro_parqueo r
JOIN vehiculo v      ON v.id_vehiculo = r.id_vehiculo
JOIN tipo_vehiculo t ON t.id_tipo = v.id_tipo
JOIN cliente c       ON c.id_cliente = v.id_cliente
JOIN espacio e       ON e.id_espacio = r.id_espacio
WHERE r.estado = 'ACTIVO';


-- -----------------------------------------------------------------------------
-- vw_historial_parqueos: parqueos finalizados (estado 'PAGO'), una fila por
-- parqueo.
-- Un parqueo puede pagarse con varios métodos (relación 1:N con pago). Para no
-- repetir la fila ni duplicar valor_total, primero se agrupan los pagos de cada
-- registro (subconsulta p) y los métodos y referencias se unen en un texto,
-- por ejemplo 'Efectivo + Nequi'. GROUP_CONCAT omite los NULL, así que el
-- efectivo no aporta referencia.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_historial_parqueos AS
SELECT
    r.id_registro,
    v.identificador AS placa,
    t.nombre AS tipo_vehiculo,
    e.piso,
    e.zona,
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
-- vw_ingresos_por_metodo: total recaudado por día y por método de pago.
-- Se agrupa por la fecha del pago (fecha_pago), que es cuando entra el dinero:
-- un parqueo que pasa la noche se cuenta el día en que se pagó.
-- -----------------------------------------------------------------------------
CREATE VIEW vw_ingresos_por_metodo AS
SELECT
    DATE(pg.fecha_pago) AS fecha,
    m.nombre AS metodo_pago,
    COUNT(*) AS cantidad_pagos,
    SUM(pg.monto) AS total_recaudado
FROM pago pg
JOIN metodo_pago m ON m.id_metodo = pg.id_metodo
GROUP BY DATE(pg.fecha_pago), m.nombre;
