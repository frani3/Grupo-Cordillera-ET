# Grupo Cordillera E2 — Plataforma de Ventas en Tiempo Real

**Instituto Profesional Duoc UC**
Escuela de Informatica y Telecomunicaciones
DSY1106 · Desarrollo Fullstack III — Evaluacion Parcial 2

**Integrantes:** Francisca Barrera · Ignacio Sorko · Patricio Zapata
**Docente:** Alejandro Sepulveda

---

## Descripcion del Proyecto

Este repositorio implementa una plataforma de microservicios para el **monitoreo de ventas en tiempo real** del Grupo Cordillera, una empresa retail con presencia en tiendas fisicas y canal online.

El sistema recibe transacciones de dos canales de venta simultaneos, las consolida y las expone a traves de capas de seguridad y procesamiento, demostrando cuatro patrones de diseño GoF aplicados en una arquitectura real.

---

## El Problema que Resuelve

Grupo Cordillera opera con dos sistemas de venta separados:
- **Tiendas fisicas (POS):** generan transacciones con datos de sucursal, caja y vendedor
- **Canal online:** genera transacciones con datos de plataforma, email y direccion de envio

Antes de esta plataforma, la informacion de ambos canales era aislada y requeria consolidacion manual. Este sistema centraliza ambos flujos, los procesa en tiempo real y los expone de forma segura a los consumidores finales.

---

## Arquitectura del Sistema

```
[Simulador POS]          [Simulador Online]
      |                        |
      v                        v
 MS1-pos :8081          MS2-online :8083
 (Singleton)            (Singleton)
      |                        |
      +----------+-------------+
                 |
          orq-service :8082
          (Strategy: batch / stream / cache)
                 |
          bff-service :8080
          (Proxy: Bearer token + auditoria)
                 |
          frontend-app :3000
          (Factory: cliente HTTP por entorno)
```

### Flujo de datos

1. Los simuladores envian ventas aleatorias cada 4 segundos via POST
2. MS1 y MS2 validan, limpian y almacenan cada transaccion en memoria
3. El orquestador consulta ambos MS **en paralelo** (CompletableFuture), consolida y aplica la estrategia de procesamiento seleccionada
4. El BFF intercepta cada request, valida el token Bearer y audita la operacion antes de delegarla al orquestador
5. El frontend crea el cliente HTTP segun el entorno usando la factory y consume el BFF

---

## Patrones de Diseno Implementados

| Capa | Patron GoF | Categoria | Justificacion |
|---|---|---|---|
| MS1-pos + MS2-online | **Singleton** (Holder Pattern) | Creacional | Una unica lista thread-safe compartida entre todos los threads del microservicio. Usa `CopyOnWriteArrayList` con inicializacion estatica garantizada por la JVM |
| orq-service | **Strategy** | Comportamiento | Tres algoritmos de procesamiento intercambiables en runtime sin modificar el codigo: batch (resumen total), stream (ultima transaccion por canal), cache (listado con metodo de pago) |
| bff-service | **Proxy** | Estructural | Centraliza validacion Bearer, audit log con timestamp y manejo de errores sin exponer stack traces. El Controller nunca sabe si hay un proxy intermedio (principio LSP) |
| frontend-app | **Factory Method** | Creacional | `ApiServiceFactory.create("data", "production")` instancia el cliente HTTP con la URL y timeout correctos segun el entorno, sin que los componentes conozcan las URLs concretas |

---

## Stack Tecnologico

| Tecnologia | Uso |
|---|---|
| Spring Boot 3.2 / 3.3 (Java 17/21) | MS1, MS2, orq-service, bff-service |
| Node.js 18 + Express | frontend-app |
| MySQL 8.0 | Base de datos de MS1 |
| RabbitMQ 3 | Cola de mensajes para MS1 (con Circuit Breaker Resilience4j) |
| Docker + Docker Compose | Contenedorizacion y orquestacion de todos los servicios |
| Lombok | Reduccion de boilerplate en modelos Java |
| Jest | Tests unitarios del frontend |
| JaCoCo | Cobertura de tests Java (umbral 70%) |

---

## Estructura del Repositorio

