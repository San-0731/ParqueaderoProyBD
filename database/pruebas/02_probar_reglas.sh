#!/usr/bin/env bash
# =============================================================================
# 02_probar_reglas.sh
# Prueba las reglas de la base con INSERT, UPDATE y DELETE: CHECK, UNIQUE,
# NOT NULL, llaves foráneas (RESTRICT), la regla de estado y los triggers.
#
# Uso (desde la raíz del repositorio, con el contenedor corriendo):
#   bash database/pruebas/02_probar_reglas.sh
#
# Cada caso corre en su propia sesión dentro de START TRANSACTION ... ROLLBACK,
# así que la base queda igual que antes. Si una instrucción falla, el cliente
# mysql se detiene y la transacción se deshace sola al cerrar la sesión.
#
# Cada caso indica el código de error esperado (0 = debe funcionar) y,
# opcionalmente, un texto que debe aparecer en la salida.
# Códigos: 1062 UNIQUE repetido · 3819 CHECK · 1451 borrar/cambiar un padre en
# uso · 1452 FK a un padre inexistente · 1364 falta un valor sin DEFAULT ·
# 1054 columna inexistente · 1644 SIGNAL lanzado por un trigger.
# =============================================================================
set -u

CONTENEDOR="${CONTENEDOR:-parqueadero-mysql}"
correctos=0
fallos=0

# Ejecuta SQL (leído de la entrada estándar) con el usuario de la aplicación.
# Las credenciales salen de las variables del propio contenedor (.env).
sql() {
    docker exec -i "$CONTENEDOR" sh -c \
        'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --default-character-set=utf8mb4 -N -B "$MYSQL_DATABASE"' \
        2>&1 | grep -v "Using a password"
}

# prueba <código esperado> <descripción> <sql> [texto esperado en la salida]
prueba() {
    local esperado="$1" descripcion="$2" consulta="$3" texto="${4:-}"
    local salida codigo
    salida=$(printf 'START TRANSACTION;\n%s\nROLLBACK;\n' "$consulta" | sql)
    codigo=$(grep -oE '^ERROR [0-9]+' <<<"$salida" | head -1 | grep -oE '[0-9]+')
    codigo="${codigo:-0}"
    if [[ "$codigo" == "$esperado" ]] && { [[ -z "$texto" ]] || grep -qF -- "$texto" <<<"$salida"; }; then
        printf '  OK    [%-4s] %s\n' "$codigo" "$descripcion"
        correctos=$((correctos + 1))
    else
        printf '  FALLO [%-4s, se esperaba %s] %s\n' "$codigo" "$esperado" "$descripcion"
        [[ -n "$texto" ]] && printf '        texto esperado: %s\n' "$texto"
        printf '        salida: %s\n' "$(tr '\n' ' ' <<<"$salida")"
        fallos=$((fallos + 1))
    fi
}

# Atajos para buscar ids por datos naturales (los ids no se escriben a mano).
veh() { echo "(SELECT id_vehiculo FROM vehiculo WHERE identificador = '$1')"; }
esp() { echo "(SELECT id_espacio FROM espacio WHERE piso = '$1' AND zona = '$2' AND numero = '$3')"; }
tipo() { echo "(SELECT id_tipo FROM tipo_vehiculo WHERE nombre = '$1')"; }
met() { echo "(SELECT id_metodo FROM metodo_pago WHERE nombre = '$1')"; }
cli() { echo "(SELECT id_cliente FROM cliente WHERE documento = '$1')"; }
# Id del registro ACTIVO de un vehículo. Se guarda en @r antes del UPDATE
# porque MySQL no permite consultar la misma tabla que se está modificando.
activo() { echo "SET @r = (SELECT id_registro FROM registro_parqueo WHERE estado = 'ACTIVO' AND id_vehiculo = $(veh "$1"));"; }

