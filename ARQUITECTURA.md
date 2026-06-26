# Arquitectura Grupo Cordillera — Guía de levantamiento y prueba

## Mapa de la arquitectura

```
SCRIPTS/SIMULADORES                    MICROSERVICIOS DE NEGOCIO
┌─────────────────┐                    ┌──────────────────────────────┐
│ Script 1 (PS1)  │─── POST 8081 ─────▶│ MS1-POS       :8081          │
│ Script 2 (PS1)  │─── POST 8083 ─────▶│ MS2-ONLINE    :8083          │
│ Script 3 (PS1)  │─── POST 8084 ─────▶│ MS3-INVENTARIO:8084          │
│ Script 4 (PS1)  │─── POST 8085 ─────▶│ MS4-EMPLEADOS :8085          │
│ Script 5 (PS1)  │─── POST 8086 ─────▶│ MS5-REPORTES  :8086          │
└─────────────────┘                    └──────────┬───────────────────┘
                                                  │ HTTP/JSON (pull)
                    ORQUESTADORES ESPECIALIZADOS  │
                    ┌─────────────────────────────┼────────────────────┐
                    │ ORQ-DATOS :8082 ←─── MS1+MS2┘  BD DATOS (H2)    │
                    │ ORQ-IND   :8092 ←─── MS3+MS4   BD IND   (H2)    │
                    │ ORQ-REP   :8093 ←─── MS5       BD REP   (H2)    │
                    └────────────────────┬───────────────────────────────┘
                                         │
                    BFF-SERVICE :8080 ───┘─── MS AUTH :8090 ←─ BD USUARIO (H2)
                         │
                    API GATEWAY (nginx) :80
                         │
                    Web-Container :3000
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
|------------------|-------------|---------------|
| API Gateway      | **80**      | 80            |
| Web-Container    | **3000**    | 3000          |
| BFF-Service      | 8080        | 8080          |
| MS1-POS          | 8081        | 8081          |
| ORQ-DATOS        | 8082        | 8080          |
| MS2-ONLINE       | 8083        | 8083          |
| MS3-INVENTARIO   | 8084        | 8084          |
| MS4-EMPLEADOS    | 8085        | 8085          |
| MS5-REPORTES     | 8086        | 8086          |
| ORQ-SERVICE (legado) | 8088    | 8080          |
| MS AUTH          | 8090        | 8090          |
| ORQ-IND          | 8092        | 8092          |
| ORQ-REP          | 8093        | 8093          |

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
```

### 4. Health checks de todos los servicios

```bash
curl http://localhost/health                                  # API Gateway
curl http://localhost/api/proxy/health                        # BFF
curl http://localhost/auth/health                             # MS AUTH
curl http://localhost:8082/api/datos/health                   # ORQ-DATOS
curl http://localhost:8092/api/ind/health                     # ORQ-IND
curl http://localhost:8093/api/rep/health                     # ORQ-REP
curl http://localhost:8081/api/pos/data                       # MS1
curl http://localhost:8083/api/online/health                  # MS2
curl http://localhost:8084/api/inventario/health              # MS3
curl http://localhost:8085/api/empleados/health               # MS4
curl http://localhost:8086/api/reportes/health                # MS5
```

---

## Ejecutar los simuladores (en terminales separadas)

```powershell
# Terminal 1 — POS (Script 1)
.\simulador-pos.ps1

# Terminal 2 — Online (Script 2)
.\simulador-online.ps1

# Terminal 3 — Inventario (Script 3)
.\simulador-inventario.ps1

# Terminal 4 — Empleados (Script 4)
.\simulador-empleados.ps1

# Terminal 5 — Reportes Financieros (Script 5)
.\simulador-reportes.ps1
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

También se puede acceder a la consola H2 (para inspección directa):
- ORQ-DATOS: http://localhost:8082/h2-console (JDBC URL: `jdbc:h2:file:/data/bd-datos`)
- ORQ-IND: http://localhost:8092/h2-console (JDBC URL: `jdbc:h2:file:/data/bd-ind`)
- ORQ-REP: http://localhost:8093/h2-console (JDBC URL: `jdbc:h2:file:/data/bd-rep`)
- MS AUTH: http://localhost:8090/h2-console (JDBC URL: `jdbc:h2:file:/data/bd-usuario`)

---

## Decisiones de diseño

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| API Gateway | nginx (alpine) | Cero dependencias extra; routing simple y eficiente |
| BD de orquestadores | H2 en modo archivo + volumen Docker | No agrega contenedores nuevos; datos persisten entre reinicios |
| Token de autenticación | UUID generado por MS AUTH + mapa en memoria | Simple y funcional; JWT sería el siguiente paso en producción |
| MS AUTH fallback | Si MS AUTH no responde, BFF acepta cualquier token con formato Bearer válido | Alta disponibilidad del sistema durante fallos parciales |
| ORQ-DATOS | Evolución de orq-service | Mantiene retrocompatibilidad (`/api/data`, `/api/ventas`) y agrega persistencia |
| orq-service (legado) | Mantenido en puerto 8088 | No eliminar lo que funciona; disponible para comparación |
| Dominio por orquestador | Datos=MS1+MS2, IND=MS3+MS4, REP=MS5 | Separación por naturaleza del dato (transaccional/operacional/financiero) |

---

## Estructura de carpetas creadas

```
Grupo-Cordillera-ET/
├── api-gateway/          ← NUEVO: nginx como API Gateway
├── ms-auth/              ← NUEVO: autenticación con BD USUARIO (H2)
├── ms3-inventario/       ← NUEVO: MS3 datos de inventario
├── ms4-empleados/        ← NUEVO: MS4 registros de empleados
├── ms5-reportes/         ← NUEVO: MS5 eventos financieros
├── orq-datos/            ← NUEVO: ORQ-DATOS con BD DATOS (H2)
├── orq-ind/              ← NUEVO: ORQ-IND con BD IND (H2)
├── orq-rep/              ← NUEVO: ORQ-REP con BD REP (H2)
├── bff-service/          ← ACTUALIZADO: valida tokens via MS AUTH
├── frontend-app/         ← ACTUALIZADO: apunta al API Gateway
├── ms1-pos/              ← SIN CAMBIOS
├── ms2-online/           ← SIN CAMBIOS
├── orq-service/          ← SIN CAMBIOS (legado, port 8088)
├── simulador-pos.ps1     ← SIN CAMBIOS (Script 1)
├── simulador-online.ps1  ← SIN CAMBIOS (Script 2)
├── simulador-inventario.ps1  ← NUEVO (Script 3)
├── simulador-empleados.ps1   ← NUEVO (Script 4)
├── simulador-reportes.ps1    ← NUEVO (Script 5)
└── docker-compose.yml    ← ACTUALIZADO: todos los servicios
```
