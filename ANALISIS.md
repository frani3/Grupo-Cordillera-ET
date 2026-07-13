# Análisis Técnico — Justificación de Patrones de Diseño
## Proyecto Evaluación Transversal — Arquitectura de Software

---

## Contexto del Sistema

El sistema implementa una arquitectura de microservicios en cinco capas. Cada capa tiene una responsabilidad delimitada y adopta un patrón de diseño GoF que resuelve un problema arquitectónico concreto, no como elección arbitraria, sino como respuesta a requisitos reales del cliente:

> *"El sistema debe soportar múltiples entornos, garantizar la seguridad entre capas, ser mantenible por un equipo distribuido y escalar sin reescribir código existente."*

```
┌──────────────────────────────────────────────────────────┐
│   frontend-app  (Node.js)  — Patrón FACTORY METHOD       │
│                             Patrón FACADE (browser)      │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP / JSON
┌─────────────────────────▼────────────────────────────────┐
│   bff-service   (Spring Boot) — Patrón PROXY             │
└──────┬───────────────────────────────────────────────────┘
       │ HTTP / JSON (red interna Docker)
       ├──▶ orq-datos  :8082  — Patrón STRATEGY
       │         ├──▶ ms1-pos    :8081  (Singleton)
       │         └──▶ ms2-online :8083  (Singleton)
       ├──▶ orq-ind    :8092
       │         ├──▶ ms3-inventario :8084  (JPA + H2)
       │         └──▶ ms4-empleados  :8085  (JPA + H2)
       └──▶ orq-rep    :8093
                 └──▶ ms5-reportes   :8086  (JPA + H2)
```

**Responsabilidades por capa:**

| Capa | Responsabilidad |
|---|---|
| MS1 / MS2 | Recibir datos, validarlos y almacenarlos en memoria (Singleton). Sin lógica de negocio. |
| MS3 / MS4 / MS5 | Recibir datos, validarlos y persistirlos en H2 (JPA). Sin lógica de negocio. |
| orq-datos | Consultar MS1+MS2 en paralelo, consolidar y aplicar estrategia de procesamiento |
| orq-ind | Consultar MS3+MS4 en paralelo, calcular indicadores operacionales |
| orq-rep | Consultar MS5, calcular totales financieros |
| bff-service | Validar token Bearer, auditar y delegar a los orquestadores |
| frontend-app | Crear el cliente HTTP según el entorno y consumir el BFF |

---

## 1. Frontend App — Patrón Factory Method

### Categoría GoF
Creacional.

### El Problema sin el Patrón

El frontend debe comunicarse con el BFF desde tres entornos distintos (desarrollo local, CI/CD, producción Docker). Las URLs y timeouts varían por entorno. Sin un patrón, el código cliente quedaría así:

```javascript
// CÓDIGO FRÁGIL sin Factory:
if (process.env.NODE_ENV === 'production') {
  this.url = 'http://bff-service:8080';
  this.timeout = 5000;
} else {
  this.url = 'http://localhost:8080';
  this.timeout = 10000;
}
// Duplicado en cada componente que hace HTTP.
// Agregar un nuevo entorno rompe múltiples archivos.
// Los tests necesitan manipular process.env globalmente (frágil).
```

### La Solución con Factory Method

```
ApiServiceFactory.create(tipo, entorno)
       │
       ├── 'data'       + 'production'  → new DataService({ url: 'http://api-gateway:80', timeout: 5000 })
       ├── 'data'       + 'development' → new DataService({ url: 'http://localhost:80', timeout: 10000 })
       ├── 'data'       + 'test'        → new DataService({ url: 'http://localhost:8080', timeout: 1000 })
       ├── 'ventas'     + cualquiera    → new VentasService(...)
       ├── 'inventario' + cualquiera    → new InventarioService(...)
       ├── 'empleados'  + cualquiera    → new EmpleadosService(...)
       ├── 'eventos'    + cualquiera    → new EventosService(...)
       ├── 'dashboard'  + cualquiera    → new DashboardService(...)
       └── 'auth'       + cualquiera    → new AuthService(...)  ← extensible sin modificar create()
```

**REGISTRY en ET (10 tipos registrados):**
```javascript
static REGISTRY = {
  data:        DataService,
  auth:        AuthService,
  dashboard:   DashboardService,
  datos:       DatosService,
  indicadores: IndicadoresService,
  ventas:      VentasService,
  reportes:    ReportesService,
  inventario:  InventarioService,
  empleados:   EmpleadosService,
  eventos:     EventosService,
};
```

