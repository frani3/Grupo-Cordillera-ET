# ORQ-REP — Orquestador de Reportes Financieros
Puerto: **8093** | Tecnología: Spring Boot | Persistencia: JPA + H2

## Propósito
Consulta MS5-Reportes, calcula totales financieros y persiste snapshots
en BD.

## Endpoints
| Método | Ruta               | Descripción                         |
|--------|--------------------|-------------------------------------|
| GET    | /api/rep/reportes  | Calcular y devolver resumen         |
| GET    | /api/rep/historico | Últimos 10 snapshots guardados      |
| GET    | /api/rep/health    | Estado del servicio                 |

## Ejemplo GET /api/rep/reportes
Response 200:
```json
{
  "status": "ok",
  "requestId": "rep-1",
  "totalEventos": 14,
  "totalMonto": 5697044.0,
  "snapshotId": 3,
  "timestamp": "2026-06-28T12:00:00Z"
}
```

## Fuente de datos
- MS5-Reportes: `GET /api/reportes/eventos`

## Base de datos H2
- Archivo: `/data/bd-rep`
- Volumen Docker: `rep-db-data`
- Consola H2: http://localhost:8093/h2-console
- JDBC URL: `jdbc:h2:file:/data/bd-rep`

## Ejecutar
```bash
docker compose up -d orq-rep
```
