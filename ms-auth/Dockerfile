FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN mkdir -p /data
COPY --from=build /app/target/*.jar app.jar
ENV SERVER_PORT=8090
EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8090/auth/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