# Conteos que deben mantenerse: tipos, métodos, tarifas, espacios, clientes,
# vehículos, registros, activos y pagos.
CONTEOS="SELECT CONCAT_WS(',', (SELECT COUNT(*) FROM tipo_vehiculo), (SELECT COUNT(*) FROM metodo_pago),
    (SELECT COUNT(*) FROM tarifa), (SELECT COUNT(*) FROM espacio), (SELECT COUNT(*) FROM cliente),
    (SELECT COUNT(*) FROM vehiculo), (SELECT COUNT(*) FROM registro_parqueo),
    (SELECT COUNT(*) FROM registro_parqueo WHERE estado = 'ACTIVO'), (SELECT COUNT(*) FROM pago));"
CONTEOS_ESPERADOS="4,4,8,20,10,15,31,4,29"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTENEDOR"; then
    echo "El contenedor $CONTENEDOR no está corriendo. Levántalo con: docker compose up -d"
    exit 1
fi


echo "== Datos iniciales y vistas =="
prueba 0 "conteos de V002 y V003" "$CONTEOS" "$CONTEOS_ESPERADOS"
prueba 0 "vistas: 15 disponibles, 4 activos, 27 en historial, 505600 recaudados" \
    "SELECT CONCAT_WS(',', (SELECT COUNT(*) FROM vw_espacios_disponibles), (SELECT COUNT(*) FROM vw_parqueos_activos),
        (SELECT COUNT(*) FROM vw_historial_parqueos), (SELECT SUM(total_recaudado) FROM vw_ingresos_por_metodo));" \
    "15,4,27,505600.00"


echo "== registro_parqueo: INSERT (estado y un solo registro ACTIVO) =="
prueba 0 "entrada válida: estado toma 'ACTIVO' por defecto" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES ($(veh KLM234), $(esp 1 A 01));
     SELECT estado FROM registro_parqueo WHERE id_registro = LAST_INSERT_ID();" "ACTIVO"
prueba 1062 "vehículo que ya está adentro (MVC054) no puede entrar otra vez" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES ($(veh MVC054), $(esp 1 A 01));" \
    "uq_registro_vehiculo_activo"
prueba 1062 "espacio ocupado (1-A-02) no recibe otro vehículo" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES ($(veh KLM234), $(esp 1 A 02));" \
    "uq_registro_espacio_activo"
prueba 3819 "estado que no existe ('FINAL')" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, estado) VALUES ($(veh KLM234), $(esp 1 A 01), 'FINAL');"
prueba 3819 "estado en minúsculas ('activo')" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, estado) VALUES ($(veh KLM234), $(esp 1 A 01), 'activo');"
prueba 3819 "registro ACTIVO con salida" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida)
     VALUES ($(veh KLM234), $(esp 1 A 01), '2026-10-30 08:00', '2026-10-30 09:00');" "chk_registro_estado_coherente"
prueba 3819 "registro PAGO sin minutos ni valor" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, estado)
     VALUES ($(veh KLM234), $(esp 1 A 01), '2026-10-30 08:00', '2026-10-30 09:00', 'PAGO');" "chk_registro_estado_coherente"
prueba 3819 "minutos que no cuadran con entrada y salida (90 en vez de 60)" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total, estado)
     VALUES ($(veh KLM234), $(esp 1 A 01), '2026-10-30 08:00', '2026-10-30 09:00', 90, 5000, 'PAGO');" "chk_registro_minutos_coherentes"
prueba 3819 "salida igual a la entrada" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total, estado)
     VALUES ($(veh KLM234), $(esp 1 A 01), '2026-10-30 08:00', '2026-10-30 08:00', 0, 0, 'PAGO');" "chk_registro_salida_posterior"
prueba 3819 "valor_total negativo" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total, estado)
     VALUES ($(veh KLM234), $(esp 1 A 01), '2026-10-30 08:00', '2026-10-30 09:00', 60, -1, 'PAGO');" "chk_registro_valor_total_no_negativo"
