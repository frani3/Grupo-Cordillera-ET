# MS1 — Ventas POS (Point of Sale)
Puerto: **8081** | Tecnología: Spring Boot | Persistencia: Singleton en memoria

## Propósito
Recibe y almacena transacciones de ventas realizadas en tienda física.
Implementa el patrón **Singleton con Holder Pattern** para persistencia
thread-safe en memoria.

## Endpoints
| Método | Ruta                 | Descripción                 |
|--------|----------------------|-----------------------------|
| POST   | /api/pos/simulate-mq | Registrar nueva venta POS   |
| GET    | /api/pos/data        | Listar todas las ventas POS |

## Ejemplo POST /api/pos/simulate-mq
Request:
```json
{
  "transactionId": "TRX-POS-0001-1234",
  "monto_total": 29990,
  "sucursal": "Las Condes",
  "fecha_hora": "2026-06-28T12:00:00"
}
```
Response 200:
```
"Mensaje procesado y almacenado correctamente en la BD simulada (Singleton)."
```

## Ejecutar
```bash
# Docker (recomendado)
docker compose up -d ms1-pos

# Local
cd ms1-pos && mvn spring-boot:run
```

## Patrón de diseño: Singleton (Holder Pattern)
```java
private static class DatabaseHolder {
    static final List<PosTransaction> INSTANCE = new CopyOnWriteArrayList<>();
}
```
Garantiza una única instancia de la lista, inicializada de forma lazy
y thread-safe sin sincronización explícita. Varios simuladores pueden
escribir simultáneamente sin condiciones de carrera.
