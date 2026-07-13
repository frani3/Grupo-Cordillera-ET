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
  "trx_id": "TRX-POS-0001-1234",
  "sucursal": "Las Condes",
  "caja_id": "CAJA-01",
  "fecha_hora": "2026-06-28T12:00:00",
  "monto_total": 29990,
  "metodo_pago": "DEBITO",
  "vendedor_id": "VEND-07",
  "productos": [
    { "sku": "SKU-123", "cantidad": 2, "precio_unitario": 14995.0 }
  ]
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
