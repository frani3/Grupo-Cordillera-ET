# Etapa de construcción (Build stage)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copiar los archivos de configuración y descargar dependencias
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copiar el código fuente y compilar
COPY src ./src
RUN mvn clean package -DskipTests -q

# Etapa de ejecución (Run stage)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copiar el .jar compilado desde la etapa anterior
COPY --from=build /app/target/*.jar app.jar

ENV SERVER_PORT=8081

EXPOSE ${SERVER_PORT}

ENTRYPOINT ["java", "-jar", "app.jar"]