prueba 0 "registro PAGO completo y coherente" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, entrada, salida, minutos_totales, valor_total, estado)
     VALUES ($(veh KLM234), $(esp 1 A 01), '2026-10-30 08:00', '2026-10-30 09:00', 60, 5000, 'PAGO');"
prueba 1452 "vehículo inexistente" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES (9999, $(esp 1 A 01));"
prueba 1054 "las columnas vehiculo_abierto y espacio_abierto ya no existen" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio, vehiculo_abierto) VALUES ($(veh KLM234), $(esp 1 A 01), 1);"


echo "== registro_parqueo: UPDATE (cierre y cambios de estado) =="
prueba 0 "cerrar MVC054: salida, minutos, valor y estado 'PAGO'; el espacio 1-A-02 queda libre" \
    "$(activo MVC054)
     UPDATE registro_parqueo
     SET salida = entrada + INTERVAL 90 MINUTE, minutos_totales = 90, valor_total = 10000, estado = 'PAGO'
     WHERE id_registro = @r;
     SELECT COUNT(*) FROM vw_espacios_disponibles WHERE piso = '1' AND zona = 'A' AND numero = '02';" "1"
prueba 0 "flujo completo: cerrar MVC054, pagar con Nequi y entrar KLM234 al mismo espacio" \
    "$(activo MVC054)
     UPDATE registro_parqueo
     SET salida = entrada + INTERVAL 90 MINUTE, minutos_totales = 90, valor_total = 10000, estado = 'PAGO'
     WHERE id_registro = @r;
     INSERT INTO pago (id_registro, id_metodo, monto, referencia) VALUES (@r, $(met Nequi), 10000, 'NEQ-9001');
     INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES ($(veh KLM234), $(esp 1 A 02));
     SELECT CONCAT_WS(',', (SELECT COUNT(*) FROM vw_parqueos_activos), (SELECT placa FROM vw_parqueos_activos WHERE numero = '02' AND zona = 'A'));" \
    "4,KLM234"
prueba 3819 "cerrar solo con la salida (sin minutos, valor ni estado)" \
    "$(activo MVC054)
     UPDATE registro_parqueo SET salida = entrada + INTERVAL 90 MINUTE WHERE id_registro = @r;"
prueba 3819 "poner 'PAGO' sin registrar la salida ni el cobro" \
    "$(activo MVC054)
     UPDATE registro_parqueo SET estado = 'PAGO' WHERE id_registro = @r;"
prueba 3819 "devolver un registro pagado a 'ACTIVO' sin borrar su cobro" \
    "UPDATE registro_parqueo SET estado = 'ACTIVO' WHERE estado = 'PAGO' AND id_vehiculo = $(veh KLM234) LIMIT 1;"
prueba 1062 "reabrir un registro pagado de MVC054, que ya tiene uno ACTIVO" \
    "UPDATE registro_parqueo SET estado = 'ACTIVO', salida = NULL, minutos_totales = NULL, valor_total = NULL
     WHERE estado = 'PAGO' AND id_vehiculo = $(veh MVC054);" "uq_registro_vehiculo_activo"


echo "== Triggers =="
prueba 0 "trigger 1: 'abc-123' se guarda como 'ABC123'" \
    "INSERT INTO vehiculo (identificador, id_tipo, id_cliente) VALUES ('abc-123', $(tipo Carro), $(cli 1012345678));
     SELECT identificador FROM vehiculo WHERE id_vehiculo = LAST_INSERT_ID();" "ABC123"
prueba 0 "trigger 1: ' xyz 987 ' se guarda como 'XYZ987'" \
    "INSERT INTO vehiculo (identificador, id_tipo, id_cliente) VALUES (' xyz 987 ', $(tipo Carro), $(cli 1012345678));
     SELECT identificador FROM vehiculo WHERE id_vehiculo = LAST_INSERT_ID();" "XYZ987"