**Implementación real:**
```javascript
static create(serviceType = 'data', environment = 'production', overrides = {}) {
  const envConfig = ApiServiceFactory.ENVIRONMENTS[environment];
  if (!envConfig) throw new Error(`Entorno desconocido: '${environment}'`);
  const Cls = ApiServiceFactory.REGISTRY[serviceType];
  if (!Cls) throw new Error(`Tipo desconocido: '${serviceType}'`);
  return new Cls({ ...envConfig, ...overrides });
}
```

### Por qué mejora la Mantenibilidad

| Dimensión | Sin Factory | Con Factory Method |
|-----------|------------|-------------------|
| Cambiar URL de producción | Editar N archivos | Editar 1 línea en `ENVIRONMENTS` |
| Agregar tipo de servicio nuevo | Copiar configuración en varios sitios | `factory.register('report', ReportService)` |
| Tests unitarios de HTTP | Requieren mock global de `process.env` | Inyectar `fetcher` mock en `overrides` |
| Onboarding de nuevo desarrollador | Buscar en qué archivo se crean los clientes | Leer un único archivo de factory |

### Por qué mejora la Seguridad

El parámetro `overrides.fetcher` permite tests que **nunca hacen HTTP real**, eliminando el riesgo de que tests en CI llamen accidentalmente a servicios de producción. Además, los headers de autenticación se configuran en la factory (un único punto), no dispersos en componentes.

### Principios SOLID Aplicados

- **OCP (Open/Closed):** `register()` permite extender con nuevos tipos sin modificar `create()`.
- **DIP (Dependency Inversion):** Los componentes dependen de `ApiServiceFactory` (abstracción), nunca de `DataService` directamente.
- **SRP (Single Responsibility):** La factory crea; los servicios hacen HTTP; los componentes renderizan.

### Sistema de diseño — SPA browser

La capa browser implementa un sistema de diseño propio mediante **CSS Custom Properties** organizadas en tokens de tres niveles:

**Tokens primitivos (`:root`):**
- Escala tipográfica: `--text-xs` (11px) → `--text-2xl` (24px) — 7 tamaños
- Escala de espaciado: `--space-1` (4px) → `--space-8` (32px) — 8 niveles
- 4 niveles de elevación: `--shadow-xs`, `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, `--shadow-card`
- Acento único: `--accent: #4f46e5` (índigo) — todos los estados interactivos heredan de este token

**Decisiones técnicas relevantes:**
- Grid KPI con `repeat(auto-fit, minmax(220px, 1fr))` — sin conteo JS de columnas; el layout se adapta a cualquier ancho de viewport.
- Sidebar responsive: `font-size: 0` en `.nav-item` a ≤900px oculta el texto sin necesitar un elemento wrapper adicional (los SVG de ícono tienen dimensiones explícitas en px, no se ven afectados).
- Chart.js no puede leer CSS custom properties en tiempo de render, por lo que los colores de los gráficos están expresados como literales hexadecimales que corresponden al valor del token (`#4f46e5` = `var(--accent)`).

### Alternativa Descartada: Abstract Factory

Abstract Factory crea **familias** de objetos relacionados (ej: tema claro/oscuro). Para este sistema donde solo necesitamos variar configuración HTTP entre entornos, Abstract Factory añade clases innecesarias (viola el principio YAGNI). Factory Method es el mínimo que resuelve el problema de forma elegante.

**Nota de precisión terminológica:** `ApiServiceFactory.create()` es un único método estático que resuelve la clase a instanciar por lookup en `REGISTRY`, sin una jerarquía de "Creator" con subclases que sobrescriban el método de creación (la variante que el catálogo GoF exige para el Factory Method estricto). Es, con más precisión, una **Simple Factory / Static Factory**. Se documenta como "Factory Method" por ser el nombre más reconocible del patrón Creacional que resuelve este problema, pero vale aclarar la distinción para quien la evalúe con rigor GoF.

---

## 2. BFF Service — Patrón Proxy

### Categoría GoF
Estructural.

### El Problema sin el Patrón

El BFF necesita validar tokens, auditar operaciones y manejar errores de servicios internos. Sin Proxy, todas esas responsabilidades contaminarían el Controller:

```java
// CÓDIGO FRÁGIL sin Proxy — Controller con 4 responsabilidades:
@GetMapping("/data")
public ResponseEntity<DataResponse> getData(@RequestHeader String token) {
  if (token == null || !token.startsWith("Bearer ")) {   // Seguridad en Controller
    return ResponseEntity.status(401).build();
  }
  System.out.println("[LOG] Request: " + token);         // Auditoría en Controller
  try {
    DataResponse r = client.fetchData(requestId, token);
    System.out.println("[LOG] Response: " + r.status()); // Más auditoría en Controller
    return ResponseEntity.ok(r);
  } catch (Exception e) {
    return ResponseEntity.status(500).build();            // Error handling en Controller
  }
}
// → Imposible testear la validación sin levantar HTTP
// → Cambiar el esquema de auth requiere editar todos los Controllers
```

