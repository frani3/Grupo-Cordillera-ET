# Arquitectura Grupo Cordillera — Guía de levantamiento y prueba

## Mapa de la arquitectura

```
SCRIPTS/SIMULADORES               MICROSERVICIOS DE NEGOCIO
┌─────────────────┐               ┌─────────────────────────────────────┐
│ simulador-pos   │── POST 8081 ──▶│ MS1-POS        :8081  (Singleton)  │
│ simulador-online│── POST 8083 ──▶│ MS2-ONLINE     :8083  (Singleton)  │
│ simulador-inv   │── POST 8084 ──▶│ MS3-INVENTARIO :8084  (JPA + H2)   │
│ simulador-emp   │── POST 8085 ──▶│ MS4-EMPLEADOS  :8085  (JPA + H2)   │
│ simulador-rep   │── POST 8086 ──▶│ MS5-REPORTES   :8086  (JPA + H2)   │
└─────────────────┘               └──────────┬──────────────────────────┘
                                             │ HTTP/JSON (pull)
             ORQUESTADORES ESPECIALIZADOS    │
             ┌───────────────────────────────┼──────────────────────┐
             │ ORQ-DATOS :8082 ←── MS1+MS2  │  BD DATOS (H2+JPA)  │
             │ ORQ-IND   :8092 ←── MS3+MS4     BD IND   (H2+JPA)  │
             │ ORQ-REP   :8093 ←── MS5          BD REP   (H2+JPA)  │
             └────────────────────┬──────────────────────────────────┘
                                  │
             BFF-SERVICE :8080 ───┘─── MS AUTH :8090 ←── BD USUARIO (H2+JPA)
                  │ (Proxy GoF)
             API GATEWAY (nginx) :80
                  │
             Web-Container :3000  (Node.js + Express + SPA)
```

---

## Levantar toda la arquitectura

```bash
docker compose up -d --build
```

Esto construye y levanta en orden:
1. MS1-MS5 (microservicios de negocio)
2. MS AUTH + BD USUARIO
3. ORQ-DATOS, ORQ-IND, ORQ-REP + sus BDs
4. BFF-SERVICE
5. API Gateway
6. Web-Container

---

## Puertos expuestos en el host

| Servicio         | Puerto host | Puerto interno |
|------------------|-------------|----------------|
| API Gateway      | **80**      | 80             |
| Web-Container    | **3000**    | 3000           |
| BFF-Service      | 8080        | 8080           |
| MS1-POS          | 8081        | 8081           |
| ORQ-DATOS        | 8082        | 8080           |
| MS2-ONLINE       | 8083        | 8083           |
| MS3-INVENTARIO   | 8084        | 8084           |
| MS4-EMPLEADOS    | 8085        | 8085           |
| MS5-REPORTES     | 8086        | 8086           |
| MS AUTH          | 8090        | 8090           |
| ORQ-IND          | 8092        | 8092           |
| ORQ-REP          | 8093        | 8093           |

---

## Flujo de autenticación y uso completo

### 1. Obtener token (via API Gateway)

```bash
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Respuesta:
```json
{ "token": "550e8400-e29b-41d4-a716-446655440000", "username": "admin", "timestamp": "..." }
```

Usuarios pre-cargados en BD USUARIO:
- `admin` / `admin123` (rol ADMIN)
- `usuario` / `user123` (rol USER)

### 2. Consultar el dashboard (todos los dominios en paralelo)

```bash
export TOKEN="550e8400-e29b-41d4-a716-446655440000"

curl http://localhost/api/proxy/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Consultar por dominio

```bash
# Datos de ventas POS + Online (ORQ-DATOS)
curl http://localhost/api/proxy/ventas -H "Authorization: Bearer $TOKEN"

# Indicadores operacionales (ORQ-IND: inventario + empleados)
curl http://localhost/api/proxy/indicadores -H "Authorization: Bearer $TOKEN"

# Reportes financieros (ORQ-REP: eventos MS5)
curl http://localhost/api/proxy/reportes -H "Authorization: Bearer $TOKEN"

# Datos crudos de MS3/MS4/MS5 (sin agregación)
curl http://localhost/api/proxy/datos/inventario -H "Authorization: Bearer $TOKEN"
curl http://localhost/api/proxy/datos/empleados  -H "Authorization: Bearer $TOKEN"
curl http://localhost/api/proxy/datos/eventos    -H "Authorization: Bearer $TOKEN"
```

### 4. Health checks de todos los servicios

```bash
curl http://localhost/health                          # API Gateway
curl http://localhost/api/proxy/health                # BFF
curl http://localhost/auth/health                     # MS AUTH
curl http://localhost:8082/api/datos/health           # ORQ-DATOS
curl http://localhost:8092/api/ind/health             # ORQ-IND
curl http://localhost:8093/api/rep/health             # ORQ-REP
curl http://localhost:8081/api/pos/data               # MS1
curl http://localhost:8083/api/online/health          # MS2
curl http://localhost:8084/api/inventario/health      # MS3
curl http://localhost:8085/api/empleados/health       # MS4
curl http://localhost:8086/api/reportes/health        # MS5
```