prueba 0 "trigger 1 en UPDATE: 'klm-999' se guarda como 'KLM999'" \
    "UPDATE vehiculo SET identificador = 'klm-999' WHERE identificador = 'KLM234';
     SELECT COUNT(*) FROM vehiculo WHERE identificador = 'KLM999';" "1"
prueba 1062 "trigger 1 + UNIQUE: 'klm-234' normalizado choca con KLM234" \
    "INSERT INTO vehiculo (identificador, id_tipo, id_cliente) VALUES ('klm-234', $(tipo Carro), $(cli 1012345678));" \
    "uq_vehiculo_identificador"
prueba 3819 "caracteres que el trigger no limpia ('ABC.123') los rechaza el CHECK" \
    "INSERT INTO vehiculo (identificador, id_tipo, id_cliente) VALUES ('ABC.123', $(tipo Carro), $(cli 1012345678));"
prueba 1644 "trigger 2: moto (ABC12D) en espacio de carro (1-A-01)" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES ($(veh ABC12D), $(esp 1 A 01));" "no coincide"
prueba 1644 "trigger 3: carro en el espacio deshabilitado 2-B-04" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES ($(veh KLM234), $(esp 2 B 04));" "habilitado"
prueba 1644 "trigger 2 en UPDATE: mover MVC054 a un espacio de motos" \
    "$(activo MVC054)
     UPDATE registro_parqueo SET id_espacio = $(esp 1 M 01) WHERE id_registro = @r;" "no coincide"
prueba 1644 "trigger 3 en UPDATE: mover MVC054 al espacio deshabilitado 2-B-04" \
    "$(activo MVC054)
     UPDATE registro_parqueo SET id_espacio = $(esp 2 B 04) WHERE id_registro = @r;" "habilitado"
prueba 0 "mover MVC054 a un espacio de carro libre (1-A-03)" \
    "$(activo MVC054)
     UPDATE registro_parqueo SET id_espacio = $(esp 1 A 03) WHERE id_registro = @r;"
prueba 0 "cerrar un registro cuyo espacio se deshabilitó mientras estaba adentro" \
    "UPDATE espacio SET habilitado = FALSE WHERE piso = '1' AND zona = 'A' AND numero = '02';
     $(activo MVC054)
     UPDATE registro_parqueo
     SET salida = entrada + INTERVAL 30 MINUTE, minutos_totales = 30, valor_total = 5000, estado = 'PAGO'
     WHERE id_registro = @r;"
prueba 1452 "espacio inexistente: el trigger no estorba y responde la llave foránea" \
    "INSERT INTO registro_parqueo (id_vehiculo, id_espacio) VALUES ($(veh KLM234), 9999);"


echo "== Catálogos: CHECK, UNIQUE y NOT NULL =="
prueba 3819 "tarifa con valor_hora = 0" \
    "INSERT INTO tarifa (id_tipo, valor_hora, vigente_desde) VALUES ($(tipo Carro), 0, '2027-01-01');"
prueba 1062 "dos tarifas del mismo tipo que empiezan el mismo día" \
    "INSERT INTO tarifa (id_tipo, valor_hora, vigente_desde) VALUES ($(tipo Carro), 5500, '2026-10-01');"
prueba 0 "tarifa nueva válida" \
    "INSERT INTO tarifa (id_tipo, valor_hora, vigente_desde) VALUES ($(tipo Carro), 5500, '2027-01-01');"
prueba 3819 "pago con monto = 0" \
    "INSERT INTO pago (id_registro, id_metodo, monto) VALUES (1, $(met Efectivo), 0);"
prueba 1062 "referencia de pago repetida (NEQ-0001)" \
    "INSERT INTO pago (id_registro, id_metodo, monto, referencia) VALUES (1, $(met Nequi), 1000, 'NEQ-0001');"
