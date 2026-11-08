#!/usr/bin/env bash
# =============================================================================
# cargar-bd-produccion.sh
# Carga una base de datos VACÍA en la nube (Aiven) con todas las migraciones de
# database/migrations: tablas, catálogos, vistas, triggers, auditoría y el rol
# de la aplicación. Se ejecuta UNA vez, al desplegar (paso B3 del plan).
#
# Uso (desde la raíz del repositorio, con Docker encendido):
#   ./database/scripts/cargar-bd-produccion.sh                     # sin datos de ejemplo
#   ./database/scripts/cargar-bd-produccion.sh --con-datos-prueba  # con V003 (para la demo)
#
# El script PREGUNTA el host, el puerto, el usuario, la base y la contraseña.
# La contraseña no se muestra al escribirla, no queda en el historial de la
# terminal y no se lee de ningún archivo: las credenciales de producción nunca
# se guardan en el repositorio.
#
# Por qué el cliente de MySQL va dentro de Docker: en Kali (y otras
# distribuciones) el comando "mysql" del sistema es el de MariaDB, que puede
# fallar con la autenticación de MySQL 8. La imagen oficial mysql:8.4 trae el
# cliente correcto; el contenedor se crea para cada instrucción y se borra solo.
#
# Detalles de la conexión:
#   --ssl-mode=REQUIRED      la conexión va cifrada (Aiven lo exige).
#   --init-command           SET time_zone = '-05:00' en la sesión: los NOW() de
#                            los datos de prueba y los DEFAULT CURRENT_TIMESTAMP
#                            quedan en hora de Colombia aunque el servidor esté
#                            en UTC (el backend hace lo mismo en ConexionBD).
#   --network host           para que también funcione con un MySQL de este
#                            mismo computador (127.0.0.1) al probar el script.
#
# Variable opcional:
#   IMAGEN_MYSQL  imagen del cliente (por defecto mysql:8.4).
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CARPETA_MIGRACIONES="$RAIZ/database/migrations"
IMAGEN_MYSQL="${IMAGEN_MYSQL:-mysql:8.4}"
ZONA_HORARIA="-05:00"

error() {
    echo "ERROR: $*" >&2
    exit 1
}

uso() {
    echo "Uso: $0 [--con-datos-prueba]"
    echo "  --con-datos-prueba  también carga los datos de ejemplo (útil para la demostración)"
    exit "${1:-1}"
}

# ---------- Argumentos ----------
CON_DATOS_PRUEBA=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --con-datos-prueba) CON_DATOS_PRUEBA=true ;;
        -h | --help) uso 0 ;;
        *) uso 1 ;;
    esac
    shift
done

# ---------- Requisitos ----------
command -v docker >/dev/null 2>&1 || error "No se encontró el comando docker. Instala Docker (ver documentacion/guia_docker.md)."
docker info >/dev/null 2>&1 || error "Docker no está encendido (en Linux: sudo systemctl start docker)."

# ---------- Migraciones a aplicar ----------
# sort -V ordena por versión: V2 va antes que V10. La de datos de prueba (V003)
# solo entra con --con-datos-prueba.
MIGRACIONES=()
while IFS= read -r migracion; do
    if [[ "$(basename "$migracion")" == *datos_prueba* && "$CON_DATOS_PRUEBA" != true ]]; then
        continue
    fi
    MIGRACIONES+=("$migracion")
