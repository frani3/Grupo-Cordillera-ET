# BFF Service — Backend for Frontend
Puerto: **8080** | Tecnología: Spring Boot | Persistencia: ninguna

## Propósito
Punto de entrada único para el frontend. Implementa el patrón **Proxy**
para validar tokens Bearer, auditar operaciones y delegar a los
orquestadores. Usa `CompletableFuture` para llamadas paralelas en
`/dashboard`.

## Endpoints
Todos requieren `Authorization: Bearer {token}` excepto `/login` y `/health`.

| Método | Ruta                       | Descripción                               |
|--------|----------------------------|-------------------------------------------|
| POST   | /api/proxy/login           | Login delegado a MS Auth (sin token previo)|
| GET    | /api/proxy/data            | Datos consolidados vía ORQ-DATOS          |
| GET    | /api/proxy/ventas          | Ventas POS + Online combinadas            |
| GET    | /api/proxy/indicadores     | Indicadores operacionales (ORQ-IND)       |
| GET    | /api/proxy/reportes        | Resumen financiero (ORQ-REP)              |
| GET    | /api/proxy/dashboard       | Los 3 dominios en paralelo                |
| GET    | /api/proxy/datos/inventario| Datos crudos de MS3                       |
| GET    | /api/proxy/datos/empleados | Datos crudos de MS4                       |
| GET    | /api/proxy/datos/eventos   | Datos crudos de MS5                       |
| GET    | /api/proxy/health          | Estado del BFF (público)                  |

## Patrón de diseño: Proxy
```
BffController (Client)
  → ServiceProxy (Proxy) implements IOrqService
      ├── validateToken()      ← Protección: lanza SecurityException si inválido
      ├── auditLog("REQUEST")  ← Auditoría antes de delegar
      ├── realSubject.fetch()  ← Delegación al RealSubject
      └── auditLog("RESPONSE") ← Auditoría después de recibir
```

## Ejemplo GET /api/proxy/dashboard
```bash
curl http://localhost:8080/api/proxy/dashboard \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
```
Response 200:
```json
{
  "ventas":      [...],
  "indicadores": { "itemsInventario": 112, "totalHorasTrabajadas": 740 },
  "reportes":    { "totalEventos": 14, "totalMonto": 5697044 },
  "timestamp":   "2026-06-28T12:00:00Z"
}
```

## Ejecutar
```bash
# Docker (recomendado)
docker compose up -d bff-service

# Local
cd bff-service && mvn spring-boot:run
```