```
proyecto-evaluacion-2/
├── ms1-pos/              # Microservicio ventas POS (Singleton, puerto 8081)
├── ms2-online/           # Microservicio ventas online (Singleton, puerto 8083)
├── orq-service/          # Orquestador con patron Strategy (puerto 8082)
├── bff-service/          # Backend for Frontend con patron Proxy (puerto 8080)
├── frontend-app/         # Cliente Node.js con patron Factory (puerto 3000)
├── docker-compose.yml    # Orquestacion completa del sistema
├── simulador-pos.ps1     # Simulador de ventas POS (PowerShell)
├── simulador-online.ps1  # Simulador de ventas online (PowerShell)
├── DEMO.md               # Guia paso a paso para la presentacion
├── TAREAS.md             # Distribucion de trabajo por integrante
├── ANALISIS.md           # Justificacion tecnica de cada patron GoF
└── BRANCHING.md          # Estrategia de ramas y estado del proyecto
```

---

## Endpoints Principales

### MS1 — Ventas POS (`:8081`)
| Metodo | Endpoint | Descripcion |
|---|---|---|
| POST | `/api/pos/simulate-mq` | Recibe una venta POS, la valida y almacena |
| GET | `/api/pos/data` | Devuelve todas las ventas POS almacenadas |

### MS2 — Ventas Online (`:8083`)
| Metodo | Endpoint | Descripcion |
|---|---|---|
| POST | `/api/online/venta` | Recibe una venta online, la valida y almacena |
| GET | `/api/online/ventas` | Devuelve todas las ventas online almacenadas |
| GET | `/api/online/health` | Estado del servicio y total de ventas |

### orq-service (`:8082`)
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/data?id=X&strategy=batch` | Suma total y lista IDs de ambos canales |
| GET | `/api/data?id=X&strategy=stream` | Ultima transaccion de cada canal |
| GET | `/api/data?id=X&strategy=cache` | Todas las transacciones con metodo de pago |
| GET | `/api/ventas` | Lista cruda consolidada de MS1 + MS2 |
| GET | `/api/health` | Estado del servicio |

### bff-service (`:8080`) — requiere `Authorization: Bearer token-cordillera`
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/proxy/ventas` | Ventas consolidadas de ambos canales (JSON) |
| GET | `/api/proxy/data?id=X` | Datos procesados por el orquestador |
| GET | `/api/proxy/health` | Estado del servicio |

---

## Levantar el Sistema

### Requisitos
- Docker Desktop instalado y corriendo
- PowerShell (para los simuladores)

### Iniciar todos los servicios

```powershell
cd proyecto-evaluacion-2
docker compose up -d --build
```

Esperar ~30 segundos a que Spring Boot arranque.

### Verificar que todo esta corriendo

```powershell
docker compose ps
```

### Iniciar los simuladores de datos

```powershell
# Terminal 1 — ventas POS
.\simulador-pos.ps1

# Terminal 2 — ventas online
.\simulador-online.ps1
```

### Detener todo

```powershell
docker compose down
```

---

## Guia de Demostracion

Ver [DEMO.md](DEMO.md) para el paso a paso completo con todos los requests listos para Thunder Client o Postman.

**Orden recomendado:**
1. `GET http://localhost:8083/api/online/ventas` — MS2 datos crudos
2. `GET http://localhost:8081/api/pos/data` — MS1 datos crudos
3. `GET http://localhost:8082/api/data?strategy=batch` — orq consolida y suma
4. `GET http://localhost:8082/api/data?strategy=stream` — orq muestra ultima por canal
5. `GET http://localhost:8082/api/data?strategy=cache` — orq lista con metodo de pago
6. `GET http://localhost:8080/api/proxy/ventas` (sin token) — BFF rechaza con 401
7. `GET http://localhost:8080/api/proxy/ventas` + `Authorization: Bearer token-cordillera` — BFF aprueba y devuelve datos consolidados

---

## Distribucion de Trabajo

Ver [TAREAS.md](TAREAS.md) para el detalle completo de tareas por integrante.

| Integrante | Responsabilidad |
|---|---|
| Francisca Barrera | MS1 (ventas POS) + MS2 (ventas online) + simuladores |
| Ignacio Sorko | orq-service: Strategy, consolidacion paralela MS1+MS2 |
| Patricio Zapata | bff-service (Proxy) + frontend-app (Factory) + docker-compose |

---

## Justificacion de Patrones

Ver [ANALISIS.md](ANALISIS.md) para la justificacion tecnica completa de cada patron, incluyendo:
- El problema concreto que resuelve cada patron
- Codigo real de implementacion
- Comparacion con alternativas descartadas
- Principios SOLID aplicados
- Preguntas frecuentes de defensa oral