### La Solución con Proxy

```
BffController (Client)
       │ llama a
ServiceProxy (Proxy) implements IOrqService
       │
       ├── validateToken()         ← Proxy de Protección
       ├── auditLog("REQUEST")     ← Proxy de Auditoría
       ├── realSubject.fetchData() ← Delegación al RealSubject
       └── auditLog("RESPONSE")   ← Post-interceptación
              │
       OrqServiceClient (RealSubject) implements IOrqService
              │ HTTP
       orq-datos:8080
```

**Implementación real:**
```java
@Override
public DataResponse fetchData(String requestId, String authToken) {
    validateToken(authToken);              // PRE: Protección (lanza SecurityException)
    auditLog("REQUEST", requestId, authToken);

    DataResponse response;
    try {
        response = realSubject.fetchData(requestId, authToken); // Delegación
    } catch (Exception e) {
        auditLog("ERROR", requestId, e.getMessage());
        return DataResponse.error("Error interno del proxy: " + e.getMessage());
    }

    auditLog("RESPONSE", requestId, response.status()); // POST: Auditoría
    return response;
}
```

**`validateToken()` verifica tres condiciones en cadena:**
1. Token no nulo ni en blanco → `SecurityException`
2. Comienza con `"Bearer "` → `SecurityException`
3. `authClient.validate(token)` retorna `true` (llama a MS AUTH) → `SecurityException`

### Por qué mejora la Mantenibilidad

| Dimensión | Sin Proxy | Con Proxy |
|-----------|----------|-----------|
| Agregar nuevo header de auditoría | Modificar todos los Controllers | Solo modificar `auditLog()` en ServiceProxy |
| Cambiar Bearer → mTLS | Buscar en todos los Controllers | Solo modificar `validateToken()` |
| Tests de seguridad | Requieren contexto HTTP completo | Constructor package-private `ServiceProxy(IOrqService mock, AuthClient mock)` |
| Nuevo endpoint | Seguridad/auditoría ya incluidas por el Proxy | Cero código extra de seguridad en el Controller |

### Por qué mejora la Seguridad

**Un único punto de control:** Ninguna petición llega al `OrqServiceClient` sin pasar por el Proxy. Si hubiera múltiples Controllers sin Proxy, cada uno debería duplicar la validación, y la omisión en uno crearía una vulnerabilidad.

**Sin stack traces al cliente:** El Proxy captura excepciones del servicio real y devuelve `DataResponse.error(mensaje)` en lugar de información interna del sistema.

**Trazabilidad forense:** El audit log registra cada operación con timestamp, permitiendo reconstruir incidentes post-facto.

### Diferencia entre Proxy y Decorator

| Proxy | Decorator |
|-------|-----------|
| Controla **acceso** al objeto real | Agrega **funcionalidad visible** al cliente |
| Puede crear el RealSubject internamente | Siempre recibe el objeto envuelto del exterior |
| El cliente no sabe si hay un proxy | El cliente generalmente conoce los decoradores |
| Casos de uso: seguridad, caché, lazy init | Casos de uso: compresión, cifrado, formateo |

**Conclusión:** En este sistema el objetivo es **controlar y proteger el acceso** al orq-datos → Proxy. Si el objetivo fuera agregar compresión de respuesta visible al cliente, sería Decorator.

### Principios SOLID Aplicados

- **SRP:** Controller → HTTP; ServiceProxy → seguridad/auditoría; OrqServiceClient → llamada interna.
- **OCP:** Agregar rate limiting solo requiere un nuevo método privado en `ServiceProxy`.
- **LSP:** `ServiceProxy` implementa `IOrqService`, es intercambiable con `OrqServiceClient` sin que el Controller lo note.
- **DIP:** `BffController` depende de `IOrqService` (abstracción), no de `OrqServiceClient` (implementación).

---

## 3. Orq-Datos — Patrón Strategy

### Categoría GoF
Comportamiento.

### El Problema sin el Patrón

El servicio orquestador procesa solicitudes con distintos algoritmos según la carga actual. Sin Strategy:

```java
// CÓDIGO FRÁGIL sin Strategy:
public String process(String data, String type) {
  if (type.equals("batch")) {
    // 50 líneas de lógica batch
  } else if (type.equals("stream")) {
    // 50 líneas de lógica streaming
  } else if (type.equals("cache")) {
    // 50 líneas de lógica de caché
  }
  // → Imposible testear un algoritmo sin ejecutar todos los otros
  // → Agregar "ml-processing" requiere modificar este método (viola OCP)
}
```

### La Solución con Strategy

