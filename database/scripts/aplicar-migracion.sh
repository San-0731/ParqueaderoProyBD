#!/usr/bin/env bash
# =============================================================================
# aplicar-migracion.sh
# Aplica UNA migración nueva a una base que ya existe (normalmente la de
# desarrollo, parqueadero), conservando sus datos. Antes hace un respaldo
# completo con mysqldump.
#
# Por qué hace falta: Docker solo ejecuta database/migrations cuando el volumen
# está vacío (la primera vez). Una migración agregada después (V006, V007...)
# hay que aplicarla a mano, una sola vez y en orden.
#
# Uso (desde la raíz del repositorio, con MySQL encendido):
#   ./database/scripts/aplicar-migracion.sh database/migrations/V006__normalizar_zonas.sql
#
# Si la migración falla a mitad de camino, la base queda a medias (en MySQL las
# instrucciones que cambian tablas no se pueden deshacer). Para volver al
# estado anterior, restaura el respaldo que se hizo justo antes:
#   ./database/scripts/aplicar-migracion.sh --restaurar database/respaldos/<archivo>.sql
# Restaurar BORRA la base y la vuelve a crear desde el respaldo; por eso pide
# escribir el nombre de la base para confirmar.
#
# Los respaldos quedan en database/respaldos/, que está en .gitignore: tienen
# datos personales de los clientes y nunca se suben al repositorio.
#
# Credenciales: DB_ROOT_PASSWORD y DB_NAME salen del .env de la raíz; si ya
# existen como variables de entorno, ganan las del entorno. Se usa root porque,
# con el registro binario de MySQL activo, un usuario sin privilegios
# especiales no puede crear triggers.
#
# Variables opcionales (las mismas de recrear-bd-pruebas.sh):
#   MODO_MYSQL  docker (por defecto) o directo (cliente mysql de esta máquina).
#   CONTENEDOR  contenedor de MySQL (por defecto parqueadero-mysql).
#   DB_HOST, DB_PORT solo en modo directo (por defecto 127.0.0.1 y 3306).
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVO_ENV="$RAIZ/.env"
CARPETA_RESPALDOS="$RAIZ/database/respaldos"

error() {
    echo "ERROR: $*" >&2
    exit 1
}

uso() {
    echo "Uso:"
    echo "  $0 database/migrations/V00N__descripcion.sql"
    echo "  $0 --restaurar database/respaldos/<respaldo>.sql"
    exit 1
}

# leer_env NOMBRE: igual que en recrear-bd-pruebas.sh (sin "source .env", para
# que una contraseña con $ o ` no se interprete como código).
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

# ---------- Argumentos ----------
ACCION="aplicar"
if [[ "${1:-}" == "--restaurar" ]]; then
    ACCION="restaurar"
    shift
fi
[[ $# -eq 1 ]] || uso
ARCHIVO="$1"
[[ -f "$ARCHIVO" ]] || error "No existe el archivo '$ARCHIVO'."

MODO_MYSQL="${MODO_MYSQL:-docker}"
CONTENEDOR="${CONTENEDOR:-parqueadero-mysql}"
DB_ROOT_PASSWORD="$(leer_env DB_ROOT_PASSWORD)"
DB_NAME="$(leer_env DB_NAME)"
DB_HOST="$(leer_env DB_HOST)"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(leer_env DB_PORT)"
DB_PORT="${DB_PORT:-3306}"

[[ -n "$DB_ROOT_PASSWORD" ]] || error "Falta DB_ROOT_PASSWORD (defínela en el .env de la raíz o en el entorno)."
[[ -n "$DB_NAME" ]] || error "Falta DB_NAME (defínela en el .env de la raíz o en el entorno)."
# El nombre de la base va dentro del SQL: solo letras, números y guion bajo.
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || error "DB_NAME solo puede tener letras, números y _."

# La contraseña viaja en MYSQL_PWD y no en la línea de comandos.
export MYSQL_PWD="$DB_ROOT_PASSWORD"

# cliente_root PROGRAMA [opciones]: ejecuta mysql o mysqldump como root.
cliente_root() {
    local programa="$1"
    shift
    case "$MODO_MYSQL" in
        docker)
            docker exec -i -e MYSQL_PWD "$CONTENEDOR" "$programa" -uroot "$@"
            ;;
        directo)
            "$programa" -h "$DB_HOST" -P "$DB_PORT" --protocol=TCP -uroot "$@"
            ;;
        *)
            error "MODO_MYSQL debe ser 'docker' o 'directo' (se recibió '$MODO_MYSQL')."
            ;;
    esac
}

