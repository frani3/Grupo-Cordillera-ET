# MS5 — Reportes (Eventos Financieros)
Puerto: **8086** | Tecnología: Spring Boot | Persistencia: JPA + H2

## Propósito
Recibe y persiste eventos financieros (cierres de caja, devoluciones,
descuentos, etc.). Usa JPA + H2 en modo archivo.

## Endpoints
| Método | Ruta                   | Descripción                        |
|--------|------------------------|------------------------------------|
| POST   | /api/reportes/evento   | Registrar evento financiero        |
| GET    | /api/reportes/eventos  | Listar todos los eventos           |
| GET    | /api/reportes/health   | Estado del servicio                |

## Campos obligatorios (POST /api/reportes/evento)
`reporte_id`, `tipo`, `sucursal`, `monto`

Valores inválidos devuelven **400 BAD REQUEST**:
- Cualquier campo obligatorio ausente o en blanco
- `monto < 0`

## Tipos de evento válidos
`cierre-diario`, `conciliacion`, `descuento`, `devolucion`, `bonificacion`

## Ejemplo POST /api/reportes/evento
Request:
```json
{
  "reporte_id": "REP-001",
  "tipo": "cierre-diario",
  "descripcion": "Cierre de caja Las Condes",
  "monto": 1500000,
  "sucursal": "Las Condes",
  "fecha": "2026-06-28"
}
```
Response 200: entidad guardada con `id` generado por la BD.

## Base de datos H2
- Archivo: `/data/bd-reportes`
- Volumen Docker: `reportes-data`
- Consola H2: http://localhost:8086/h2-console
- JDBC URL: `jdbc:h2:file:/data/bd-reportes`
- Usuario: `sa` / Contraseña: *(vacío)*

## Ejecutar
```bash
# Docker (recomendado)
docker compose up -d ms5-reportes

# Local
cd ms5-reportes && mvn spring-boot:run
```