```
OrqDatosController (Contexto)
  └── strategyFactory.getStrategy("batch"|"stream"|"cache")
          │
          ├── BatchStrategy  (@Component("batch"))  → agrega por canal POS/Online
          ├── StreamStrategy (@Component("stream")) → calcula ticket promedio
          └── CacheStrategy  (@Component("cache"))  → calcula máximo y mínimo de montos
```

### Implementación GoF completa en ET

La implementación ET usa 5 clases separadas con inyección automática de Spring:

**Interfaz `ProcessingStrategy`:**
```java
public interface ProcessingStrategy {
    Map<String, Object> procesar(String requestId,
                                  List<Map<String, Object>> transacciones,
                                  double totalMonto);
    String getNombre();
}
```

**Estrategias concretas (una clase por algoritmo):**
```java
@Component("batch")
public class BatchStrategy implements ProcessingStrategy {
    @Override
    public Map<String, Object> procesar(...) {
        long pos    = transacciones.stream().filter(t -> "Tienda Física".equals(t.get("canal"))).count();
        long online = transacciones.stream().filter(t -> "Online".equals(t.get("canal"))).count();
        String resultado = "BATCH[%s]: %d transacciones | POS=%d | Online=%d | total=$%d"
                .formatted(requestId, transacciones.size(), pos, online, (long) totalMonto);
        return Map.of("estrategia", getNombre(), "resultado", resultado,
                      "transaccionesPOS", pos, "transaccionesOnline", online);
    }
    @Override public String getNombre() { return "batch"; }
}
// StreamStrategy → @Component("stream"), CacheStrategy → @Component("cache")
```

**`StrategyFactory`:**
```java
@Component
public class StrategyFactory {
    private final Map<String, ProcessingStrategy> strategies;

    public StrategyFactory(Map<String, ProcessingStrategy> strategies) {
        this.strategies = strategies;
    }

    public ProcessingStrategy getStrategy(String nombre) {
        return strategies.getOrDefault(
                nombre != null ? nombre.toLowerCase() : "batch",
                strategies.get("batch")
        );
    }
}
```

Spring detecta automáticamente todos los beans que implementan `ProcessingStrategy` y los inyecta en el `Map<String, ProcessingStrategy>` usando el nombre del `@Component` como clave. `getStrategy()` resuelve en O(1) sin ningún `if` ni `switch`.

**Uso en el controlador:**
```java
// Selección + ejecución de la estrategia con parámetro HTTP
ProcessingStrategy processingStrategy = strategyFactory.getStrategy(strategy);
Map<String, Object> estrategiaResult  = processingStrategy.procesar(id, transacciones, totalMonto);
```

### Por qué mejora la Mantenibilidad

- **Algoritmos aislados:** Cada Strategy tiene su propia clase con una única razón para cambiar (SRP). Modificar `BatchStrategy` no afecta a `StreamStrategy`.
- **Extensibilidad:** Agregar `MLProcessingStrategy` no modifica el contexto ni las estrategias existentes (OCP). Solo se añade una clase con `@Component("ml")`.
- **Testabilidad:** Cada Strategy se unit-testea de forma completamente independiente.
- **Cambio en runtime:** El parámetro `?strategy=batch|stream|cache` permite cambiar el algoritmo por request sin reiniciar el servicio.

### Alternativa Descartada: Template Method

Template Method define el esqueleto de un algoritmo mediante **herencia estática**: la subclase se determina en tiempo de compilación. Strategy usa **composición dinámica**: el algoritmo concreto se inyecta en runtime. Para un servicio que necesita cambiar de algoritmo por parámetro HTTP, Strategy es la única opción correcta.

### Principios SOLID Aplicados

- **OCP:** Nuevo algoritmo = nueva clase; cero cambios en el controlador.
- **SRP:** Cada algoritmo tiene exactamente una razón para cambiar.
- **DIP:** `OrqDatosController` depende de `ProcessingStrategy` (interfaz), no de `BatchStrategy` (implementación).

---

## 4. MS1-POS y MS2-Online — Patrón Singleton

### Categoría GoF
Creacional.

### Descripción de los microservicios

El sistema cuenta con **dos microservicios de datos en memoria**, cada uno con su propio dominio y repositorio:

| Microservicio | Puerto | Dominio | Endpoint entrada | Endpoint consulta |
|---|---|---|---|---|
| `ms1-pos` | 8081 | Ventas en tienda física | `POST /api/pos/simulate-mq` | `GET /api/pos/data` |
| `ms2-online` | 8083 | Ventas canal online | `POST /api/online/venta` | `GET /api/online/ventas` |

Ambos microservicios tienen la **misma responsabilidad**: recibir datos, validarlos, limpiarlos y almacenarlos. No aplican filtros ni lógica de negocio — esa responsabilidad recae en el orq-datos.

### El Problema sin el Patrón

