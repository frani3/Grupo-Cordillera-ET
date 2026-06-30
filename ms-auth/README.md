# MS Auth — Autenticación
Puerto: **8090** | Tecnología: Spring Boot | Persistencia: JPA + H2

## Propósito
Gestiona login y validación de tokens UUID. Los tokens se almacenan en
memoria (mapa en RAM) y los usuarios en H2. Si MS Auth no responde, el
BFF acepta cualquier token con formato Bearer válido (fallback de alta
disponibilidad).

## Endpoints
| Método | Ruta            | Descripción                              |
|--------|-----------------|------------------------------------------|
| POST   | /auth/login     | Autenticar usuario, retorna token UUID   |
| POST   | /auth/validate  | Validar token (body o header Bearer)     |
| GET    | /auth/health    | Estado del servicio                      |

## Ejemplo POST /auth/login
Request:
```json
{ "username": "admin", "password": "admin123" }
```
Response 200:
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "timestamp": "2026-06-28T12:00:00Z"
}
```
Response 401:
```json
{ "error": "Credenciales inválidas" }
```

## Ejemplo POST /auth/validate
Acepta token en el body o en el header:
```json
{ "token": "550e8400-e29b-41d4-a716-446655440000" }
```
O bien:
```
Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000
```
Response 200:
```json
{ "valid": true, "username": "admin", "role": "ADMIN" }
```

## Usuarios pre-cargados (semilla)
| Usuario  | Contraseña  | Rol   |
|----------|-------------|-------|
| admin    | admin123    | ADMIN |
| usuario  | user123     | USER  |

## Base de datos H2
- Archivo: `/data/bd-usuarios`
- Volumen Docker: `auth-data`
- Consola H2: http://localhost:8090/h2-console
- JDBC URL: `jdbc:h2:file:/data/bd-usuarios`
- Usuario: `sa` / Contraseña: *(vacío)*

## Ejecutar
```bash
# Docker (recomendado)
docker compose up -d ms-auth

# Local
cd ms-auth && mvn spring-boot:run
```
