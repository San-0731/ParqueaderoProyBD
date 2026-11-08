#!/usr/bin/env bash
# =============================================================================
# verificar-permisos.sh
# Comprueba que rol_aplicacion (V009) tenga justo los permisos esperados en la
# base DB_NAME: lo que el backend necesita funciona y lo demás responde
# ERROR 1142 (sin permiso sobre la tabla) o 1143 (sin permiso sobre la columna).
#
# Crea un usuario TEMPORAL con solo ese rol y una contraseña al azar, prueba con
# él y lo borra al final. No toca al usuario de la aplicación ni cambia datos
# (lo que escribe va dentro de transacciones que se deshacen).
#
# Uso (desde la raíz, con MySQL encendido):
#   ./database/scripts/verificar-permisos.sh                  # base DB_NAME del .env
#   DB_NAME=parqueadero_test ./database/scripts/verificar-permisos.sh
#
# Sale con código 1 si algún resultado no es el esperado (así sirve en el CI).
# Variables opcionales: MODO_MYSQL (docker o directo), CONTENEDOR, DB_HOST y
# DB_PORT, como en los demás scripts.
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVO_ENV="$RAIZ/.env"

error() {
    echo "ERROR: $*" >&2
    exit 1
}

leer_env() {
    local nombre="$1" valor
    valor="${!nombre:-}"
    if [[ -z "$valor" && -f "$ARCHIVO_ENV" ]]; then
        valor="$(grep -E "^[[:space:]]*${nombre}[[:space:]]*=" "$ARCHIVO_ENV" | tail -n 1 \
            | cut -d '=' -f 2- | tr -d '\r' || true)"
        valor="$(sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' <<<"$valor")"
        if [[ "$valor" =~ ^\"(.*)\"$ || "$valor" =~ ^\'(.*)\'$ ]]; then
            valor="${BASH_REMATCH[1]}"
        fi
    fi
    printf '%s' "$valor"
}

MODO_MYSQL="${MODO_MYSQL:-docker}"
CONTENEDOR="${CONTENEDOR:-parqueadero-mysql}"
DB_ROOT_PASSWORD="$(leer_env DB_ROOT_PASSWORD)"
DB_NAME="$(leer_env DB_NAME)"
DB_HOST="$(leer_env DB_HOST)"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(leer_env DB_PORT)"
DB_PORT="${DB_PORT:-3306}"

[[ -n "$DB_ROOT_PASSWORD" ]] || error "Falta DB_ROOT_PASSWORD (en el .env de la raíz o en el entorno)."
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || error "DB_NAME debe tener solo letras, números y _ (se recibió '$DB_NAME')."

USUARIO_TEMPORAL="verifica_permisos"
CLAVE_TEMPORAL="Vp_$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"

# cliente USUARIO CLAVE [base]: ejecuta el SQL de la entrada estándar con esa cuenta.
cliente() {
    local usuario="$1" clave="$2"
    shift 2
    local opciones=(-u"$usuario" --default-character-set=utf8mb4 -N -B)
    case "$MODO_MYSQL" in
        docker) MYSQL_PWD="$clave" docker exec -i -e MYSQL_PWD "$CONTENEDOR" mysql "${opciones[@]}" "$@" ;;
        directo) MYSQL_PWD="$clave" mysql -h "$DB_HOST" -P "$DB_PORT" --protocol=TCP "${opciones[@]}" "$@" ;;
        *) error "MODO_MYSQL debe ser 'docker' o 'directo' (se recibió '$MODO_MYSQL')." ;;
    esac
}

borrar_temporal() {
    cliente root "$DB_ROOT_PASSWORD" <<<"DROP USER IF EXISTS '$USUARIO_TEMPORAL'@'%';" >/dev/null 2>&1 || true
}
trap borrar_temporal EXIT

