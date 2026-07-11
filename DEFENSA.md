# DEFENSA ORAL — Grupo Cordillera ET

**DSY1106 · Desarrollo Fullstack III — Evaluación Transversal**  
Francisca Barrera · Ignacio Sorko · Patricio Zapata

---

## Índice
1. [Visión general del sistema](#1-visión-general)
2. [Capa por capa: qué hace cada componente](#2-capas-del-sistema)
3. [Patrones de diseño implementados](#3-patrones-de-diseño)
4. [Persistencia y bases de datos](#4-persistencia)
5. [Seguridad y autenticación](#5-seguridad)
6. [Frontend: arquitectura browser + Node.js](#6-frontend)
7. [Tests unitarios](#7-tests)
8. [Docker y orquestación](#8-docker)
9. [Preguntas difíciles con respuesta](#9-preguntas-difíciles)

---

## 1. Visión General

El sistema simula la plataforma tecnológica de **Grupo Cordillera**, una cadena de retail con tiendas físicas (POS) y canal online. Recibe ventas, registra inventario y empleados, genera reportes financieros, y expone un dashboard web con KPIs en tiempo real.

### Diagrama de flujo de datos

```
Navegador (puerto 3000)
        │ fetch /api/...
        ▼
frontend-app  ──────────────────────────────  Node.js / Express
        │ fetch http://api-gateway:80
        ▼
api-gateway (nginx, puerto 80)
        ├─ /auth/*  ───────────────────────►  ms-auth (8090)  ◄──► BD USUARIO (H2)
        └─ /*       ───────────────────────►  bff-service (8080)
                                                    │
                        ┌───────────────────────────┤
                        │               │           │
                        ▼               ▼           ▼
                   orq-datos        orq-ind      orq-rep
                   (8082)           (8092)       (8093)
                   BD DATOS         BD IND       BD REP
                    │   │           │    │           │
                   MS1 MS2         MS3  MS4         MS5
                  (8081)(8083)   (8084)(8085)     (8086)
```

### Servicios y puertos

| Servicio | Puerto | Patrón principal | Persistencia |
|---|---|---|---|
| frontend-app | 3000 | Factory Method (JS) | sessionStorage / localStorage |
| api-gateway (nginx) | 80 | Gateway / Reverse Proxy | — |
| ms-auth | 8090 | — | H2 en archivo (bd-usuario) |
| bff-service | 8080 | Proxy (protección + auditoría) | — |
| orq-datos | 8082 | Strategy | H2 en archivo (bd-datos) |
| orq-ind | 8092 | — | H2 en archivo (bd-ind) |
| orq-rep | 8093 | — | H2 en archivo (bd-rep) |
| ms1-pos | 8081 | Singleton (Holder) | En memoria (CopyOnWriteArrayList) |
| ms2-online | 8083 | Singleton (Holder) | En memoria (CopyOnWriteArrayList) |
| ms3-inventario | 8084 | JPA Repository | H2 en archivo (inventario-data) |
| ms4-empleados | 8085 | JPA Repository | H2 en archivo (empleados-data) |
| ms5-reportes | 8086 | JPA Repository | H2 en archivo (reportes-data) |

---

## 2. Capas del Sistema

### 2.1 API Gateway — `api-gateway/nginx.conf`

Nginx actúa como **punto de entrada único** del sistema. Sus responsabilidades son:

- **Enrutamiento por path**: `/auth/*` → `ms-auth:8090`, todo lo demás → `bff-service:8080`
- **Re-resolución DNS**: usa `resolver 127.0.0.11 valid=10s` (resolver interno de Docker). Las URLs de upstream se guardan en variables (`set $bff "http://bff-service:8080"`) para forzar re-resolución en cada request, evitando que nginx quede con la IP cacheada de un contenedor recreado.
- **Headers de proxy**: añade `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- **Health propio**: `GET /health` responde `{"status":"UP","service":"api-gateway"}` directamente, sin tocar ningún upstream.
- **Timeouts diferenciados**: `/auth/` tiene `proxy_read_timeout 10s`, el resto `30s`.

**Por qué nginx y no otro componente Java?** Nginx es más eficiente para enrutamiento puro; no necesita JVM ni Spring. Separa la responsabilidad de "quién entra" (gateway) de "qué se entrega" (BFF).

### 2.2 BFF (Backend for Frontend) — `bff-service`

El BFF es el **orquestador de cara al cliente**. Consolida múltiples llamadas internas en una sola respuesta para el navegador.

**Archivos clave:**

- `BffController.java` — expone las rutas `/api/proxy/*`
- `ServiceProxy.java` — Patrón Proxy (detallado en sección 3)
- `IOrqService.java` — interfaz del subject real
- `OrqServiceClient.java` — subject real: HTTP al orq-datos
- `AuthClient.java` — llama a `ms-auth` para validar tokens
- `Ms3Client.java`, `Ms4Client.java`, `Ms5Client.java` — clientes directos a MS3/4/5 para datos crudos
- `OrqIndClient.java`, `OrqRepClient.java` — clientes para orq-ind y orq-rep

**Rutas expuestas por BffController:**

| Método | Ruta | Autenticación | Qué hace |
|---|---|---|---|
| POST | `/api/proxy/login` | No (pública) | Delega a ms-auth, retorna token |
| GET | `/api/proxy/data` | Bearer token | Llama a orq-datos vía ServiceProxy |
| GET | `/api/proxy/ventas` | Bearer token | Ventas consolidadas via ServiceProxy |
| GET | `/api/proxy/indicadores` | Bearer token | Llama a orq-ind directamente |
| GET | `/api/proxy/reportes` | Bearer token | Llama a orq-rep directamente |
| GET | `/api/proxy/dashboard` | Bearer token | Agrega ventas + indicadores + reportes **en paralelo** con `CompletableFuture` |
| GET | `/api/proxy/datos/inventario` | Bearer token | Datos crudos de MS3 |
| GET | `/api/proxy/datos/empleados` | Bearer token | Datos crudos de MS4 |
| GET | `/api/proxy/datos/eventos` | Bearer token | Datos crudos de MS5 |
| GET | `/api/proxy/health` | No (pública) | Estado del BFF |

**Dashboard paralelo:** El endpoint `/dashboard` lanza 3 `CompletableFuture.supplyAsync()` simultáneos (ventas, indicadores, reportes), luego hace `.join()` sobre los tres. Esto reduce la latencia total al máximo de las 3 latencias individuales, no a la suma.

### 2.3 MS AUTH — `ms-auth`

Gestiona la **autenticación** del sistema. Únicamente este microservicio conoce las contraseñas.

**Entidad `Usuario`:** `@Entity` con campos `id`, `username` (único), `passwordHash` (SHA-256, 64 chars), `role`. Sin setters públicos — inmutable después de crear.

**`AuthService`:**
- `login(username, password)`: hashea la contraseña con SHA-256, busca en BD por username, compara hash. Si coincide, genera UUID aleatorio, lo guarda en `ConcurrentHashMap<String, Usuario> tokenStore` y retorna `Optional<String>` con el token.
- `validate(token)`: busca el token en el `tokenStore` y retorna `Optional<Usuario>`.
- Los tokens viven **en memoria** (se pierden al reiniciar). El `tokenStore` usa `ConcurrentHashMap` para thread-safety.

**`AuthController`:**
- `POST /auth/login` → retorna `{"token":"uuid","username":"admin","timestamp":"..."}`
- `POST /auth/validate` → acepta token por header `Authorization: Bearer <token>` O por body `{"token":"<token>"}`. El método `extractToken()` evalúa ambas fuentes y stripea el prefijo "Bearer ".
- Si no hay token por ninguna vía → `400 BAD REQUEST`
- Si el token no está en el store → `401 UNAUTHORIZED`

### 2.4 ORQ-DATOS — `orq-datos`

Agrega ventas de **MS1-POS** y **MS2-Online** usando el **patrón Strategy**.

**`OrqDatosController.GET /api/datos/consolidado?strategy=batch|stream|cache`:**
1. Llama a MS1 y MS2 **en paralelo** con `CompletableFuture.supplyAsync()`
2. Añade campo `"canal"` a cada transacción (`"Tienda Física"` o `"Online"`)
3. Selecciona la estrategia con `StrategyFactory.getStrategy(strategy)`
4. Ejecuta `processingStrategy.procesar(id, transacciones, totalMonto)`
5. Persiste un `DatoConsolidado` en BD DATOS (H2)
6. Retorna respuesta con campos base + campos específicos de la estrategia

**Retrocompatibilidad:** Mantiene rutas `/api/data`, `/api/ventas`, `/api/health` (prefijo `Legacy`) para compatibilidad con el `OrqServiceClient` del BFF que apunta a esas rutas.

### 2.5 ORQ-IND — `orq-ind`

Agrega indicadores operacionales de **MS3-Inventario** y **MS4-Empleados**.

**`OrqIndController.GET /api/ind/indicadores`:**
1. Llama a MS3 (`/api/inventario/items`) y MS4 (`/api/empleados/registros`) en paralelo
2. Calcula `totalHorasTrabajadas` sumando el campo `horasTrabajadas` de cada registro
3. Persiste `IndicadorSnapshot(id, itemsCount, empleadosCount, totalHoras)` en BD IND
4. Retorna conteos + totalHoras + snapshotId

**`GET /api/ind/historico`** → últimos 10 snapshots (`findTop10ByOrderByTimestampDesc()`).

### 2.6 ORQ-REP — `orq-rep`

Agrega eventos financieros de **MS5-Reportes**.

**`OrqRepController.GET /api/rep/reportes`:**
1. Llama a MS5 (`/api/reportes/eventos`)
2. Suma campo `monto` de todos los eventos
3. Persiste `ReporteSnapshot(id, eventosCount, totalMonto)` en BD REP
4. Retorna conteo + totalMonto + snapshotId

### 2.7 MS1-POS — `ms1-pos`

Recibe transacciones de **puntos de venta físicos**. Patrón Singleton con Holder Pattern.

**Entidades:** `PosTransaction` (id, transactionId, canal, sucursal, montoTotal, fecha) y `PosTransactionItem` (productos dentro de la transacción).

**`PosTransactionRepository`** (Singleton Holder):
```java
private static class DatabaseHolder {
    static final List<PosTransaction> INSTANCE = new CopyOnWriteArrayList<>();
}
```
La clase interna `DatabaseHolder` se inicializa de forma lazy al primer acceso, y la JVM garantiza thread-safety durante la carga de la clase. `CopyOnWriteArrayList` es thread-safe para lecturas concurrentes.

**`PosController`:** `POST /api/pos/data` (recibe transacción) + `GET /api/pos/data` (lista todo).

### 2.8 MS2-Online — `ms2-online`

Igual que MS1 pero para **ventas del canal digital**. Mismo patrón Singleton Holder.

Agrega método `findUltimosDias(int dias)` en el repositorio para filtrar ventas recientes.

### 2.9 MS3-Inventario — `ms3-inventario`

Recibe y persiste **ítems de inventario**. Migrado de Singleton a JPA/H2 en esta evaluación.

**`ItemInventario`:** `@Entity @Table(name="item_inventario")` con campos `id` (PK auto), `itemId`, `categoria`, `nombre`, `cantidad`, `precioUnitario`, `sucursal`, `fecha`, `createdAt`.

**`InventarioRepository extends JpaRepository<ItemInventario, Long>`** con derived queries:
- `findBySucursal(String sucursal)`
- `findByCategoria(String categoria)`
- `findBySucursalAndCategoria(String sucursal, String categoria)`

**`InventarioController`:** Valida que payload contenga `item_id`, `nombre` y `sucursal` antes de guardar. Si falta cualquiera → `400 BAD_REQUEST`, sin tocar el repositorio.

### 2.10 MS4-Empleados — `ms4-empleados`

Recibe y persiste **registros de turno de empleados**. Mismo enfoque JPA/H2.

**`RegistroEmpleado`:** campos `id`, `empleadoId`, `nombre`, `sucursal`, `turno`, `horasTrabajadas` (Double), `fecha`.

**Validación en controller:** `empleado_id` y `turno` son obligatorios. `horas_trabajadas > 24` → `400` (nadie puede trabajar más de 24 horas en un día).

### 2.11 MS5-Reportes — `ms5-reportes`

Recibe y persiste **eventos financieros** (cierres de caja, descuentos, devoluciones, bonificaciones). Mismo enfoque JPA/H2.

**`EventoReporte`:** campos `id`, `reporteId`, `tipo`, `descripcion`, `monto` (Long), `sucursal`, `fecha`.

**Validación:** `reporte_id` y `tipo` son obligatorios. `monto < 0` → `400` (no se admiten montos negativos).

---

## 3. Patrones de Diseño

### 3.1 Singleton — Holder Pattern (MS1, MS2)

**Intención:** garantizar una única instancia de la "base de datos en memoria" compartida por todos los requests.

**Implementación:**
```java
@Repository
public class PosTransactionRepository {
    protected PosTransactionRepository() {}  // Spring puede instanciar via CGLIB

    private static class DatabaseHolder {
        static final List<PosTransaction> INSTANCE = new CopyOnWriteArrayList<>();
    }

    public static List<PosTransaction> getDatabase() {
        return DatabaseHolder.INSTANCE;
    }
}
```

**Por qué Holder y no `synchronized`?** La JVM garantiza que la clase `DatabaseHolder` se carga una sola vez (cuando se accede por primera vez a `getDatabase()`). No hay `synchronized` explícito, pero la inicialización es thread-safe por especificación de Java. El constructor es `protected` para que Spring pueda crear el bean via CGLIB sin romper el patrón.

**Por qué `CopyOnWriteArrayList`?** Es thread-safe para escenarios de muchas lecturas y pocas escrituras (el caso de uso real: muchos GETs de consulta, algunos POSTs de escritura). Cada escritura copia el array completo, por eso no es apta para escrituras masivas, pero sí para este contexto.

**Diferencia con MS3/4/5:** MS1 y MS2 usan Singleton porque sus datos son transaccionales de "tiempo real" — si el contenedor se reinicia, los datos se pierden intencionalmente (el siguiente ciclo de simulación vuelve a poblar). MS3/4/5 usan JPA/H2 porque su inventario, empleados y reportes deben persistir entre reinicios.

### 3.2 Proxy — Protección + Auditoría (BFF)

**Intención:** controlar el acceso al servicio real (`OrqServiceClient`) interponiendo capas de validación y registro.

**Estructura:**
```
IOrqService (interfaz)
    ├── OrqServiceClient  (RealSubject: hace la llamada HTTP real)
    └── ServiceProxy      (Proxy: valida token + audita + delega)
```

**Tres responsabilidades en `ServiceProxy`:**

1. **Proxy de protección** (`validateToken()`): verifica que el `authToken` no sea null, tenga formato `Bearer <token>`, y que `authClient.validate()` devuelva `true`. Si falla cualquier condición → `SecurityException`.

2. **Proxy de auditoría** (`auditLog()`): imprime en consola `[AUDIT][timestamp] phase=REQUEST|RESPONSE|ERROR requestId=... detail=...` antes y después de cada llamada al subject real.

3. **Proxy de error** (`catch` en `fetchVentas`): captura excepciones del subject real y las convierte en respuestas vacías controladas en lugar de lanzarlas al controlador.

**Constructor package-private para tests:**
```java
ServiceProxy(IOrqService realSubject, AuthClient authClient) { ... }
```
Esto permite inyectar un mock del subject en tests unitarios sin necesidad de Spring context.

**Fallback en `AuthClient.validate()`:** si MS AUTH no está disponible (red error), el BFF acepta cualquier token no vacío como válido. Esto evita que un fallo de MS AUTH tire abajo todo el sistema.

### 3.3 Factory Method — `ApiServiceFactory.js` (Frontend Node.js)

**Intención:** centralizar la creación de instancias de servicio sin que el consumidor sepa qué clase concreta se instancia.

**Implementación:**
```javascript
class ApiServiceFactory {
    static REGISTRY = {
        data: DataService, auth: AuthService, dashboard: DashboardService,
        ventas: VentasService, inventario: InventarioService, ...
    };
    static ENVIRONMENTS = {
        production:  { baseUrl: 'http://api-gateway:80',    timeout: 5000  },
        development: { baseUrl: 'http://localhost:80',       timeout: 10000 },
        test:        { baseUrl: 'http://localhost:8080',     timeout: 1000  },
    };
    static create(serviceType, environment, overrides) {
        const envConfig = this.ENVIRONMENTS[environment];
        const Cls = this.REGISTRY[serviceType];
        return new Cls({ ...envConfig, ...overrides });
    }
    static register(serviceType, ServiceClass) { ... }  // extensión en runtime
}
```

**Por qué es Factory Method y no Abstract Factory?** Factory Method define un solo método de creación (`create`) que devuelve diferentes productos (los services). Abstract Factory agrupa familias de productos relacionados. Aquí, todos los products son services del mismo tipo conceptual, solo difieren en configuración.

**Uso en tests:** el parámetro `overrides` permite pasar `{ fetcher: mockFetch }` para reemplazar el `fetch` real por un mock, sin modificar la clase de servicio.

### 3.4 Facade — `DataFacade` / `App.Facade` (Frontend)

**Hay dos Facades en el sistema, una en Node.js y una en el browser:**

**`DataFacade` (Node.js / `DataService.js`):**
```javascript
class DataFacade {
    constructor(environment, fetcherOverride) {
        this.dataService = ApiServiceFactory.create('data', environment, overrides);
        this.dashboardService = ApiServiceFactory.create('dashboard', environment, overrides);
    }
    async getVentas()     { return ApiServiceFactory.create('ventas', ...).fetchVentas(); }
    async getInventario() { return ApiServiceFactory.create('inventario', ...).fetchInventario(); }
    // ... getEmpleados, getEventos, getIndicadores, getReportes
}
```
Oculta que hay múltiples services distintos (`VentasService`, `InventarioService`, etc.) detrás de métodos de dominio simples.

**`App.Facade` (browser / `facade.js`):**
```javascript
App.Facade = (() => {
    function authHeader() {
        return { Authorization: 'Bearer ' + App.Auth.getSession()?.token };
    }
    async function apiFetch(endpoint) {
        const res = await fetch(endpoint, { headers: authHeader() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }
    return {
        getIndicadores: () => apiFetch('/api/indicadores'),
        getReportes:    () => apiFetch('/api/reportes'),
        getVentas:      () => apiFetch('/api/ventas'),
        getInventario:  () => apiFetch('/api/datos/inventario'),
        getEmpleados:   () => apiFetch('/api/datos/empleados'),
        getEventos:     () => apiFetch('/api/datos/eventos'),
    };
})();
```
Oculta la URL concreta, el header Authorization, y el manejo de errores HTTP. Los módulos `App.Indicadores`, `App.Datos` y `App.Reportes` solo llaman `App.Facade.getVentas()`.

### 3.5 Strategy — Procesamiento de datos en orq-datos

**Intención:** permitir cambiar el algoritmo de procesamiento sin modificar el contexto (`OrqDatosController`).

**Interfaz:**
```java
public interface ProcessingStrategy {
    Map<String, Object> procesar(String requestId,
                                  List<Map<String, Object>> transacciones,
                                  double totalMonto);
    String getNombre();
}
```

**Implementaciones:**
- `@Component("batch") BatchStrategy` — procesa todo de una vez, cuenta por canal (POS vs Online). Default.
- `@Component("stream") StreamStrategy` — procesa registro por registro (simula streaming).
- `@Component("cache") CacheStrategy` — verifica si hay snapshot previo y lo retorna sin recalcular.

**`StrategyFactory`:** Spring inyecta automáticamente `Map<String, ProcessingStrategy>` donde la clave es el nombre del bean (`"batch"`, `"stream"`, `"cache"`). El factory solo hace `strategies.getOrDefault(nombre, strategies.get("batch"))`. Si el parámetro recibido es inválido, cae al batch por defecto.

**Por qué Spring inyecta el Map automáticamente?** Cuando Spring ve `@Autowired Map<String, T>` donde T es una interfaz, inyecta todos los beans que implementen esa interfaz, usando el nombre del bean como clave. La anotación `@Component("batch")` define ese nombre.

---

## 4. Persistencia

### 4.1 Comparación de enfoques

| MS | Mecanismo | Sobrevive reinicio | Volumen Docker |
|---|---|---|---|
| MS1, MS2 | Singleton en memoria (CopyOnWriteArrayList) | No | — |
| MS3, MS4, MS5 | JPA + H2 en archivo | Sí | inventario-data, empleados-data, reportes-data |
| MS-AUTH | JPA + H2 en archivo | Sí | bd-usuario |
| ORQ-DATOS | JPA + H2 en archivo | Sí | bd-datos |
| ORQ-IND | JPA + H2 en archivo | Sí | bd-ind |
| ORQ-REP | JPA + H2 en archivo | Sí | bd-rep |

### 4.2 Configuración H2 en archivo (ej. MS3)

```properties
spring.datasource.url=jdbc:h2:file:/data/bd-inventario;DB_CLOSE_DELAY=-1;AUTO_RECONNECT=TRUE
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=update
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

- `DB_CLOSE_DELAY=-1`: la base de datos permanece abierta mientras la JVM esté viva (sin este parámetro, H2 en modo embedded cierra la BD cuando no hay conexiones activas).
- `ddl-auto=update`: Hibernate crea las tablas si no existen y agrega columnas nuevas si el esquema cambia. No borra datos existentes.
- El path `/data` se mapea al volumen Docker nombrado, que persiste entre reinicios del contenedor.

### 4.3 JpaRepository — métodos heredados

Al extender `JpaRepository<ItemInventario, Long>`, el repositorio hereda:
- `save(entity)` — INSERT o UPDATE
- `findAll()` — SELECT *
- `findById(id)` — SELECT WHERE id=?
- `count()` — COUNT(*)
- `delete(entity)`, `deleteById(id)` — DELETE

Las **derived queries** son métodos que Spring Data deriva del nombre:
- `findBySucursal(String s)` → `SELECT * WHERE sucursal = ?`
- `findBySucursalAndCategoria(String s, String c)` → `SELECT * WHERE sucursal = ? AND categoria = ?`
- `findTop10ByOrderByTimestampDesc()` → `SELECT * ORDER BY timestamp DESC LIMIT 10`

No hay SQL escrito a mano. Spring Data genera el SQL en tiempo de compilación/arranque.

---

## 5. Seguridad y Autenticación

### 5.1 Flujo completo de login

```
Navegador → POST /api/login (Express)
    → POST http://api-gateway:80/api/proxy/login (fetch)
        → nginx → bff-service:8080 (proxy_pass)
            → BffController.login() → AuthClient.login()
                → POST http://ms-auth:8090/auth/login
                    → AuthController.login()
                        → AuthService.login(username, password)
                            1. SHA-256(password)
                            2. usuarioRepository.findByUsername(username)
                            3. .filter(u -> hash.equalsIgnoreCase(u.getPasswordHash()))
                            4. .map(u -> { UUID token = ...; tokenStore.put(token, u); return token; })
                            → Optional<String> token
                        → ResponseEntity: {"token":"uuid","username":"admin","timestamp":"..."}
```

El token UUID se guarda en `sessionStorage` bajo la clave `gc_session`. `sessionStorage` se borra al cerrar la pestaña (a diferencia de `localStorage` que persiste entre sesiones).

### 5.2 Flujo de validación de token en cada request protegida

```
Browser → GET /api/indicadores con header Authorization: Bearer <uuid>
    → Express index.js → proxyGet("/api/proxy/indicadores")
        → nginx → bff-service
            → BffController.getIndicadores()
                → authClient.validate("Bearer <uuid>")
                    → POST http://ms-auth:8090/auth/validate {"token":"<uuid>"}
                        → AuthController.validate()
                            → extractToken(): quita "Bearer "
                            → authService.validate("<uuid>")
                                → Optional.ofNullable(tokenStore.get("<uuid>"))
                            → 200 {"valid":true,"username":"admin","role":"ADMIN"}
                → (si valid=true) → orqIndClient.fetchIndicadores(id)
```

### 5.3 Hashing de contraseñas

SHA-256 produce un hash de 256 bits (64 caracteres hexadecimales). El campo `password_hash` en la BD tiene `length=64`. Las contraseñas nunca se almacenan en texto plano. SHA-256 es determinístico — el mismo input siempre produce el mismo hash, por lo que no requiere salt para esta implementación.

### 5.4 Control de acceso basado en rol

El rol (`ADMIN`, `USER`, `analista`, `ejecutivo`) se almacena en `sessionStorage` después del login. **El frontend no verifica el rol contra el backend en cada navegación** — el control de qué módulos se muestran está en `App.Router`:

```javascript
const MODULES = {
    admin:     ['indicadores', 'datos', 'reportes', 'usuarios'],
    ejecutivo: ['indicadores', 'datos', 'reportes'],
    analista:  ['indicadores', 'datos', 'reportes'],
};
```

Solo el módulo `usuarios` es exclusivo del `admin`. La configuración de umbrales KPI está disponible para `analista` y `admin`.

---

## 6. Frontend

### 6.1 Arquitectura Node.js — `frontend-app/src/main/index.js`

Express actúa como **BFF propio de la SPA**: sirve archivos estáticos (`/public`) y proxea llamadas al API Gateway añadiendo el header `Authorization` que viene del navegador.

```javascript
async function proxyGet(gatewayPath, req, res) {
    const response = await fetch(`${GATEWAY_URL}${gatewayPath}`, {
        headers: { Authorization: req.headers.authorization || "" },
    });
    const data = await response.json();
    res.status(response.status).json(data);
}
```

Las rutas expuestas: `/api/dashboard`, `/api/ventas`, `/api/indicadores`, `/api/reportes`, `/api/datos/inventario`, `/api/datos/empleados`, `/api/datos/eventos`.

### 6.2 SPA — arquitectura de módulos browser

La SPA usa el **patrón IIFE** (Immediately Invoked Function Expression) para encapsular cada módulo en su propio scope, sin contaminación de variables globales. Todos se exponen bajo el namespace `window.App`:

```javascript
window.App = window.App || {};
App.Auth    = (() => { /* ... */ })();
App.Router  = (() => { /* ... */ })();
App.Facade  = (() => { /* ... */ })();
App.Indicadores = (() => { /* ... */ })();
App.Datos   = (() => { /* ... */ })();
App.Reportes= (() => { /* ... */ })();
App.Usuarios= (() => { /* ... */ })();
```

**`App.Router`:** controla qué módulo se muestra. Cuando cambia de módulo, llama al método `destroy()` del módulo anterior (ej. `App.Indicadores.destroy()` limpia el `setInterval` de auto-refresh), luego llama `init(container)` del nuevo módulo con el contenedor DOM.

**`App.Auth`:** gestiona la sesión en `sessionStorage`. `handleLogin()` hace `POST /api/login`, recibe el token, llama `setSession()` y luego `App.Router.showApp()`.

### 6.2.1 Sistema de diseño — `css/styles.css`

La SPA implementa un sistema de diseño propio basado en **CSS Custom Properties** (tokens de diseño), organizado en 31 secciones que cubren desde los tokens base hasta cada componente.

**Tokens de diseño (`:root`):**
```css
/* Escala tipográfica (7 niveles) */
--text-xs: 11px  --text-sm: 12px  --text-base: 13px  --text-md: 14px
--text-lg: 16px  --text-xl: 18px  --text-2xl: 24px

/* Escala de espaciado (8 niveles) */
--space-1: 4px  --space-2: 8px  …  --space-8: 32px

/* 4 niveles de elevación */
--shadow-xs  --shadow-sm  --shadow  --shadow-md  --shadow-lg  --shadow-card

/* Acento principal */
--accent: #4f46e5  (índigo)
```

**Decisiones de diseño:**
- **Sidebar claro**: fondo blanco con borde derecho `1px solid var(--gray-200)`. Sin gradientes oscuros — facilita la lectura de íconos y etiquetas en cualquier brillo de pantalla.
- **Login limpio**: fondo `var(--gray-100)`, tarjeta blanca con `box-shadow`. Se elimina el fondo navy con gradientes radiales de versiones anteriores.
- **Auto-fit grids**: `repeat(auto-fit, minmax(220px, 1fr))` en KPI grids — no hay lógica JS para contar columnas; el CSS adapta el layout en cualquier ancho.
- **Responsive en 3 breakpoints**: ≥900px sidebar completo, 900px–600px sidebar icon-only (`font-size: 0` oculta texto sin wrapper JS), <600px sidebar off-canvas con overlay.

**Visualizaciones Chart.js:**

| Gráfico | Tipo | Decisión de diseño |
|---|---|---|
| Ventas por Sucursal | Barras **horizontales** (`indexAxis: 'y'`) | 10 sucursales con nombres largos — etiquetas legibles sin rotación |
| Ventas Presencial vs Online | Doughnut | `cutout: 72%` — anillo delgado; `borderWidth: 0` — sin separación artificial entre segmentos |

Colores de gráficos alineados al token `--accent: #4f46e5`. Tooltips con fondo `#1f2937` (neutral oscuro, no navy).

### 6.3 Módulo Indicadores (`indicadores.js`)

Es el módulo más complejo. Sus características:

- **Fetch paralelo con `Promise.allSettled`**: llama a los 4 endpoints (ventas, inventario, empleados, eventos) simultáneamente. `allSettled` (a diferencia de `all`) nunca rechaza — si un endpoint falla, retorna `{ status: 'rejected' }` y el módulo usa array vacío para ese dominio.

- **Filtro por sucursal**: el dropdown `kpi-sucursal` (componente custom `UI.dropdown`) filtra todos los KPIs al valor seleccionado. Los KPIs `globalOnly` (Ventas Presenciales, Ventas Online, Sucursal Líder) se ocultan en modo sucursal; los `sucursalOnly` (Ranking, Ticket Promedio) se ocultan en modo global.

- **Umbrales configurables**: se persisten en `localStorage` con clave `gc_kpi_thresholds`. La estructura es `{ "global": { "ventasTotales": 5000000, ... }, "Las Condes": { ... } }` — hay umbrales independientes por contexto. Solo `analista` y `admin` pueden configurar.

- **Semáforos**: si el valor KPI >= umbral → `semaphore-green` + `card-green`; si < umbral → `semaphore-red` + `card-red`.

- **Log de cambios**: cada modificación de umbral se registra en `localStorage` con usuario, rol, kpi, valor anterior/nuevo y timestamp. Máximo 50 entradas.

- **Auto-refresh**: `setInterval` cada 15 segundos. Se limpia en `destroy()` al navegar a otro módulo.

### 6.4 Módulo Datos (`datos.js`)

Tabla paginada con 4 tabs (ventas, inventario, empleados, eventos) y filtros:

- **`FACADE_MAP`**: mapeo de tab → método de `App.Facade`, implementando el patrón Facade en browser.
- **Paginación**: `PAGE_SIZE = 20`. Estado guardado en `currentPage`.
- **Filtros**: sucursal (pill dropdown), rango de fechas (date picker custom), búsqueda libre por texto. `getSearchFields(tab)` define qué campos son buscables por tab.
- **`computeFilters()`**: aplica filtros en cadena: primero por sucursal, luego por fechas, luego por campo/texto.

### 6.5 Componentes UI custom (`ui-components.js`)

`UI.dropdown()` y `UI.datePicker()` reemplazan los controles nativos del navegador para dar apariencia consistente en todos los OS/browsers.

**`UI.dropdown()`**: crea un `<div>` custom con opciones como `<ul>` flotante. Maneja:
- Click en documento para cerrar (con `stopPropagation` en el propio dropdown)
- `UI.onSelect(id, cb)` para suscribirse a cambios de valor
- Reset via `data-placeholder` al limpiar filtros

**`UI.datePicker()`**: calendario mensual con navegación prev/next. Usa `stopPropagation` en el contenedor para evitar que el click en un día cierre el calendario inmediatamente.

---

## 7. Tests Unitarios

### 7.1 Tests Java (JUnit 5 + Mockito)

**Patrón de todos los tests:**
```java
@ExtendWith(MockitoExtension.class)
class XxxControllerTest {
    @Mock   XxxRepository repo;       // mock automático
    @InjectMocks XxxController controller;  // instancia real, deps inyectadas

    @Test void nombreTest_condicion_resultadoEsperado() {
        // Arrange
        when(repo.metodo()).thenReturn(valor);
        // Act
        ResponseEntity<?> response = controller.metodo(input);
        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(repo, times(1)).metodo();
    }
}
```

`@ExtendWith(MockitoExtension.class)` activa Mockito sin levantar Spring context → tests rápidos, sin BD, sin red.

**Tests por servicio:**

| Clase test | Tests | Qué cubre |
|---|---|---|
| `InventarioControllerTest` | 6 | listar (full/vacía), recibir (válido, sin itemId, sin nombre, sin sucursal), health |
| `EmpleadoControllerTest` | 6 | listar (full/vacía), recibir (válido, sin empleadoId, sin turno, horas>24), health |
| `ReporteControllerTest` | 6 | listar (full/vacía), recibir (válido, sin reporteId, sin tipo, monto negativo), health |
| `AuthControllerTest` | 6 | login (válido/inválido), validate (header/body/sin token), health |

**Puntos críticos de los tests:**
- `health()` retorna `"UP"` (no `"ok"`) → `assertEquals("UP", body.get("status"))`
- `repo.count()` en health() no necesita stub — Mockito retorna `0L` por defecto
- `authService.login()` retorna `Optional<String>` (solo el token UUID, no un Map)
- `controller.validate(null, "Bearer valid-token")` toma 2 parámetros; `extractToken` stripea el prefijo
- `verify(repo, never()).save(any())` confirma que el repositorio nunca se llama cuando la validación falla

### 7.2 Tests JavaScript (Jest + mockFetch)

**Patrón de tests JS:**
```javascript
const mockFetch = jest.fn();
const service = new DataService({ baseUrl: 'http://localhost:8080', fetcher: mockFetch });

test('fetchVentas retorna datos', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] });
    const result = await service.fetchVentas();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/ventas', expect.any(Object));
});
```

| Archivo test | Tests | Qué cubre |
|---|---|---|
| `ApiServiceFactory.test.js` | 29 | `create()` para 10 tipos vía `test.each`, entornos, overrides, `register()`, errores, métodos HTTP base |
| `DataService.test.js` | 19 | `DataFacade` con mockFetch — todos los dominios, errores de red, 401 |
| `DataDisplay.test.js` | 20 | `render()` en estados loading/error/data/empty, XSS sanitization |

**Dato importante:** `_renderList()` muestra el dominio en **MAYÚSCULAS** (`VENTAS` no `ventas`) → el test usa `toContain('VENTAS')`.

**Coverage:** solo mide `src/services/**` y `src/components/**` (no el código main de Express ni los archivos browser).

### 7.3 Multi-stage Docker como gate de calidad

```dockerfile
FROM node:18-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
RUN npm test          # ← si falla, el build entero falla

FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --production   # sin devDependencies (jest, etc.)
COPY src ./src
CMD ["npm", "start"]
```

Si `npm test` falla, Docker no produce imagen. Esto integra los tests como condición de publicación.

---

## 8. Docker y Orquestación

### 8.1 Red interna

Todos los servicios pertenecen a la red bridge `cordillera-net`. Los servicios se comunican por nombre de container (DNS interno de Docker): `http://ms3-inventario:8084`, `http://bff-service:8080`, etc. Solo los puertos listados en `ports:` son accesibles desde el host.

### 8.2 Volúmenes nombrados

```yaml
volumes:
  bd-usuario:       # ms-auth
  bd-datos:         # orq-datos
  bd-ind:           # orq-ind
  bd-rep:           # orq-rep
  inventario-data:  # ms3-inventario
  empleados-data:   # ms4-empleados
  reportes-data:    # ms5-reportes
```

Los volúmenes nombrados son gestionados por Docker. Sus datos persisten aunque el container se elimine con `docker-compose down`. Solo `docker-compose down -v` los borra.

### 8.3 `depends_on`

`depends_on` garantiza el **orden de arranque**, no la disponibilidad del servicio. Si `ms3-inventario` tarda 10 segundos en estar listo pero `orq-ind` empieza a llamarlo a los 2 segundos, habrá errores 502. Por eso todos los microservicios tienen `restart: on-failure` — se recuperan solos.

### 8.4 Simuladores (Scripts PowerShell)

Los scripts `simulador-*.ps1` no tienen contenedor Docker. Corren en el host y escriben directamente a los puertos expuestos (`localhost:8081`, `localhost:8083`, etc.). Envían requests HTTP POST con datos ficticios para poblar los MS.

---

## 9. Preguntas Difíciles

### P1: ¿Por qué el BFF hace `validate` en `AuthClient` y también `ServiceProxy` hace `validateToken`? ¿No es redundante?

No exactamente. Hay dos flujos diferentes:

**Flujo via `ServiceProxy`** (rutas `/api/proxy/data` y `/api/proxy/ventas`): el controlador pasa el token a `serviceProxy.fetchData()` → `ServiceProxy.validateToken()` valida internamente.

**Flujo directo** (rutas `/api/proxy/indicadores`, `/api/proxy/reportes`, `/api/proxy/dashboard`, `/api/proxy/datos/*`): el controlador llama `authClient.validate(authToken)` directamente, sin pasar por ServiceProxy.

La razón: `ServiceProxy` solo envuelve la comunicación con `orq-datos` (a través de `IOrqService`). Las rutas directas a orq-ind, orq-rep y MS3/4/5 no pasan por ese proxy — el controlador las llama directamente a sus clients. El BffController hace la validación por su cuenta para esas rutas.

### P2: Si `tokenStore` es un `ConcurrentHashMap` en memoria, ¿qué pasa cuando ms-auth se reinicia?

Todos los tokens se pierden. Los usuarios con sesión activa recibirán `401` en el próximo request. Tendrán que hacer login de nuevo. Es una limitación conocida del diseño actual: para producción real se usaría Redis o JWT (tokens sin estado que no requieren store).

Con JWT, el servidor no necesita guardar nada — el token mismo contiene la información firmada, y el servidor solo verifica la firma. Con `ConcurrentHashMap`, el servidor es stateful.

### P3: ¿Por qué `StreamStrategy` y `CacheStrategy` se implementan si no cambian el resultado final?

Demuestran el patrón Strategy. En una aplicación real:
- `BatchStrategy`: consolida y persiste todo de una vez. Útil para cierres de período.
- `StreamStrategy`: procesa registro por registro, permitiendo logs incrementales o integración con message queues.
- `CacheStrategy`: evita reprocessing si ya existe un snapshot reciente, mejorando performance.

El parámetro `?strategy=` permite al cliente decidir el algoritmo en tiempo de ejecución sin cambiar el endpoint.

### P4: ¿Qué significa `@Column(nullable = false)` y qué pasa si se viola?

Es una restricción a nivel de base de datos. Hibernate genera `NOT NULL` en el DDL. Si se intenta hacer `repo.save(entity)` con ese campo null, la BD lanza `ConstraintViolationException` → Spring la convierte en `500 Internal Server Error`.

Por eso los controllers validan **antes** de llamar al repositorio (retornando `400 BAD_REQUEST`) — para dar un error claro al cliente sin llegar a la BD.

### P5: ¿Por qué `Promise.allSettled` en `fetchAllRaw()` y no `Promise.all`?

`Promise.all` rechaza tan pronto como cualquier promesa falla. Si MS3 está caído, `Promise.all([getVentas(), getInventario(), ...])` lanzaría error y el módulo de indicadores no mostraría nada, aunque los otros 3 endpoints funcionen bien.

`Promise.allSettled` siempre resuelve con un array de resultados, cada uno con `{ status: 'fulfilled', value: ... }` o `{ status: 'rejected', reason: ... }`. El código luego toma el `value` solo si `status === 'fulfilled'`, y usa `[]` para los que fallaron. Así el dashboard muestra parcialmente aunque algún MS esté caído.

### P6: ¿Por qué `sessionStorage` y no `localStorage` para el token?

`sessionStorage` se borra al cerrar la pestaña del navegador. `localStorage` persiste indefinidamente. Para tokens de autenticación, `sessionStorage` es más seguro: si el usuario cierra el browser o la pestaña, la sesión termina automáticamente, reduciendo el riesgo de que otro usuario en la misma máquina acceda a la sesión activa.

Desventaja: abrir la app en una nueva pestaña requiere volver a hacer login (las tabs no comparten `sessionStorage`).

### P7: ¿Qué es el "Holder Pattern" y por qué es thread-safe sin `synchronized`?

El Holder Pattern explota el mecanismo de carga de clases de Java. La JVM garantiza que una clase se inicializa exactamente una vez, cuando se accede por primera vez. La especificación de Java (JLS §12.4) establece que la inicialización de clases es thread-safe sin necesidad de `synchronized` explícito.

`DatabaseHolder.INSTANCE` se inicializa cuando se llama `getDatabase()` por primera vez. Si dos hilos llaman simultáneamente, la JVM serializa la inicialización de la clase — solo un hilo inicializa, el otro espera. Después, ambos leen la referencia ya establecida. No hay double-checked locking, no hay `volatile`, no hay `synchronized`.

### P8: El `AuthClient` en el BFF tiene un fallback: si ms-auth no responde, acepta tokens no vacíos. ¿No es un agujero de seguridad?

Sí, es una decisión de trade-off: **disponibilidad sobre seguridad** cuando ms-auth está caído. En un entorno de producción real, la decisión correcta sería rechazar todos los requests si el servicio de autenticación no responde (fail-closed). El fallback existe aquí para facilitar el desarrollo y testing cuando ms-auth aún no está levantado.

La línea en `AuthClient.validate()`:
```java
return !token.isBlank();  // fallback: acepta cualquier token no vacío
```
Debería ser `return false` en producción, con circuit breaker y monitoreo de disponibilidad de ms-auth.

### P9: ¿Por qué `CompletableFuture.supplyAsync()` en `fetchTodas()` de orq-datos?

`supplyAsync` ejecuta la tarea en el `ForkJoinPool.commonPool()` (thread pool compartido de Java). Al lanzar las dos llamadas (MS1 y MS2) antes de hacer `.join()`, ambas HTTP requests corren en paralelo. Sin esto:

```java
// Secuencial: latencia = ms1_time + ms2_time
List<...> ms1 = fetchMs("/api/pos/data", ms1Url, "Tienda Física");
List<...> ms2 = fetchMs("/api/online/ventas", ms2Url, "Online");

// Paralelo: latencia = max(ms1_time, ms2_time)
CompletableFuture<...> f1 = CompletableFuture.supplyAsync(() -> fetchMs(...));
CompletableFuture<...> f2 = CompletableFuture.supplyAsync(() -> fetchMs(...));
return Stream.concat(f1.join().stream(), f2.join().stream()).collect(Collectors.toList());
```

El mismo patrón se usa en `BffController.getDashboard()` y en `OrqIndController.indicadores()`.

### P10: ¿Qué pasa si la validación falla en MS3 y se llama `verify(repo, never()).save(any())`?

`verify(repo, never()).save(any())` verifica que el método `save()` del mock NO fue llamado ni una sola vez durante el test. Si el controller llama `repo.save()` aun cuando la validación debería haber fallado, Mockito lanza `WantedButNotInvoked` o `TooManyActualInvocations` y el test falla.

Esto asegura que la capa de validación del controller es efectiva — los datos inválidos nunca llegan a la BD. Es el test del caso negativo más importante.

### P11: ¿Por qué `nginx` usa variables (`set $bff`) en vez de `proxy_pass http://bff-service:8080`?

Si nginx resuelve el hostname en el momento de arranque (`proxy_pass http://bff-service:8080` directamente en el bloque location), cachea esa IP al iniciar. Si el contenedor `bff-service` se recrea y obtiene una IP diferente, nginx seguirá apuntando a la IP anterior hasta que se recargue.

Al asignar la URL a una variable (`set $bff "http://bff-service:8080"`), nginx re-resuelve el hostname en cada request usando el resolver DNS (Docker internal: `127.0.0.11`), con TTL de 10 segundos. Esto permite que contenedores se recreen sin reiniciar nginx.

### P12: ¿Cómo funciona `@InjectMocks` cuando el controlador tiene constructor con parámetros?

Mockito detecta el constructor de `InventarioController(InventarioRepository repo)` y lo llama pasando el mock `@Mock InventarioRepository repo`. No se usa reflexión sobre campos privados — Mockito prefiere inyección por constructor cuando existe.

Si el controlador tuviera múltiples constructores, Mockito elegiría el de mayor número de parámetros que pueda satisfacer con los mocks disponibles.

---

## Resumen de patrones por capa

| Capa | Patrón(es) | Archivo(s) principal(es) |
|---|---|---|
| API Gateway | Reverse Proxy (nginx) | `nginx.conf` |
| BFF | Proxy (protección + auditoría) | `ServiceProxy.java`, `IOrqService.java` |
| ORQ-DATOS | Strategy + Factory de strategies | `ProcessingStrategy.java`, `StrategyFactory.java` |
| MS1, MS2 | Singleton — Holder Pattern | `PosTransactionRepository.java`, `OnlineVentaRepository.java` |
| MS3, MS4, MS5 | Repository (JPA) | `InventarioRepository.java`, `EmpleadoRepository.java`, `ReporteRepository.java` |
| Frontend Node.js | Factory Method | `ApiServiceFactory.js` |
| Frontend Node.js | Facade (server side) | `DataService.js` (DataFacade) |
| Browser SPA | Facade (client side) | `facade.js` (App.Facade) |
| Browser SPA | IIFE Module | Todos los archivos `.js` de `/public/js/` |
