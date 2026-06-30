# MS3 — Inventario
Puerto: **8084** | Tecnología: Spring Boot | Persistencia: JPA + H2

## Propósito
Recibe y persiste registros de inventario de productos. Usa JPA + H2 en
modo archivo, por lo que los datos sobreviven reinicios del contenedor.

## Endpoints
| Método | Ruta                    | Descripción                      |
|--------|-------------------------|----------------------------------|
| POST   | /api/inventario/item    | Registrar ítem de inventario     |
| GET    | /api/inventario/items   | Listar todos los ítems           |
| GET    | /api/inventario/health  | Estado del servicio              |

## Campos obligatorios (POST /api/inventario/item)
`item_id`, `nombre`, `sucursal`, `cantidad`, `precio_unitario`

Valores inválidos devuelven **400 BAD REQUEST**:
- Cualquier campo obligatorio ausente o en blanco
- `cantidad < 0` o `precio_unitario < 0`

## Ejemplo POST /api/inventario/item
Request:
```json
{
  "item_id": "ITEM-001",
  "nombre": "Laptop",
  "categoria": "electronica",
  "cantidad": 10,
  "precio_unitario": 899990,
  "sucursal": "Las Condes",
  "fecha": "2026-06-28"
}
```
Response 200: entidad guardada con `id` generado por la BD.

## Base de datos H2
- Archivo: `/data/bd-inventario`
- Volumen Docker: `inventario-data`
- Consola H2: http://localhost:8084/h2-console
- JDBC URL: `jdbc:h2:file:/data/bd-inventario`
- Usuario: `sa` / Contraseña: *(vacío)*

## Ejecutar
```bash
# Docker (recomendado)
docker compose up -d ms3-inventario

# Local
cd ms3-inventario && mvn spring-boot:run
```
