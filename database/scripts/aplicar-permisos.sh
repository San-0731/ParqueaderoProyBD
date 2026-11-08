#!/usr/bin/env bash
# =============================================================================
# aplicar-permisos.sh
# Deja al usuario de la aplicación (DB_USER del .env) solo con el rol
# rol_aplicacion (V009) en la base DB_NAME: le quita el ALL PRIVILEGES con que
# lo crea Docker y le asigna el rol como rol por defecto.
#
# Uso (desde la raíz del repositorio, con MySQL encendido y V009 ya aplicada):
#   ./database/scripts/aplicar-permisos.sh             # deja solo el rol
#   ./database/scripts/aplicar-permisos.sh --revertir  # vuelve a ALL (para diagnosticar)
#
# Después, desde esa cuenta, por ejemplo:
#   DELETE FROM pago;  →  ERROR 1142: DELETE command denied to user ...
#
# No se usa con la base de pruebas (*_test): las pruebas de integración limpian
# sus datos con DELETE y necesitan ALL. Para comprobar los permisos del rol sin
# tocar a nadie está database/scripts/verificar-permisos.sh.
#
# Credenciales: DB_ROOT_PASSWORD, DB_NAME y DB_USER salen del .env de la raíz
# (o del entorno). Variables opcionales: MODO_MYSQL (docker o directo),
# CONTENEDOR, DB_HOST y DB_PORT, como en los demás scripts.
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVO_ENV="$RAIZ/.env"

error() {
    echo "ERROR: $*" >&2
    exit 1
}

# leer_env NOMBRE: igual que en recrear-bd-pruebas.sh.
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

ACCION="aplicar"
if [[ "${1:-}" == "--revertir" ]]; then
    ACCION="revertir"
elif [[ $# -gt 0 ]]; then
    error "Uso: $0 [--revertir]"
fi

MODO_MYSQL="${MODO_MYSQL:-docker}"
CONTENEDOR="${CONTENEDOR:-parqueadero-mysql}"
DB_ROOT_PASSWORD="$(leer_env DB_ROOT_PASSWORD)"
DB_NAME="$(leer_env DB_NAME)"
DB_USER="$(leer_env DB_USER)"
DB_HOST="$(leer_env DB_HOST)"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(leer_env DB_PORT)"
DB_PORT="${DB_PORT:-3306}"

[[ -n "$DB_ROOT_PASSWORD" ]] || error "Falta DB_ROOT_PASSWORD (en el .env de la raíz o en el entorno)."
[[ -n "$DB_NAME" && -n "$DB_USER" ]] || error "Faltan DB_NAME o DB_USER (en el .env de la raíz o en el entorno)."
# Van dentro del SQL: solo letras, números y guion bajo.
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || error "DB_NAME solo puede tener letras, números y _."
[[ "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]] || error "DB_USER solo puede tener letras, números y _."
[[ "$DB_NAME" != *_test ]] || error "La base de pruebas ($DB_NAME) conserva ALL: las pruebas borran sus datos con DELETE."

export MYSQL_PWD="$DB_ROOT_PASSWORD"

mysql_root() {
    local opciones=(-uroot --default-character-set=utf8mb4 -N -B)
    case "$MODO_MYSQL" in
        docker) docker exec -i -e MYSQL_PWD "$CONTENEDOR" mysql "${opciones[@]}" "$@" ;;
        directo) mysql -h "$DB_HOST" -P "$DB_PORT" --protocol=TCP "${opciones[@]}" "$@" ;;
        *) error "MODO_MYSQL debe ser 'docker' o 'directo' (se recibió '$MODO_MYSQL')." ;;
    esac
}

# '%' es el host con el que Docker crea el usuario de la aplicación.
CUENTA="'$DB_USER'@'%'"

if [[ "$ACCION" == "revertir" ]]; then
    mysql_root <<SQL || error "No se pudieron devolver los permisos a $CUENTA."
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO $CUENTA;
REVOKE IF EXISTS rol_aplicacion FROM $CUENTA;
SQL
    echo "Listo: $CUENTA volvió a tener ALL PRIVILEGES sobre $DB_NAME (sin rol_aplicacion)."
    exit 0
fi

# El rol debe existir y tener permisos en esta base (es decir, V009 aplicada).
TIENE_PERMISOS="$(mysql_root <<SQL
SELECT COUNT(*) FROM mysql.tables_priv
WHERE User = 'rol_aplicacion' AND Db = '$DB_NAME';
SQL
)" || error "No se pudo consultar MySQL (¿está encendido? ¿DB_ROOT_PASSWORD es correcta?)."
[[ "$TIENE_PERMISOS" -gt 0 ]] || error "rol_aplicacion no tiene permisos en $DB_NAME. Aplica primero V009:
  ./database/scripts/aplicar-migracion.sh database/migrations/V009__rol_aplicacion.sql"

mysql_root <<SQL || error "No se pudieron cambiar los permisos de $CUENTA. ¿Existe ese usuario?"
REVOKE IF EXISTS ALL PRIVILEGES ON \`$DB_NAME\`.* FROM $CUENTA;
GRANT rol_aplicacion TO $CUENTA;
SET DEFAULT ROLE rol_aplicacion TO $CUENTA;
SQL

echo "Listo: $CUENTA ya no tiene ALL sobre $DB_NAME; solo los permisos de rol_aplicacion."
echo "Las conexiones nuevas (reinicia el backend) ya usan el rol."
echo "Para comprobarlo: ./database/scripts/verificar-permisos.sh"