Cada solicitud concurrente crea una nueva instancia del repositorio, generando múltiples listas independientes y pérdida de datos:

```java
// CÓDIGO FRÁGIL sin Singleton:
class VentaRepository {
  public void save(Venta v) {
    List<Venta> db = new ArrayList<>();  // Nueva lista en cada llamada
    db.add(v);
    // → Con 100 solicitudes concurrentes = 100 listas separadas
    // → GET /ventas devuelve 0 registros porque cada lista es local
  }
}
```

### La Solución con Singleton (Holder Pattern)

Ambos microservicios implementan el mismo patrón — ejemplo de MS1:

```java
// PATRÓN SINGLETON — Holder Pattern: thread-safe sin synchronized
@Repository
public class PosTransactionRepository {

    protected PosTransactionRepository() {}  // Constructor protegido

    private static class DatabaseHolder {
        // La JVM garantiza que esta inicialización es atómica
        static final List<PosTransaction> INSTANCE = new CopyOnWriteArrayList<>();
    }

    public static List<PosTransaction> getDatabase() {
        return DatabaseHolder.INSTANCE;   // Siempre la misma lista
    }

    public PosTransaction save(PosTransaction transaction) {
        if (transaction.getId() == null) {
            transaction.setId((long) (getDatabase().size() + 1));
        }
        getDatabase().add(transaction);
        return transaction;
    }

    public List<PosTransaction> findAll() {
        return new ArrayList<>(getDatabase());
    }
}
```

MS2 implementa el mismo patrón en `OnlineVentaRepository` con `CopyOnWriteArrayList<OnlineVenta>`, agregando además `findUltimosDias(int dias)` para filtrar ventas recientes.

### Por qué el Holder Pattern es superior a otras implementaciones

| Implementación | Thread-safe | Lazy init | Overhead |
|---|---|---|---|
| Campo estático simple | No (race condition) | No | Ninguno |
| `synchronized getInstance()` | Sí | Sí | Alto (lock en cada llamada) |
| Double-checked locking | Sí (con `volatile`) | Sí | Bajo (lock solo primera vez) |
| **Holder Pattern** (elegido) | **Sí (por la JVM)** | **Sí** | **Ninguno** |

`CopyOnWriteArrayList` se elige sobre `ArrayList` porque permite lecturas concurrentes sin bloqueo, apropiado para un GET que puede ejecutarse mientras el simulador escribe.

### Contraste intencional con MS3/MS4/MS5

| Aspecto | MS1 / MS2 (Singleton) | MS3 / MS4 / MS5 (JPA + H2) |
|---|---|---|
| Persistencia | En memoria; se pierde al reiniciar | En archivo; sobrevive reinicios |
| Patrón de acceso | `getDatabase()` estático | `JpaRepository<T, Long>` |
| Thread safety | `CopyOnWriteArrayList` | Garantizada por JPA/Hibernate |
| Uso | Datos transaccionales "hot" (simulados en cada ciclo) | Datos operacionales que deben persistir |

Ambos enfoques coexisten en el mismo sistema para demostrar que la persistencia puede resolverse con distintas estrategias según los requisitos del dominio.

### Relación con el Singleton de Spring IoC

Spring Boot ya gestiona `PosTransactionRepository`/`OnlineVentaRepository` como beans Singleton por defecto mediante `@Scope("singleton")` — eso no se descarta ni se reemplaza. Lo que añade el Holder Pattern es una garantía **adicional e independiente del framework**: la lista compartida (`DatabaseHolder.INSTANCE`) sigue siendo única incluso si alguna vez se instanciara la clase repositorio más de una vez fuera del contenedor de Spring (por ejemplo, en un test que haga `new PosTransactionRepository()`). El constructor es `protected` — no `private` — por lo que no bloquea la instanciación externa como exige el Singleton GoF clásico; la unicidad real recae sobre el campo estático, no sobre la clase. Se incluye igual como ejercicio del patrón de diseño Creacional para la evaluación, dejando explícito que en este proyecto ambos mecanismos (bean Spring + Holder estático) coexisten.

### Principios SOLID Aplicados

- **SRP:** El repositorio tiene una única responsabilidad: garantizar la lista compartida.
- **Separación de dominios:** MS1 y MS2 tienen repositorios Singleton independientes. El orq los consulta en paralelo y consolida, evitando que un dominio afecte al otro.

---

## 5. Persistencia — JPA + H2 en MS3, MS4 y MS5

### Categoría GoF
No es un patrón GoF de comportamiento, sino una decisión de arquitectura de persistencia. Se documenta aquí por su importancia técnica en ET.

### La Solución con JPA Repository