done < <(find "$CARPETA_MIGRACIONES" -maxdepth 1 -name 'V*.sql' | sort -V)
[[ ${#MIGRACIONES[@]} -gt 0 ]] || error "No hay migraciones V*.sql en $CARPETA_MIGRACIONES."

# ---------- Datos de conexión (se preguntan, nunca se leen de archivos) ----------
echo "Datos de conexión de la base de producción (están en el panel de Aiven)."
read -r -p "Host: " DB_HOST
read -r -p "Puerto [3306]: " DB_PORT
DB_PORT="${DB_PORT:-3306}"
read -r -p "Usuario [avnadmin]: " DB_USER
DB_USER="${DB_USER:-avnadmin}"
read -r -p "Base de datos [parqueadero]: " DB_NAME
DB_NAME="${DB_NAME:-parqueadero}"
# -s: lo que se escribe no aparece en pantalla.
read -r -s -p "Contraseña (no se muestra): " MYSQL_PWD
echo

[[ "$DB_HOST" =~ ^[A-Za-z0-9._-]+$ ]] || error "El host no es válido: '$DB_HOST'."
[[ "$DB_PORT" =~ ^[0-9]+$ && "$DB_PORT" -ge 1 && "$DB_PORT" -le 65535 ]] \
    || error "El puerto debe ser un número entre 1 y 65535 (se recibió '$DB_PORT')."
[[ -n "$DB_USER" && "$DB_USER" != *[[:space:]]* ]] || error "El usuario no es válido."
# El nombre de la base va dentro del SQL: solo letras, números y guion bajo.
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || error "El nombre de la base solo puede tener letras, números y _."
[[ -n "$MYSQL_PWD" ]] || error "Falta la contraseña."

# La contraseña viaja en la variable MYSQL_PWD (la lee el cliente mysql) y no
# en la línea de comandos, donde otros programas podrían verla. "-e MYSQL_PWD"
# sin valor le pasa al contenedor la variable de esta terminal.
export MYSQL_PWD

OPCIONES_MYSQL=(-h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --protocol=TCP
    --ssl-mode=REQUIRED --default-character-set=utf8mb4
    "--init-command=SET time_zone = '$ZONA_HORARIA'")

# consultar [opciones] -e "SQL": ejecuta una consulta corta (sin entrada estándar).
consultar() {
    docker run --rm --network host -e MYSQL_PWD "$IMAGEN_MYSQL" \
        mysql "${OPCIONES_MYSQL[@]}" "$@"
}

# aplicar_archivo ARCHIVO: ejecuta un .sql completo dentro de la base.
aplicar_archivo() {
    docker run --rm -i --network host -e MYSQL_PWD "$IMAGEN_MYSQL" \
        mysql "${OPCIONES_MYSQL[@]}" "$DB_NAME" <"$1"
}

# ---------- 1. Probar la conexión y que la base esté vacía ----------
echo "Probando la conexión con $DB_HOST:$DB_PORT (la primera vez se descarga la imagen $IMAGEN_MYSQL)..."
if ! INFORMACION="$(consultar -N -B -e "
    SELECT VERSION(), @@session.time_zone,
           (SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$DB_NAME'),
           (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DB_NAME');
    SHOW SESSION STATUS LIKE 'Ssl_cipher';")"; then
    error "No se pudo conectar. Revisa el host, el puerto, el usuario y la contraseña (el mensaje de MySQL está arriba)."
fi
read -r VERSION_MYSQL ZONA_SESION EXISTE_BASE TABLAS_EXISTENTES < <(sed -n 1p <<<"$INFORMACION")
CIFRADO="$(sed -n 2p <<<"$INFORMACION" | cut -f 2)"

[[ "$EXISTE_BASE" == "1" ]] || error "La base '$DB_NAME' no existe. Créala en el panel de Aiven (o usa defaultdb)."
if [[ "$TABLAS_EXISTENTES" != "0" ]]; then
    error "La base '$DB_NAME' ya tiene $TABLAS_EXISTENTES tablas o vistas. Este script solo carga una base VACÍA.
       Para aplicar una migración nueva a una base que ya está en uso, ver documentacion/despliegue.md."
fi

# ---------- 2. Confirmar ----------
echo
echo "Conectado: MySQL $VERSION_MYSQL, cifrado ${CIFRADO:-(sin datos)}, zona de la sesión $ZONA_SESION."
echo "Se va a cargar la base '$DB_NAME' en $DB_HOST con estas migraciones:"
for migracion in "${MIGRACIONES[@]}"; do
    echo "  - $(basename "$migracion")"
done
if [[ "$CON_DATOS_PRUEBA" != true ]]; then
    echo "  (sin los datos de prueba; para cargarlos usa --con-datos-prueba)"
fi
read -r -p "¿Continuar? Escribe 'si' para confirmar: " CONFIRMACION
[[ "$CONFIRMACION" == "si" ]] || error "No se confirmó: no se hizo nada."

# ---------- 3. Aplicar las migraciones en orden ----------
for migracion in "${MIGRACIONES[@]}"; do
    echo "Aplicando $(basename "$migracion")..."
    aplicar_archivo "$migracion" || error "Falló $(basename "$migracion") (el mensaje de MySQL está arriba).
       La base quedó a medias: bórrala y créala de nuevo en el panel de Aiven, corrige el problema
       y vuelve a ejecutar este script. Ver 'Problemas frecuentes' en documentacion/despliegue.md."
done

# ---------- 4. Resumen ----------
echo
echo "== Tablas y vistas =="
consultar -t "$DB_NAME" -e "SHOW FULL TABLES"
echo "== Triggers =="
consultar -t "$DB_NAME" -e "
    SELECT TRIGGER_NAME AS \`trigger\`, EVENT_OBJECT_TABLE AS tabla,
           CONCAT(ACTION_TIMING, ' ', EVENT_MANIPULATION) AS cuando
    FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()
    ORDER BY tabla, \`trigger\`"
echo "== Filas de los catálogos =="
consultar -t "$DB_NAME" -e "
    SELECT 'tipo_vehiculo' AS tabla, COUNT(*) AS filas FROM tipo_vehiculo
    UNION ALL SELECT 'tarifa', COUNT(*) FROM tarifa
    UNION ALL SELECT 'metodo_pago', COUNT(*) FROM metodo_pago
    UNION ALL SELECT 'rol', COUNT(*) FROM rol
    UNION ALL SELECT 'zona', COUNT(*) FROM zona
    UNION ALL SELECT 'espacio', COUNT(*) FROM espacio
    UNION ALL SELECT 'marca', COUNT(*) FROM marca
    UNION ALL SELECT 'modelo', COUNT(*) FROM modelo"
if [[ "$CON_DATOS_PRUEBA" == true ]]; then
    echo "== Datos de prueba =="
    consultar -t "$DB_NAME" -e "
        SELECT 'cliente' AS tabla, COUNT(*) AS filas FROM cliente
        UNION ALL SELECT 'vehiculo', COUNT(*) FROM vehiculo
        UNION ALL SELECT 'registro_parqueo', COUNT(*) FROM registro_parqueo
        UNION ALL SELECT 'pago', COUNT(*) FROM pago"
fi

echo "Listo: la base '$DB_NAME' quedó cargada."
echo "El primer usuario DBA de la aplicación lo crea el backend al arrancar en Render"
echo "(variables DBA_USUARIO y DBA_CLAVE_INICIAL). Siguiente paso: B4 del plan."
