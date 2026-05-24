# Distribución de Tareas — Grupo Cordillera E2

**Proyecto:** Plataforma de Monitoreo de Ventas — Evaluación Parcial 2  
**Integrantes:** Francisca Barrera · Ignacio Sorko · Patricio Zapata

---

## Integrante 1 — Microservicios de Datos (MS1 + MS2)
**Patrón implementado:** Singleton (Holder Pattern)

### MS1 — Ventas POS (`ms1-pos/`)
- [ ] Crear estructura del proyecto Spring Boot 3.3 (Java 21)
- [ ] Definir modelo `PosTransaction` y `PosTransactionItem` con anotaciones JPA
- [ ] Implementar `PosTransactionDto` y `PosProductDto` para recepción de datos
- [ ] Implementar `PosTransactionRepository` con patrón Singleton Holder (`CopyOnWriteArrayList`)
- [ ] Implementar `PosProcessingService`: validar campos requeridos, parsear fecha, limpiar datos y persistir
- [ ] Implementar `PosController`: `POST /api/pos/simulate-mq` y `GET /api/pos/data`
- [ ] Configurar `RabbitMqConfig` para declarar la cola `q.pos.deviamserver`
- [ ] Implementar `OrchestratorClient` con Circuit Breaker (Resilience4j) para notificar al orq
- [ ] Configurar `application.properties`: puerto 8081, MySQL, RabbitMQ, Resilience4j
- [ ] Crear `Dockerfile` multistage (eclipse-temurin:21)

### MS2 — Ventas Online (`ms2-online/`)
- [ ] Crear estructura del proyecto Spring Boot 3.2 (Java 17)
- [ ] Definir modelo `OnlineVenta` y `OnlineItem`
- [ ] Implementar `OnlineVentaDto` y `OnlineProductoDto`
- [ ] Implementar `OnlineVentaRepository` con patrón Singleton Holder (misma estrategia que MS1)
- [ ] Implementar `OnlineVentaService`: validar, parsear fecha, mapear items y persistir
- [ ] Implementar `OnlineController`: `POST /api/online/venta`, `GET /api/online/ventas`, `GET /api/online/health`
- [ ] Configurar `application.properties`: puerto 8083
- [ ] Crear `Dockerfile` multistage (maven:3.9 + temurin:17-jre)

### Simuladores y pruebas
- [ ] Crear `simulador-pos.ps1`: envío aleatorio de ventas POS cada 4 segundos
- [ ] Crear `simulador-online.ps1`: envío aleatorio de ventas online cada 4 segundos
- [ ] Verificar que `GET /api/pos/data` devuelve datos limpios y almacenados
- [ ] Verificar que `GET /api/online/ventas` devuelve datos limpios y almacenados

---

## Integrante 2 — Servicio Orquestador (`orq-service/`)
**Patrón implementado:** Strategy

### Estructura base
- [ ] Crear estructura del proyecto Spring Boot 3.2 (Java 17)
- [ ] Definir interfaz `ProcessingStrategy` con métodos `process()` y `getName()`
- [ ] Implementar `ProcessingContext`: inyectar estrategias por nombre y ejecutar con `setStrategy()` / `executeStrategy()`

### Estrategias de procesamiento
- [ ] Implementar `BatchStrategy`: sumar montos y listar IDs de todas las transacciones consolidadas
- [ ] Implementar `StreamStrategy`: mostrar última transacción por canal (POS y online por separado)
- [ ] Implementar `CacheStrategy`: listar cada transacción con su método de pago

### Integración con MS1 y MS2
- [ ] Implementar `fetchFromMs()`: llamada HTTP con `ParameterizedTypeReference` e inyección del campo `canal`
- [ ] Implementar llamadas paralelas a MS1 y MS2 con `CompletableFuture` en `GET /api/data`
- [ ] Implementar `GET /api/ventas`: lista cruda consolidada de ambos MS sin aplicar estrategia
- [ ] Implementar `GET /api/health`
- [ ] Implementar `POST /api/v1/pos`: recepción de notificaciones push desde MS1

### Configuración y despliegue
- [ ] Configurar `application.properties`: puerto 8080, `DATA_MS_URL` (MS1), `DATA_MS2_URL` (MS2)
- [ ] Crear `Dockerfile` multistage (maven:3.9 + temurin:17-jre)
- [ ] Verificar que `GET /api/data?strategy=batch` consolida datos de ambos MS
- [ ] Verificar que `GET /api/data?strategy=stream` muestra última transacción de cada canal
- [ ] Verificar que `GET /api/data?strategy=cache` lista todas las transacciones con método de pago

---

## Integrante 3 — BFF y Frontend (`bff-service/` + `frontend-app/`)
**Patrones implementados:** Proxy (BFF) + Factory Method (Frontend)

### BFF Service — Patrón Proxy
- [ ] Crear estructura del proyecto Spring Boot 3.2 (Java 17)
- [ ] Definir interfaz `IOrqService` con `fetchData()` y `fetchVentas()`
- [ ] Implementar `OrqServiceClient` (RealSubject): llamadas HTTP al orq con `RestTemplate` y `ParameterizedTypeReference`
- [ ] Implementar `ServiceProxy` (Proxy): validación Bearer token, audit log con timestamp, manejo de errores sin exponer stack traces
- [ ] Implementar `BffController`:
  - `GET /api/proxy/data?id=` con validación Bearer → 401 si ausente o inválido
  - `GET /api/proxy/ventas` con validación Bearer → lista consolidada MS1 + MS2
  - `GET /api/proxy/health`
- [ ] Configurar `AppConfig` con bean `RestTemplate`
- [ ] Configurar `application.properties`: puerto 8080, `ORQ_SERVICE_URL`
- [ ] Crear `Dockerfile` multistage (maven:3.9 + temurin:17-jre)
- [ ] Verificar que sin token devuelve 401
- [ ] Verificar que con `Bearer token-cordillera` pasa y devuelve datos del orq

### Frontend App — Patrón Factory Method
- [ ] Crear servidor Express (Node.js 18)
- [ ] Implementar `ApiService` (Product base): `get()` con AbortController para timeout
- [ ] Implementar `DataService` y `AuthService` (Concrete Products)
- [ ] Implementar `ApiServiceFactory` (Creator): `ENVIRONMENTS` con URLs por entorno, `REGISTRY` de servicios, `create()` y `register()`
- [ ] Implementar `DataFacade`: usar `ApiServiceFactory` sin acoplarse a `DataService` directamente
- [ ] Implementar `index.js`: `GET /api/dashboard`, `GET /api/user/:id`, `GET /health`
- [ ] Configurar reenvío del header `Authorization` del request entrante al BFF
- [ ] Crear `Dockerfile` (node:18-alpine)
- [ ] Verificar que `GET /api/dashboard` recorre toda la cadena hasta los MS

### Infraestructura compartida
- [ ] Crear `docker-compose.yml` con red interna `cordillera-net`
- [ ] Configurar servicios: mysql, rabbitmq, ms1-pos, ms2-online, orq-service, bff-service, frontend-app
- [ ] Configurar variables de entorno entre servicios (`DATA_MS_URL`, `DATA_MS2_URL`, `ORQ_SERVICE_URL`, `BFF_URL`)
- [ ] Verificar que `docker compose up -d --build` levanta todo el sistema correctamente
