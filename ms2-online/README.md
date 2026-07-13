# MS2 — Ventas Online
Puerto: **8083** | Tecnología: Spring Boot | Persistencia: Singleton en memoria

## Propósito
Recibe y almacena transacciones de ventas realizadas por canales digitales.
Implementa el patrón **Singleton con Holder Pattern** para persistencia
thread-safe en memoria. A diferencia de MS1, las ventas online no tienen
campo `sucursal`.

## Endpoints
| Método | Ruta                | Descripción                    |
|--------|---------------------|--------------------------------|
| POST   | /api/online/venta   | Registrar nueva venta online   |
| GET    | /api/online/ventas  | Listar todas las ventas online |
| GET    | /api/online/health  | Estado del servicio            |

## Ejemplo POST /api/online/venta
Request:
```json
{
  "trx_id": "ONL-001",
  "fecha_hora": "2026-06-28T12:00:00",
  "monto_total": 89990,
  "metodo_pago": "WEBPAY",
  "productos": [
    { "sku": "SKU-456", "cantidad": 1, "precio_unitario": 89990.0 }
  ],
  "canal": "online",
  "plataforma": "web",
  "email_cliente": "cliente@correo.cl",
  "direccion_envio": "Av. Siempre Viva 742, Santiago"
}
```
Response 200:
```json
{
  "status": "OK",
  "trx_id": "ONL-001"
}
```

## Ejemplo GET /api/online/health
Response 200:
```json
{
  "status": "UP",
  "service": "ms2-online",
  "totalVentas": 42
}
```

## Ejecutar
```bash
# Docker (recomendado)
docker compose up -d ms2-online

# Local
cd ms2-online && mvn spring-boot:run
```

## Patrón de diseño: Singleton (Holder Pattern)
```java
private static class DatabaseHolder {
    static final List<OnlineVenta> INSTANCE = new CopyOnWriteArrayList<>();
}
```
Mismo patrón que MS1 pero con dominio independiente. El repositorio de MS2
no interfiere con el de MS1 — cada uno gestiona su propia lista estática.
