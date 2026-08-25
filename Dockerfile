FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -q
COPY backend/src ./src
RUN mvn clean package -DskipTests

# JDK (not JRE) - the app shells out to javac/java/javap to compile user code
FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY --from=build /app/target/compiler-visualizer-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx256m", "-jar", "app.jar"]