mysql_root() {
    cliente_root mysql --default-character-set=utf8mb4 "$@"
}

if [[ "$MODO_MYSQL" == "docker" ]]; then
    docker inspect -f '{{.State.Running}}' "$CONTENEDOR" 2>/dev/null | grep -q true \
        || error "El contenedor $CONTENEDOR no está encendido. Ejecuta: docker compose up -d"
fi

# ---------- Restaurar un respaldo ----------
if [[ "$ACCION" == "restaurar" ]]; then
    echo "Se va a BORRAR la base '$DB_NAME' y a crear de nuevo desde:"
    echo "  $ARCHIVO"
    read -r -p "Escribe el nombre de la base para confirmar: " confirmacion
    [[ "$confirmacion" == "$DB_NAME" ]] || error "No coincide: no se hizo nada."
    # Los permisos (GRANT) sobre la base no se pierden al borrarla: MySQL los
    # guarda aparte, por nombre de base.
    mysql_root <<SQL || error "No se pudo recrear la base $DB_NAME."
DROP DATABASE IF EXISTS \`$DB_NAME\`;
CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
    mysql_root "$DB_NAME" <"$ARCHIVO" || error "Falló la restauración. Revisa el mensaje de MySQL."
    echo "Listo: $DB_NAME quedó como en el respaldo."
    exit 0
fi

# ---------- Aplicar una migración ----------
NOMBRE_MIGRACION="$(basename "$ARCHIVO")"
[[ "$NOMBRE_MIGRACION" =~ ^V[0-9]+__.+\.sql$ ]] \
    || error "'$NOMBRE_MIGRACION' no parece una migración (V00N__descripcion.sql)."

# 1. Respaldo completo, con vistas y triggers (--routines --triggers).
#    --single-transaction: copia consistente sin bloquear las tablas.
#    --set-gtid-purged=OFF y --no-tablespaces: el respaldo se puede restaurar
#    en otra instalación sin permisos especiales.
mkdir -p "$CARPETA_RESPALDOS"
RESPALDO="$CARPETA_RESPALDOS/${DB_NAME}_$(date +%Y%m%d_%H%M%S)_antes_${NOMBRE_MIGRACION}"
echo "1. Respaldando $DB_NAME en $RESPALDO ..."
cliente_root mysqldump --default-character-set=utf8mb4 --single-transaction --routines \
    --triggers --set-gtid-purged=OFF --no-tablespaces "$DB_NAME" >"$RESPALDO" \
    || error "No se pudo hacer el respaldo; la migración NO se aplicó."
[[ -s "$RESPALDO" ]] || error "El respaldo quedó vacío; la migración NO se aplicó."

# 2. La migración, como root y dentro de la base.
echo "2. Aplicando $NOMBRE_MIGRACION en $DB_NAME ..."
if ! mysql_root "$DB_NAME" <"$ARCHIVO"; then
    echo "ERROR: falló $NOMBRE_MIGRACION. La base pudo quedar a medias." >&2
    echo "Para volver a como estaba antes:" >&2
    echo "  $0 --restaurar $RESPALDO" >&2
    exit 1
fi

echo "Listo: $NOMBRE_MIGRACION aplicada en $DB_NAME."
echo "Respaldo previo: $RESPALDO"
