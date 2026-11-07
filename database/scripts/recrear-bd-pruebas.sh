#!/usr/bin/env bash
# =============================================================================
# recrear-bd-pruebas.sh
# Borra y vuelve a crear la base de pruebas (parqueadero_test) aplicando todas
# las migraciones de database/migrations en orden. Las pruebas de integración
# del backend (mvn verify -Pintegracion) usan esta base, nunca la de desarrollo.
#
# Uso (desde la raíz del repositorio, con MySQL encendido):
#   ./database/scripts/recrear-bd-pruebas.sh
#
# Credenciales: DB_ROOT_PASSWORD y DB_USER salen del .env de la raíz. Si ya
# existen como variables de entorno, ganan las del entorno (igual que en
# Configuracion.java); así funciona también en GitHub Actions, donde no hay .env.
#
# Se usa el usuario root porque, con el registro binario de MySQL activo, un
# usuario sin privilegios especiales no puede crear triggers.
#
# Variables opcionales:
#   MODO_MYSQL       docker (por defecto): ejecuta el cliente mysql dentro del
#                    contenedor con "docker exec".
#                    directo: usa el cliente mysql instalado en esta máquina
#                    y se conecta a DB_HOST:DB_PORT (modo de GitHub Actions).
#   CONTENEDOR       contenedor de MySQL (por defecto parqueadero-mysql).
#   DB_HOST, DB_PORT solo en modo directo (por defecto 127.0.0.1 y 3306).
#   DB_NAME_PRUEBAS  nombre de la base de pruebas (por defecto parqueadero_test).
#                    Por seguridad debe terminar en _test.
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVO_ENV="$RAIZ/.env"
CARPETA_MIGRACIONES="$RAIZ/database/migrations"

error() {
    echo "ERROR: $*" >&2
    exit 1
}

