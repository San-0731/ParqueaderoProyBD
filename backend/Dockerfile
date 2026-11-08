# =============================================================================
# Dockerfile del backend del parqueadero (Java 21, sin frameworks).
#
# Construcción en dos etapas:
#   1. "compilacion": una imagen con Maven y el JDK compila el código, corre las
#      pruebas unitarias y genera target/parqueadero-backend.jar.
#   2. La imagen final solo trae el JRE (lo necesario para EJECUTAR Java) y el
#      JAR: es más pequeña y no lleva Maven, el código fuente ni el JDK.
#
# Uso local (desde la raíz del repositorio):
#   docker build -t parqueadero-backend backend/
#   docker run --rm -p 8080:8080 -e DB_HOST=... -e DB_PASSWORD ... parqueadero-backend
#
# En Render no se escribe nada de esto: Render construye la imagen con este
# archivo y le pasa las variables de entorno del panel (documentacion/despliegue.md).
# =============================================================================

# ---------- Etapa 1: compilar ----------
# Imagen oficial de Maven 3.9 con Eclipse Temurin 21 (JDK).
FROM maven:3.9-eclipse-temurin-21 AS compilacion
WORKDIR /compilacion

# Primero SOLO el pom.xml, y se descargan las dependencias. Docker guarda cada
# paso como una capa en caché: mientras el pom.xml no cambie, esta descarga no
# se repite aunque cambie el código.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Después el código. "mvn clean package" corre solo las pruebas unitarias: las
# de integración llevan @Tag("integracion") y se saltan (necesitan MySQL).
COPY src ./src
RUN mvn -B clean package

# ---------- Etapa 2: ejecutar ----------
# Imagen oficial de Eclipse Temurin 21 con solo el JRE, sobre Alpine Linux
# (la variante más liviana).
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Usuario sin privilegios: si alguien llegara a tomar control del proceso, no
# sería root dentro del contenedor.
RUN addgroup -S app && adduser -S -G app app

# Del resultado de la etapa 1 solo se copia el JAR (con todas las dependencias adentro).
COPY --from=compilacion /compilacion/target/parqueadero-backend.jar /app/parqueadero-backend.jar

USER app

# Solo es informativo: el puerto real llega en la variable PORT (Render la
# define sola; en local vale 8080 por defecto).
EXPOSE 8080

# -XX:MaxRAMPercentage=75: la memoria de Java es como máximo el 75 % de la que
# tiene el contenedor (el plan gratuito de Render tiene poca). Sin esto, Java
# podría pedir más de la permitida y el contenedor se reiniciaría.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/parqueadero-backend.jar"]