prueba 0 "dos pagos en efectivo sin referencia (varios NULL en un UNIQUE)" \
    "INSERT INTO pago (id_registro, id_metodo, monto) VALUES (1, $(met Efectivo), 1000), (1, $(met Efectivo), 1000);"
prueba 3819 "vehículo con año 1800" \
    "INSERT INTO vehiculo (identificador, id_tipo, id_cliente, anio) VALUES ('DEF456', $(tipo Carro), $(cli 1012345678), 1800);"
prueba 3819 "identificador vacío" \
    "INSERT INTO vehiculo (identificador, id_tipo, id_cliente) VALUES ('', $(tipo Carro), $(cli 1012345678));"
prueba 0 "placa de moto ABC12D es un formato válido" \
    "INSERT INTO vehiculo (identificador, id_tipo, id_cliente) VALUES ('JKL34M', $(tipo Moto), $(cli 1012345678));"
prueba 1062 "dos espacios en la misma ubicación (1-A-01)" \
    "INSERT INTO espacio (id_tipo, piso, zona, numero) VALUES ($(tipo Carro), '1', 'A', '01');"
prueba 1062 "cliente con documento repetido" \
    "INSERT INTO cliente (documento, nombres, apellidos) VALUES ('1012345678', 'Otra', 'Persona');"
prueba 1062 "modelo repetido en la misma marca (Chevrolet Spark)" \
    "INSERT INTO modelo (id_marca, nombre) SELECT id_marca, 'Spark' FROM marca WHERE nombre = 'Chevrolet';"
prueba 1364 "método de pago sin requiere_referencia (no tiene DEFAULT)" \
    "INSERT INTO metodo_pago (nombre) VALUES ('Tarjeta');"


echo "== DELETE y llaves foráneas (RESTRICT) =="
prueba 1451 "borrar un registro que tiene pagos" \
    "DELETE FROM registro_parqueo WHERE id_registro = 1;"
prueba 0 "borrar un pago" \
    "DELETE FROM pago WHERE referencia = 'NEQ-0001';"
prueba 0 "borrar un registro ACTIVO (sin pagos), por ejemplo una entrada anulada" \
    "$(activo MVC054)
     DELETE FROM registro_parqueo WHERE id_registro = @r;"
prueba 1451 "borrar un vehículo con historial" \
    "DELETE FROM vehiculo WHERE identificador = 'KLM234';"
prueba 1451 "borrar un cliente con vehículos" \
    "DELETE FROM cliente WHERE documento = '1012345678';"
prueba 1451 "borrar un tipo de vehículo en uso" \
    "DELETE FROM tipo_vehiculo WHERE nombre = 'Carro';"
prueba 1451 "cambiar el id de un tipo de vehículo en uso" \
    "UPDATE tipo_vehiculo SET id_tipo = 99 WHERE nombre = 'Carro';"
prueba 1451 "borrar un método de pago en uso" \
    "DELETE FROM metodo_pago WHERE nombre = 'Nequi';"
prueba 1451 "borrar una marca con modelos" \
    "DELETE FROM marca WHERE nombre = 'Chevrolet';"
prueba 1451 "borrar un espacio con historial" \
    "DELETE FROM espacio WHERE piso = '1' AND zona = 'A' AND numero = '01';"
prueba 0 "borrar un espacio sin historial (2-B-04)" \
    "DELETE FROM espacio WHERE piso = '2' AND zona = 'B' AND numero = '04';"
prueba 1452 "pago para un registro inexistente" \
    "INSERT INTO pago (id_registro, id_metodo, monto) VALUES (9999, $(met Efectivo), 1000);"


echo "== La base quedó igual (todas las pruebas se deshicieron) =="
prueba 0 "conteos iguales a los iniciales" "$CONTEOS" "$CONTEOS_ESPERADOS"


echo
echo "Resultado: $correctos correctas, $fallos fallidas."
if (( fallos == 0 )); then
    echo "TODAS LAS PRUEBAS PASARON"
else
    exit 1
fi