# leer_env NOMBRE: devuelve el valor de la variable de entorno NOMBRE o, si no
# existe o está vacía, el de la línea NOMBRE=valor del .env (sin comillas).
# No se usa "source .env": una contraseña con caracteres como $ o ` se
# interpretaría como código de la terminal.
leer_env() {
    local nombre="$1" valor
    valor="${!nombre:-}"
    if [[ -z "$valor" && -f "$ARCHIVO_ENV" ]]; then
        # tr quita el \r de los archivos guardados con finales de línea de Windows.
        valor="$(grep -E "^[[:space:]]*${nombre}[[:space:]]*=" "$ARCHIVO_ENV" | tail -n 1 \
            | cut -d '=' -f 2- | tr -d '\r' || true)"
        # Quita espacios alrededor y las comillas que envuelvan el valor.
        valor="$(sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' <<<"$valor")"
        if [[ "$valor" =~ ^\"(.*)\"$ || "$valor" =~ ^\'(.*)\'$ ]]; then
            valor="${BASH_REMATCH[1]}"
        fi
    fi
    printf '%s' "$valor"
}

MODO_MYSQL="${MODO_MYSQL:-docker}"
CONTENEDOR="${CONTENEDOR:-parqueadero-mysql}"
DB_NAME_PRUEBAS="${DB_NAME_PRUEBAS:-parqueadero_test}"
DB_ROOT_PASSWORD="$(leer_env DB_ROOT_PASSWORD)"
DB_USER="$(leer_env DB_USER)"
DB_HOST="$(leer_env DB_HOST)"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(leer_env DB_PORT)"
DB_PORT="${DB_PORT:-3306}"

# ---------- Validaciones antes de tocar la base ----------
[[ -n "$DB_ROOT_PASSWORD" ]] || error "Falta DB_ROOT_PASSWORD (defínela en el .env de la raíz o en el entorno)."
[[ -n "$DB_USER" ]] || error "Falta DB_USER (defínela en el .env de la raíz o en el entorno)."
# El nombre de la base y el usuario van dentro del SQL: solo se aceptan letras,
# números y guion bajo para que no se pueda colar otra instrucción.
[[ "$DB_NAME_PRUEBAS" =~ ^[A-Za-z0-9_]+$ ]] || error "DB_NAME_PRUEBAS solo puede tener letras, números y _."
[[ "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]] || error "DB_USER solo puede tener letras, números y _."
# Protección: este script BORRA la base. Nunca debe apuntar a la de desarrollo.
[[ "$DB_NAME_PRUEBAS" == *_test ]] || error "La base de pruebas debe terminar en _test (se recibió '$DB_NAME_PRUEBAS'). Este script borra la base: no se usa con la de desarrollo."
compgen -G "$CARPETA_MIGRACIONES/V*.sql" >/dev/null || error "No hay migraciones V*.sql en $CARPETA_MIGRACIONES."

# La contraseña de root viaja en MYSQL_PWD (variable que lee el cliente mysql)
# y no en la línea de comandos, donde otros procesos podrían verla.
export MYSQL_PWD="$DB_ROOT_PASSWORD"

# mysql_root [base]: ejecuta como root el SQL que llega por la entrada estándar.
mysql_root() {
    local opciones=(-uroot --default-character-set=utf8mb4 -N -B)
    case "$MODO_MYSQL" in
        docker)
            # "-e MYSQL_PWD" sin valor pasa la variable de esta terminal al contenedor.
            docker exec -i -e MYSQL_PWD "$CONTENEDOR" mysql "${opciones[@]}" "$@"
            ;;
        directo)
            mysql -h "$DB_HOST" -P "$DB_PORT" --protocol=TCP "${opciones[@]}" "$@"
            ;;
        *)
            error "MODO_MYSQL debe ser 'docker' o 'directo' (se recibió '$MODO_MYSQL')."
            ;;
    esac
}

if [[ "$MODO_MYSQL" == "docker" ]]; then
    echo "Modo docker: contenedor $CONTENEDOR"
    docker inspect -f '{{.State.Running}}' "$CONTENEDOR" 2>/dev/null | grep -q true \
        || error "El contenedor $CONTENEDOR no está encendido. Ejecuta: docker compose up -d"
else
    echo "Modo directo: $DB_HOST:$DB_PORT"
fi

# ---------- 1. Borrar y crear la base ----------
echo "Recreando la base $DB_NAME_PRUEBAS..."
mysql_root <<SQL || error "No se pudo recrear la base $DB_NAME_PRUEBAS (¿MySQL encendido y DB_ROOT_PASSWORD correcta?)."
DROP DATABASE IF EXISTS \`$DB_NAME_PRUEBAS\`;
CREATE DATABASE \`$DB_NAME_PRUEBAS\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

# ---------- 2. Aplicar las migraciones en orden ----------
# sort -V ordena por versión: V2 va antes que V10 aunque no tengan ceros a la izquierda.
while IFS= read -r migracion; do
    echo "  Aplicando $(basename "$migracion")"
    mysql_root "$DB_NAME_PRUEBAS" <"$migracion" \
        || error "Falló la migración $(basename "$migracion"). La base $DB_NAME_PRUEBAS quedó incompleta; corrige el error y vuelve a ejecutar este script."
done < <(find "$CARPETA_MIGRACIONES" -maxdepth 1 -name 'V*.sql' | sort -V)

# ---------- 3. Permisos para el usuario de la aplicación ----------
# '%' es el host con el que Docker (y el servicio de GitHub Actions) crea el usuario.
mysql_root <<SQL || error "No se pudieron dar permisos a '$DB_USER'. ¿Existe ese usuario en MySQL?"
GRANT ALL PRIVILEGES ON \`$DB_NAME_PRUEBAS\`.* TO '$DB_USER'@'%';
SQL

# ---------- 4. Resumen ----------
read -r tablas vistas triggers < <(mysql_root <<SQL
SELECT
    (SELECT COUNT(*) FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = '$DB_NAME_PRUEBAS' AND TABLE_TYPE = 'BASE TABLE'),
    (SELECT COUNT(*) FROM information_schema.VIEWS WHERE TABLE_SCHEMA = '$DB_NAME_PRUEBAS'),
    (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = '$DB_NAME_PRUEBAS');
SQL
)
echo "Listo: $DB_NAME_PRUEBAS tiene $tablas tablas, $vistas vistas y $triggers triggers."
echo "Permisos dados a '$DB_USER'. Ahora: cd backend && mvn verify -Pintegracion"