MS3, MS4 y MS5 usan Spring Data JPA con H2 en modo archivo. Cada entidad tiene `@Entity`, `@Table`, `@Id` y `@GeneratedValue(IDENTITY)`. Los repositorios extienden `JpaRepository<T, Long>`, que provee `save()`, `findAll()`, `findById()`, `count()` y métodos derivados **sin código adicional**:

```java
@Repository
public interface InventarioRepository extends JpaRepository<ItemInventario, Long> {
    List<ItemInventario> findBySucursal(String sucursal);
    List<ItemInventario> findByCategoria(String categoria);
    List<ItemInventario> findBySucursalAndCategoria(String sucursal, String categoria);
}
```

Spring Data deriva el SQL de los nombres de los métodos en tiempo de arranque. No hay SQL escrito a mano.

**Configuración H2 en archivo (ejemplo MS3):**
```properties
spring.datasource.url=jdbc:h2:file:/data/bd-inventario;DB_CLOSE_DELAY=-1;AUTO_RECONNECT=TRUE
spring.jpa.hibernate.ddl-auto=update
spring.h2.console.enabled=true
```

`DB_CLOSE_DELAY=-1` mantiene la BD abierta mientras la JVM esté viva. `ddl-auto=update` crea tablas si no existen y agrega columnas nuevas sin borrar datos.

**Validación en controladores antes de llamar al repositorio:**
```java
// Si falta item_id → 400 BAD_REQUEST, sin tocar la BD
if (!payload.containsKey("item_id") || payload.get("item_id") == null) {
    return ResponseEntity.badRequest().body(Map.of("error", "item_id es requerido"));
}
// Solo si pasa validación → repo.save(entity)
```

Los volúmenes Docker nombrados (`inventario-data`, `empleados-data`, `reportes-data`) garantizan que los datos persisten aunque el contenedor se elimine con `docker-compose down`. Solo `docker-compose down -v` los borra.

---

## 6. Tests Unitarios

### JavaScript — Jest (frontend-app)

3 archivos de test, 68 casos, cobertura 86.71% statements / 69.86% branches:

| Archivo | Casos | Qué verifica |
|---|---|---|
| `ApiServiceFactory.test.js` | 29 | Patrón Factory Method: 10 tipos de servicio vía `test.each`, configuración de entornos, extensibilidad con `register()`, errores por tipo/entorno desconocido, métodos `get()`/`post()` de `DataService`, derived-queries de `VentasService` e `IndicadoresService` |
| `DataService.test.js` | 19 | Patrón Facade: delegación correcta a cada service, manejo de errores HTTP (401, 500) y errores de red |
| `DataDisplay.test.js` | 20 | Consumidor del Facade: estados loading/error/data/empty, render por dominio, sanitización XSS |

**Patrón de test con mockFetch:**
```javascript
const mockFetch = jest.fn();
const facade = new DataFacade('test', mockFetch);

test('getVentas retorna datos correctamente', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] });
    const result = await facade.getVentas();
    expect(result).toHaveLength(1);
});
```

El parámetro `fetcher` del constructor de `DataFacade` reemplaza el `fetch` real por el mock, sin modificar la clase de servicio. Esto valida el patrón Factory Method en acción: `overrides = { fetcher: mockFetch }`.

El Dockerfile tiene un stage `test` que ejecuta los tests durante el build:
```dockerfile
FROM node:18-alpine AS test
RUN npm test           # ← si falla, el build entero falla

FROM node:18-alpine AS production
RUN npm install --production   # sin devDependencies (jest, etc.)
```

### Java — JUnit 5 + Mockito

4 archivos de test, 23 casos:

| Clase test | Casos | Qué verifica |
|---|---|---|
| `InventarioControllerTest` | 6 | `listarItems()`, `recibirItem()` (válido, sin itemId, sin nombre, sin sucursal), `health()` |
| `EmpleadoControllerTest` | 6 | `listarRegistros()`, `recibirRegistro()` (válido, sin empleadoId, sin turno, horas > 24), `health()` |
| `ReporteControllerTest` | 6 | `listarEventos()`, `recibirEvento()` (válido, sin reporteId, sin tipo, monto negativo), `health()` |
| `AuthControllerTest` | 5 | `login()` (válido/inválido), `validate()` (token válido/inválido), `health()` |

**Patrón de test — sin contexto Spring:**
```java
@ExtendWith(MockitoExtension.class)
class InventarioControllerTest {
    @Mock   InventarioRepository repo;
    @InjectMocks InventarioController controller;

    @Test void listarItems_retornaListaCompleta() {
        when(repo.findAll()).thenReturn(Arrays.asList(item1, item2));
        ResponseEntity<List<ItemInventario>> response = controller.listarItems();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
        verify(repo, times(1)).findAll();
    }

    @Test void recibirItem_sinItemId_retorna400() {
        // No hay stub de repo.save() porque no debe llamarse
        ResponseEntity<?> response = controller.recibirItem(payloadSinItemId);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any());  // ← confirma que la validación funcionó
    }
}
```