cliente root "$DB_ROOT_PASSWORD" <<SQL || error "No se pudo crear el usuario temporal (¿MySQL encendido? ¿existe rol_aplicacion?)."
DROP USER IF EXISTS '$USUARIO_TEMPORAL'@'%';
CREATE USER '$USUARIO_TEMPORAL'@'%' IDENTIFIED BY '$CLAVE_TEMPORAL';
GRANT rol_aplicacion TO '$USUARIO_TEMPORAL'@'%';
SET DEFAULT ROLE rol_aplicacion TO '$USUARIO_TEMPORAL'@'%';
SQL

FALLAS=0

# probar DESCRIPCION ESPERADO SQL: ESPERADO es "ok", "1142" o "1143".
probar() {
    local descripcion="$1" esperado="$2" sql="$3" salida obtenido
    if salida="$(cliente "$USUARIO_TEMPORAL" "$CLAVE_TEMPORAL" "$DB_NAME" <<<"$sql" 2>&1)"; then
        obtenido="ok"
    else
        obtenido="$(grep -oE 'ERROR [0-9]+' <<<"$salida" | head -n 1 | cut -d ' ' -f 2)"
        obtenido="${obtenido:-desconocido}"
    fi
    if [[ "$obtenido" == "$esperado" ]]; then
        printf '  ok     %-62s (%s)\n' "$descripcion" "$obtenido"
    else
        printf '  FALLA  %-62s esperado %s, obtenido %s\n' "$descripcion" "$esperado" "$obtenido"
        FALLAS=$((FALLAS + 1))
    fi
}

echo "Permisos de rol_aplicacion en $DB_NAME (con un usuario temporal):"
probar "leer vehículos" ok "SELECT COUNT(*) FROM vehiculo;"
probar "leer una vista" ok "SELECT COUNT(*) FROM vw_parqueos_activos;"
probar "crear una marca (y deshacerlo)" ok \
    "START TRANSACTION; INSERT INTO marca (nombre) VALUES ('__verifica_permisos__'); ROLLBACK;"
probar "habilitar o deshabilitar un espacio" ok \
    "UPDATE espacio SET habilitado = habilitado WHERE id_espacio = 0;"
probar "bloquear una zona (FOR UPDATE)" ok \
    "START TRANSACTION; SELECT id_zona FROM zona LIMIT 1 FOR UPDATE; ROLLBACK;"
probar "borrar sesiones" ok "DELETE FROM sesion WHERE token_hash = '';"
probar "leer la auditoría" ok "SELECT COUNT(*) FROM vw_auditoria;"
probar "borrar pagos" 1142 "DELETE FROM pago WHERE id_pago = 0;"
probar "borrar vehículos" 1142 "DELETE FROM vehiculo WHERE id_vehiculo = 0;"
probar "cambiar la zona o el número de un espacio" 1143 \
    "UPDATE espacio SET numero = numero WHERE id_espacio = 0;"
probar "modificar una zona" 1142 "UPDATE zona SET letra = letra WHERE id_zona = 0;"
probar "escribir en la auditoría" 1142 \
    "INSERT INTO auditoria (tabla, operacion, id_fila, id_usuario, id_rol, datos_despues) VALUES ('pago', 'INSERT', 0, 0, 0, '{}');"
probar "borrar la auditoría" 1142 "DELETE FROM auditoria;"
probar "modificar tarifas" 1142 "UPDATE tarifa SET valor_hora = valor_hora WHERE id_tarifa = 0;"
probar "borrar una tabla (DROP)" 1142 "DROP TABLE pago;"
probar "cambiar una tabla (ALTER)" 1142 "ALTER TABLE pago ADD COLUMN x INT;"
probar "crear una tabla" 1142 "CREATE TABLE prueba_permisos (id INT);"

if [[ "$FALLAS" -gt 0 ]]; then
    echo "$FALLAS resultado(s) distintos de lo esperado."
    exit 1
fi
echo "Todo como se esperaba."
