-- =============================================================================
-- V009__rol_aplicacion.sql
-- Rol de MySQL con el MÍNIMO de permisos que necesita el backend.
--
-- Por qué: la imagen de MySQL de Docker crea el usuario de la aplicación
-- (DB_USER) con ALL PRIVILEGES sobre la base: podría hacer DROP TABLE, ALTER,
-- DELETE, TRUNCATE o borrar triggers, aunque el backend nunca lo necesita. Si
-- alguien consiguiera esa contraseña, o si hubiera un error en el backend,
-- podría destruir los datos. Principio de mínimo privilegio: cada cuenta solo
-- con lo que usa.
--
-- Un ROL es un paquete de permisos con nombre: se le dan los permisos al rol y
-- el rol se le asigna al usuario. Esta migración solo crea el rol y sus
-- permisos. Asignárselo al usuario (y quitarle el ALL) lo hace el script
--   ./database/scripts/aplicar-permisos.sh
-- porque el nombre del usuario sale del .env (no se escribe en el código).
--
-- Lo que el rol NO puede hacer: borrar (salvo sesiones), crear, cambiar o
-- borrar tablas, vistas o triggers, ni dar permisos. Tampoco modificar la
-- auditoría: solo la lee. Las filas de auditoría las escriben los triggers,
-- que se ejecutan con los permisos de quien los creó (su DEFINER, root).
--
-- Los GRANT ... ON tabla sin nombre de base aplican a la base en uso. Los roles
-- son del servidor (no de una base): si la migración corre en otra base del
-- mismo servidor (la de pruebas), el mismo rol recibe también sus permisos.
--
-- Para aplicarla a una base que ya existe (la de desarrollo):
--   ./database/scripts/aplicar-migracion.sh database/migrations/V009__rol_aplicacion.sql
--   ./database/scripts/aplicar-permisos.sh
-- =============================================================================

CREATE ROLE IF NOT EXISTS rol_aplicacion;

-- Catálogos: solo lectura.
GRANT SELECT ON tipo_vehiculo TO rol_aplicacion;
GRANT SELECT ON tarifa        TO rol_aplicacion;
GRANT SELECT ON metodo_pago   TO rol_aplicacion;
GRANT SELECT ON rol           TO rol_aplicacion;

-- Vistas: solo lectura.
GRANT SELECT ON vw_espacios_disponibles TO rol_aplicacion;
GRANT SELECT ON vw_parqueos_activos     TO rol_aplicacion;
GRANT SELECT ON vw_historial_parqueos   TO rol_aplicacion;
GRANT SELECT ON vw_ingresos_por_metodo  TO rol_aplicacion;
GRANT SELECT ON vw_auditoria            TO rol_aplicacion;
GRANT SELECT ON vw_auditoria_operadores TO rol_aplicacion;

-- Operación: leer, crear y modificar; nunca borrar.
GRANT SELECT, INSERT, UPDATE ON cliente          TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE ON vehiculo         TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE ON registro_parqueo TO rol_aplicacion;
GRANT SELECT, INSERT, UPDATE ON usuario          TO rol_aplicacion;

-- Se crean pero no se modifican.
GRANT SELECT, INSERT ON pago   TO rol_aplicacion;
GRANT SELECT, INSERT ON zona   TO rol_aplicacion;
GRANT SELECT, INSERT ON marca  TO rol_aplicacion;
GRANT SELECT, INSERT ON modelo TO rol_aplicacion;

-- De un espacio solo se cambia si está en servicio: permiso por COLUMNA. Un
-- UPDATE a otra columna (zona o número) responde ERROR 1143.
GRANT SELECT, INSERT         ON espacio TO rol_aplicacion;
GRANT UPDATE (habilitado)    ON espacio TO rol_aplicacion;

-- Sesiones: el único DELETE (cerrar sesión, sesiones vencidas).
GRANT SELECT, INSERT, DELETE ON sesion TO rol_aplicacion;

-- Auditoría: solo lectura.
GRANT SELECT ON auditoria TO rol_aplicacion;

-- SELECT ... FOR UPDATE (bloquear filas dentro de una transacción) exige,
-- además de SELECT, UPDATE, DELETE o LOCK TABLES sobre la tabla. El backend
-- bloquea la zona al agregarle espacios, y en zona no debe poder hacer UPDATE:
-- por eso LOCK TABLES, que se da para la base en uso (ON *) y no permite
-- cambiar ningún dato.
GRANT LOCK TABLES ON * TO rol_aplicacion;