`@ExtendWith(MockitoExtension.class)` activa Mockito sin levantar Spring context → tests rápidos, sin BD, sin red. `verify(repo, never()).save(any())` confirma que los datos inválidos nunca llegan a la BD.

---

## Tabla Resumen

| Componente | Patrón | Categoría GoF | Problema del Cliente | Principios SOLID | Alternativa Descartada |
|---|---|---|---|---|---|
| `frontend-app` | Factory Method | Creacional | Instanciar clientes HTTP por entorno sin acoplamiento | OCP, DIP, SRP | Abstract Factory (YAGNI) |
| `frontend-app` (browser) | Facade | Estructural | Ocultar URLs, headers y manejo de errores HTTP a los módulos | SRP, DIP | — |
| `bff-service` | Proxy | Estructural | Centralizar seguridad y auditoría sin contaminar el Controller | SRP, OCP, LSP, DIP | Decorator (no controla acceso) |
| `orq-datos` | Strategy | Comportamiento | Intercambiar algoritmos de procesamiento en runtime | OCP, SRP, DIP | Template Method (herencia estática) |
| `ms1-pos` | Singleton | Creacional | Única lista thread-safe de ventas POS compartida entre todos los threads | SRP | Spring IoC (acoplamiento al framework) |
| `ms2-online` | Singleton | Creacional | Única lista thread-safe de ventas online, dominio separado de MS1 | SRP | Spring IoC (acoplamiento al framework) |
| `ms3/ms4/ms5` | JPA Repository | Arquitectura | Persistencia real entre reinicios sin contenedores adicionales | SRP | JDBC directo (boilerplate excesivo) |

---

## Preguntas Frecuentes en Defensa Oral

**¿Por qué Factory Method y no simplemente un objeto de configuración?**
Un objeto de configuración resuelve el problema de los valores, pero no el de la creación. Factory Method encapsula tanto la configuración como la instanciación, permite polimorfismo en runtime y está abierto a extensión (`register()`) sin modificar el código existente.

**¿Por qué Proxy y no Decorator en el BFF?**
La distinción clave es el propósito: Proxy controla **acceso** (quién puede llamar al servicio real y bajo qué condiciones), Decorator añade **funcionalidad visible al cliente**. Nuestro BFF necesita proteger el acceso al orq-datos → Proxy. Si necesitáramos comprimir la respuesta para el frontend, sería Decorator.

**¿Por qué Strategy y no un simple `switch` en el orquestador?**
Un `switch` viola OCP: agregar un nuevo algoritmo requiere modificar el método. Strategy permite agregar nuevos algoritmos como clases independientes con `@Component("nombre")`. Además, Strategy permite cambiar el algoritmo **en runtime** por parámetro HTTP, algo imposible con un `switch` estático.

**¿Por qué Singleton con Holder Pattern y no `synchronized`?**
`synchronized getInstance()` adquiere un lock en **cada llamada**, incluso cuando la instancia ya existe (overhead innecesario bajo alta concurrencia). El Holder Pattern delega la thread-safety a la JVM (garantía de la especificación del lenguaje, JLS §12.4), con costo cero en el camino feliz.

**¿Por qué MS3/4/5 usan JPA/H2 y MS1/MS2 siguen con Singleton?**
Los dominios tienen requisitos distintos. MS1/MS2 almacenan ventas de simulación que se regeneran en cada ciclo — perder datos al reiniciar es aceptable. MS3/MS4/MS5 almacenan inventario, empleados y eventos financieros que deben sobrevivir a reinicios del contenedor. La coexistencia de ambos enfoques es intencional: demuestra que la persistencia se elige según los requisitos del dominio, no por convención uniforme.

**¿Cómo demuestran que el código funciona?**
Con tests unitarios: 68 casos JavaScript (Jest) y 23 casos Java (JUnit 5 + Mockito). El Dockerfile del frontend tiene un stage `test` que ejecuta los tests durante el build — si fallan, no se genera imagen. Los tests Java validan controladores sin levantar contexto Spring, usando mocks del repositorio.

---

## Arquetipos Maven

### Qué es un Arquetipo Maven

Un arquetipo Maven es una plantilla de proyecto que define la estructura de directorios, el `pom.xml` base y las dependencias iniciales. Cuando se genera un proyecto con `spring-boot-starter-parent` como parent POM, Maven hereda la gestión de dependencias, plugins y configuración de compilación de Spring Boot, garantizando coherencia entre todos los microservicios del sistema.

