# MS4 — Empleados
Puerto: **8085** | Tecnología: Spring Boot | Persistencia: JPA + H2

## Propósito
Recibe y persiste registros de turnos de empleados. Usa JPA + H2 en
modo archivo, por lo que los datos sobreviven reinicios del contenedor.

## Endpoints
| Método | Ruta                      | Descripción                       |
|--------|---------------------------|-----------------------------------|
| POST   | /api/empleados/registro   | Registrar turno de empleado       |
| GET    | /api/empleados/registros  | Listar todos los registros        |
| GET    | /api/empleados/health     | Estado del servicio               |

## Campos obligatorios (POST /api/empleados/registro)
`empleado_id`, `nombre`, `sucursal`, `turno`, `horas_trabajadas`

Valores inválidos devuelven **400 BAD REQUEST**:
- Cualquier campo obligatorio ausente o en blanco
- `horas_trabajadas < 0` o `horas_trabajadas > 24`

## Ejemplo POST /api/empleados/registro
Request:
```json
{
  "empleado_id": "EMP-001",
  "nombre": "Ana Torres",
  "sucursal": "Las Condes",
  "turno": "manana",
  "horas_trabajadas": 8.0,
  "fecha": "2026-06-28"
}
```
Response 200: entidad guardada con `id` generado por la BD.

## Base de datos H2
- Archivo: `/data/bd-empleados`
- Volumen Docker: `empleados-data`
- Consola H2: http://localhost:8085/h2-console
- JDBC URL: `jdbc:h2:file:/data/bd-empleados`
- Usuario: `sa` / Contraseña: *(vacío)*

## Ejecutar
```bash
# Docker (recomendado)
docker compose up -d ms4-empleados

# Local
cd ms4-empleados && mvn spring-boot:run
```
