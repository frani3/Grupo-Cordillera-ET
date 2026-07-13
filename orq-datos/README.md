# ORQ-DATOS — Orquestador de Datos de Venta
Puerto: **8082** (host) → **8080** (interno del contenedor, `server.port`) | Tecnología: Spring Boot | Persistencia: JPA + H2

> A diferencia de los demás servicios (donde el puerto de host coincide con el interno),
> ORQ-DATOS mapea `8082:8080` en `docker-compose.yml`. El tráfico entre servicios
> (ej. `bff-service` → `ORQ_SERVICE_URL=http://orq-datos:8080`) usa el puerto interno 8080.

## Propósito
Agrega ventas POS (MS1) y Online (MS2) en paralelo, aplica el patrón
**Strategy** para procesar los datos con distintos algoritmos según el
parámetro `?strategy=`, y persiste snapshots de cada consolidación en BD.

## Endpoints
| Método | Ruta                                          | Descripción                            |
|--------|-----------------------------------------------|----------------------------------------|
| GET    | /api/datos/consolidado?strategy=batch\|stream\|cache&id={id} | Consolidar ventas con estrategia |
| GET    | /api/datos/ventas                             | Lista cruda de todas las ventas        |
| GET    | /api/datos/historico                          | Últimos 10 snapshots guardados         |
| GET    | /api/datos/health                             | Estado del servicio                    |

### Endpoints legacy (retrocompatibilidad con el `orq-service` original)
Alias sin el prefijo `/datos`, mantenidos para no romper integraciones antiguas.
Delegan internamente en los endpoints de arriba:

| Método | Ruta                                    | Equivale a              |
|--------|-------------------------------------------|--------------------------|
| GET    | /api/data?id={id}&strategy={strategy}   | /api/datos/consolidado   |
| GET    | /api/ventas                             | /api/datos/ventas        |
| GET    | /api/health                             | /api/datos/health        |

## Estrategias disponibles

| Parámetro | Algoritmo                                              |
|-----------|--------------------------------------------------------|
| `batch`   | Agrupa por canal (POS vs Online), suma totales         |
| `stream`  | Calcula ticket promedio (total / cantidad)             |
| `cache`   | Calcula monto máximo y mínimo de la lista              |

## Ejemplo GET /api/datos/consolidado?strategy=batch&id=req-001
Response 200:
```json
{
  "status": "ok",
  "requestId": "req-001",
  "estrategia": "batch",
  "totalTransacciones": 85,
  "totalMonto": 4250000,
  "resultado": "BATCH[req-001]: 85 transacciones | POS=60 | Online=25 | total=$4250000",
  "transaccionesPOS": 60,
  "transaccionesOnline": 25,
  "timestamp": "2026-06-28T12:00:00Z"
}
```

## Patrón de diseño: Strategy
```
OrqDatosController
  → strategyFactory.getStrategy("batch"|"stream"|"cache")
      ├── BatchStrategy  (@Component("batch"))
      ├── StreamStrategy (@Component("stream"))
      └── CacheStrategy  (@Component("cache"))
```
Cada estrategia es una clase independiente; agregar una nueva no modifica
el controlador (principio OCP).

## Base de datos H2
- Archivo: `/data/bd-datos`
- Volumen Docker: `datos-db-data`
- Consola H2: http://localhost:8082/h2-console
- JDBC URL: `jdbc:h2:file:/data/bd-datos`

## Ejecutar
```bash
docker compose up -d orq-datos
```