En este proyecto, los microservicios Spring Boot comparten el mismo parent POM base, lo que significa que las versiones de librerías (Jackson, Tomcat, JUnit, Mockito, etc.) están coordinadas centralmente por Spring Boot y no requieren gestión manual en cada servicio.

---

### Arquetipo base por microservicio

Todos los microservicios Spring Boot del proyecto heredan de `spring-boot-starter-parent`, pero con versiones y dependencias distintas según el rol de cada servicio:

#### MS1-pos — Spring Boot 3.3.0 / Java 21

**Dependencias clave:** spring-boot-starter-web, spring-boot-starter-validation, lombok

**Comando para generar un proyecto equivalente:**
```bash
mvn archetype:generate \
  -DgroupId=com.servicio1 -DartifactId=ms1-pos \
  -DarchetypeArtifactId=maven-archetype-quickstart -DarchetypeVersion=1.4 \
  -DinteractiveMode=false
```

#### MS2-online — Spring Boot 3.2.1 / Java 17

**Dependencias clave:** spring-boot-starter-web, lombok, spring-boot-starter-test

#### MS3/MS4/MS5 — Spring Boot 3.2.x / Java 17

**Dependencias clave:** spring-boot-starter-web, spring-boot-starter-data-jpa, h2, spring-boot-starter-test, mockito-core

#### bff-service — Spring Boot 3.2.1 / Java 17

**Dependencias clave:** spring-boot-starter-web, spring-boot-starter-test

#### ms-auth — Spring Boot 3.2.x / Java 17

**Dependencias clave:** spring-boot-starter-web, spring-boot-starter-data-jpa, h2, spring-boot-starter-test

#### frontend-app — Node.js (sin Maven)

El frontend no usa Maven sino NPM como gestor de dependencias:

```bash
npm init -y
npm install express
npm install --save-dev jest
```

---

### Por qué spring-boot-starter-parent garantiza coherencia y escalabilidad

**1. Gestión centralizada de versiones**

El parent POM de Spring Boot define las versiones de más de 300 dependencias comunes (Jackson, Tomcat, JUnit, Mockito, Log4j, etc.). Todos los microservicios que heredan de la misma versión obtienen exactamente las mismas versiones de librerías transitivas, eliminando el clásico "dependency hell".

```xml
<!-- No es necesario especificar versión — la hereda del parent -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

**2. Configuración de compilación estandarizada**

El parent configura automáticamente `maven-compiler-plugin`, `maven-surefire-plugin` (JUnit 5), `spring-boot-maven-plugin` (fat JAR) y encoding UTF-8. `mvn package` produce el mismo tipo de artefacto en todos los servicios.

**3. Actualizaciones coordinadas**

Cambiar la versión de Spring Boot en un microservicio es un cambio de una sola línea en el parent. Cuando se publica un CVE en una librería, actualizar el parent corrige las vulnerabilidades en todos los módulos.

**Tabla resumen de arquetipos por servicio:**

| Servicio | Base | Versión Spring Boot | Java | Dependencias adicionales |
|---|---|---|---|---|
| ms1-pos | spring-boot-starter-parent | 3.3.0 | 21 | AMQP, MySQL, Resilience4j, Lombok |
| ms2-online | spring-boot-starter-parent | 3.2.1 | 17 | Lombok |
| ms3/ms4/ms5 | spring-boot-starter-parent | 3.2.x | 17 | JPA, H2 |
| ms-auth | spring-boot-starter-parent | 3.2.x | 17 | JPA, H2 |
| orq-datos/ind/rep | spring-boot-starter-parent | 3.2.x | 17 | JPA, H2 |
| bff-service | spring-boot-starter-parent | 3.2.1 | 17 | — |
| frontend-app | npm (Node.js 18) | — | — | Express, Jest |

---

## Referencias

- Gamma, E., Helm, R., Johnson, R., Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software.* Addison-Wesley.
- Martin, R. C. (2003). *Agile Software Development: Principles, Patterns, and Practices.* Prentice Hall.
- Richardson, C. (2018). *Microservices Patterns.* Manning Publications.
- Bloch, J. (2018). *Effective Java, 3rd Edition.* Addison-Wesley. (Item 3: Singleton con Holder Pattern)
- OWASP. (2023). *Logging Cheat Sheet.* owasp.org/www-project-cheat-sheets
- Spring. (2024). *Spring Data JPA Reference Documentation.* docs.spring.io/spring-data/jpa/reference
- JUnit 5. (2024). *JUnit 5 User Guide.* junit.org/junit5/docs/current/user-guide
- Mockito. (2024). *Mockito Documentation.* javadoc.io/doc/org.mockito/mockito-core
- Apache Maven. (2024). *Maven Archetype Plugin.* maven.apache.org/archetype/maven-archetype-plugin
- Spring. (2024). *Spring Boot Starter Parent.* docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.build-systems.maven
