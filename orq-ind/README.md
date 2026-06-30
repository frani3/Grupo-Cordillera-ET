# ORQ-IND — Orquestador de Indicadores Operacionales
Puerto: **8092** | Tecnología: Spring Boot | Persistencia: JPA + H2

## Propósito
Agrega datos de MS3-Inventario y MS4-Empleados en paralelo usando
`CompletableFuture`, calcula indicadores operacionales y persiste
snapshots en BD.

## Endpoints
| Método | Ruta                   | Descripción                         |
|--------|------------------------|-------------------------------------|
| GET    | /api/ind/indicadores   | Calcular y devolver indicadores     |
| GET    | /api/ind/historico     | Últimos 10 snapshots guardados      |
| GET    | /api/ind/health        | Estado del servicio                 |

## Ejemplo GET /api/ind/indicadores
Response 200:
```json
{
  "status": "ok",
  "requestId": "ind-1",
  "itemsInventario": 112,
  "registrosEmpleados": 48,
  "totalHorasTrabajadas": 384.5,
  "snapshotId": 7,
  "timestamp": "2026-06-28T12:00:00Z"
}
```

## Fuentes de datos
- MS3-Inventario: `GET /api/inventario/items`
- MS4-Empleados: `GET /api/empleados/registros`

Ambas llamadas se ejecutan en paralelo.

## Base de datos H2
- Archivo: `/data/bd-ind`
- Volumen Docker: `ind-db-data`
- Consola H2: http://localhost:8092/h2-console
- JDBC URL: `jdbc:h2:file:/data/bd-ind`

## Ejecutar
```bash
docker compose up -d orq-ind
```