---

## Ejecutar los simuladores

```powershell
# Todos a la vez (recomendado)
.\run-simuladores.ps1

# O en terminales separadas
.\simulador-pos.ps1
.\simulador-online.ps1
.\simulador-inventario.ps1
.\simulador-empleados.ps1
.\simulador-reportes.ps1
```

---

## Ejecutar tests

### Tests JavaScript (Jest)

```bash
docker build --target test --no-cache -t frontend-test frontend-app/
```

Los tests se ejecutan durante el build del stage `test`. Si alguno falla, el build se detiene antes de generar la imagen de producción. Cobertura actual: 86.71% statements, 69.86% branches, 81.96% functions, 88.99% lines.

### Tests Java (JUnit + Mockito)

Los tests se ejecutan con el build de Maven de cada servicio. Servicios con tests unitarios: MS-Auth, MS3-Inventario, MS4-Empleados, MS5-Reportes.

```bash
# Dentro de cada directorio de servicio:
mvn test
```

---

## Histórico de BD (snapshots persistentes)

Cada orquestador persiste snapshots de sus consolidaciones en su BD H2:

```bash
# Últimos 10 snapshots de ORQ-DATOS → BD DATOS
curl http://localhost:8082/api/datos/historico

# Últimos 10 snapshots de ORQ-IND → BD IND
curl http://localhost:8092/api/ind/historico

# Últimos 10 snapshots de ORQ-REP → BD REP
curl http://localhost:8093/api/rep/historico
```

También se puede acceder a la consola H2 (inspección directa de la BD):
- **ORQ-DATOS:** http://localhost:8082/h2-console — `jdbc:h2:file:/data/bd-datos`
- **ORQ-IND:** http://localhost:8092/h2-console — `jdbc:h2:file:/data/bd-ind`
- **ORQ-REP:** http://localhost:8093/h2-console — `jdbc:h2:file:/data/bd-rep`
- **MS AUTH:** http://localhost:8090/h2-console — `jdbc:h2:file:/data/bd-usuario`
- **MS3-INVENTARIO:** http://localhost:8084/h2-console — `jdbc:h2:file:/data/bd-inventario`
- **MS4-EMPLEADOS:** http://localhost:8085/h2-console — `jdbc:h2:file:/data/bd-empleados`
- **MS5-REPORTES:** http://localhost:8086/h2-console — `jdbc:h2:file:/data/bd-reportes`

---

## Decisiones de diseño

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| API Gateway | nginx (alpine) | Cero dependencias extra; routing simple y eficiente |
| BD de orquestadores | H2 en modo archivo + volumen Docker | No agrega contenedores nuevos; datos persisten entre reinicios |
| JPA en MS3/MS4/MS5 | H2 en archivo + JpaRepository | Persistencia real con cero contenedores adicionales; contrasta con Singleton de MS1/MS2 |
| Token de autenticación | UUID generado por MS AUTH + mapa en memoria | Simple y funcional; JWT sería el siguiente paso en producción |
| MS AUTH fallback | Si MS AUTH no responde, BFF acepta cualquier token con formato Bearer válido | Alta disponibilidad del sistema durante fallos parciales |
| ORQ-DATOS strategy | Patrón Strategy con clases separadas (Batch/Stream/Cache) | Cambio de algoritmo en runtime vía parámetro `?strategy=` sin modificar el controlador |
| Dominio por orquestador | Datos=MS1+MS2, IND=MS3+MS4, REP=MS5 | Separación por naturaleza del dato (transaccional/operacional/financiero) |
| Multi-stage Dockerfile | Stage `test` + stage `production` | Tests obligatorios antes del despliegue; imagen final sin devDependencies |

---

## Estructura de carpetas

```
Grupo-Cordillera-ET/
├── api-gateway/              ← nginx como API Gateway
├── ms-auth/                  ← autenticación con BD USUARIO (H2)
├── ms1-pos/                  ← MS1 ventas POS (Singleton en memoria)
├── ms2-online/               ← MS2 ventas online (Singleton en memoria)
├── ms3-inventario/           ← ACTUALIZADO: MS3 con JPA + H2 + tests JUnit
├── ms4-empleados/            ← ACTUALIZADO: MS4 con JPA + H2 + tests JUnit
├── ms5-reportes/             ← ACTUALIZADO: MS5 con JPA + H2 + tests JUnit
├── orq-datos/                ← ORQ-DATOS con Strategy GoF + BD DATOS (H2)
├── orq-ind/                  ← ORQ-IND con BD IND (H2)
├── orq-rep/                  ← ORQ-REP con BD REP (H2)
├── bff-service/              ← ACTUALIZADO: Proxy GoF + clientes MS3/4/5
├── frontend-app/             ← ACTUALIZADO: SPA completa + tests Jest (68 casos)
├── simulador-pos.ps1
├── simulador-online.ps1
├── simulador-inventario.ps1
├── simulador-empleados.ps1
├── simulador-reportes.ps1
├── run-simuladores.ps1
└── docker-compose.yml        ← ACTUALIZADO: volúmenes MS3/4/5, sin orq-service legado
```
