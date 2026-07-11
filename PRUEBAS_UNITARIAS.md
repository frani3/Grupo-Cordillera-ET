# Informe de Pruebas Unitarias — Grupo Cordillera ET
# DSY1106 Desarrollo Fullstack III

## Resumen ejecutivo

| Capa     | Framework          | Archivos | Tests | Cobertura Stmts | Cobertura Branch |
|----------|--------------------|----------|-------|-----------------|------------------|
| Frontend | Jest 29 (JS)       | 3        | 68    | 86.71%          | 69.86%           |
| Backend  | JUnit 5 + Mockito  | 4        | 23    | Unitario        | Unitario         |
| **Total**|                    | **7**    | **91**|                 |                  |

Cobertura mínima requerida: 60% ✅ — Cobertura alcanzada: 86.71%

---

## PARTE 1 — Tests JavaScript (Jest)

### Estructura de archivos
```
frontend-app/src/test/
  ApiServiceFactory.test.js  → 29 tests — Patrón Factory Method
  DataService.test.js        → 19 tests — Patrón Facade
  DataDisplay.test.js        → 20 tests — Consumidor del Facade
```

### Métricas de cobertura por archivo

| Archivo              | Statements | Branches | Functions | Lines  | Líneas no cubiertas |
|----------------------|-----------|----------|-----------|--------|---------------------|
| ApiServiceFactory.js | 81.03%    | 74.28%   | 62.5%     | 86.27% | 68, 75-83           |
| DataService.js       | 100%      | 66.66%   | 100%      | 100%   | 8                   |
| DataDisplay.js       | 89.09%    | 65.62%   | 92.85%    | 88.37% | 20, 68-72, 81       |
| **Total global**     |**86.71%** |**69.86%**|**81.96%** |**88.99%**|                  |

### ApiServiceFactory.test.js — 29 tests

Verifica el patrón **Factory Method**:

```javascript
// Ejemplo: verificar que la Factory crea el tipo correcto
test('create("ventas") retorna instancia de VentasService', () => {
  const svc = ApiServiceFactory.create('ventas', 'test', { fetcher: mockFetch([]) });
  expect(svc).toBeInstanceOf(VentasService);
  expect(svc).toBeInstanceOf(ApiService); // herencia correcta
});

// Ejemplo: verificar manejo de tipo desconocido
test('lanza error para tipo desconocido', () => {
  expect(() => ApiServiceFactory.create('inexistente', 'test'))
    .toThrow("Tipo desconocido: 'inexistente'");
});

// Ejemplo: override del fetcher para tests sin red real
test('override del fetcher se aplica', () => {
  const customFetch = mockFetch({ ok: true });
  const svc = ApiServiceFactory.create('data', 'test', { fetcher: customFetch });
  expect(svc._fetcher).toBe(customFetch);
});
```

Grupos de tests:
- `create()` resolución de 10 tipos (`test.each`)
- Configuración de entornos (production/development/test)
- `register()` para extensibilidad dinámica
- Métodos HTTP `get()` y `post()` con mock
- Endpoints correctos por servicio

### DataService.test.js — 19 tests

Verifica el patrón **Facade**:

```javascript
// Ejemplo: Facade delega correctamente a Factory
test('getInventario() llama endpoint correcto', async () => {
  const fetch  = mockFetch([]);
  const facade = new DataFacade('test', fetch);
  await facade.getInventario();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('inventario'),
    expect.anything()
  );
});

// Ejemplo: propagación de errores HTTP
test('propaga error HTTP 401', async () => {
  const facade = new DataFacade('test', jest.fn().mockResolvedValue({
    ok: false, status: 401, text: async () => 'Unauthorized'
  }));
  await expect(facade.getVentas()).rejects.toThrow('HTTP 401');
});
```

Grupos de tests:
- Constructor con distintos entornos
- Todos los métodos (getVentas, getInventario, getEmpleados, etc.)
- Errores HTTP 401, 500, 502
- Errores de red (ECONNREFUSED)

### DataDisplay.test.js — 20 tests

Verifica el consumidor del Facade:

```javascript
// Ejemplo: sanitización XSS
test('sanitiza caracteres especiales en render', async () => {
  const data = [{ transactionId: '<script>alert(1)</script>', montoTotal: 0 }];
  const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
  await dd.loadVentas();
  const html = dd.render();
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
});

// Ejemplo: getState() retorna copia, no referencia
test('getState() retorna copia del estado', async () => {
  const dd    = new DataDisplay('c', { environment: 'test', fetcher: mockFetch([]) });
  await dd.loadVentas();
  const state = dd.getState();
  state.domain = 'modificado';
  expect(dd.state.domain).toBe('ventas'); // no se modificó el original
});
```

Grupos de tests:
- Constructor e estado inicial
- Carga de datos por dominio (ventas, inventario, empleados, eventos)
- Render adaptativo según dominio
- Manejo de errores en carga
- Sanitización XSS con `_sanitize()`
- Inmutabilidad de `getState()`

### Resultado de ejecución

```
PASS src/test/ApiServiceFactory.test.js
PASS src/test/DataDisplay.test.js
PASS src/test/DataService.test.js

Test Suites: 3 passed, 3 total
Tests:       68 passed, 68 total
Time:        1.095 s
```

---

## PARTE 2 — Tests Java (JUnit 5 + Mockito)

### Estructura de archivos
```
ms-auth/src/test/java/com/evaluacion/msauth/
  AuthControllerTest.java           → 5 tests

ms3-inventario/src/test/java/com/evaluacion/ms3/
  InventarioControllerTest.java     → 6 tests

ms4-empleados/src/test/java/com/evaluacion/ms4/
  EmpleadoControllerTest.java       → 6 tests

ms5-reportes/src/test/java/com/evaluacion/ms5/
  ReporteControllerTest.java        → 6 tests
```

### Patrón de test usado: @Mock + @InjectMocks

```java
@ExtendWith(MockitoExtension.class)
class InventarioControllerTest {

    @Mock
    InventarioRepository repo;        // repositorio simulado (sin BD real)

    @InjectMocks
    InventarioController controller;  // controller real con repo mock inyectado

    @Test
    void recibirItem_sinItemId_retorna400() {
        // Arrange: payload sin campo obligatorio
        Map<String, Object> payload = new HashMap<>();
        payload.put("nombre",   "Laptop");
        payload.put("sucursal", "Las Condes");
        payload.put("cantidad", 5);
        // item_id falta intencionalmente

        // Act
        ResponseEntity<?> response = controller.recibirItem(payload);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(repo, never()).save(any()); // confirmar que NO se guardó
    }
}
```

### AuthControllerTest.java — 5 tests

| Test                                   | Verifica                           | HTTP esperado |
|----------------------------------------|------------------------------------|---------------|
| login_credencialesValidas_retornaToken | Login correcto devuelve token UUID | 200 OK        |
| login_credencialesInvalidas_retorna401 | Login incorrecto rechazado         | 401           |
| validate_tokenValido_retornaOk         | Token activo es aceptado           | 200 OK        |
| validate_tokenInvalido_retorna401      | Token inválido es rechazado        | 401           |
| health_retornaOk                       | Endpoint de salud responde         | 200 OK        |

### InventarioControllerTest.java — 6 tests

| Test                               | Verifica                        | HTTP esperado |
|------------------------------------|---------------------------------|---------------|
| getItems_retornaListaCompleta       | GET devuelve todos los ítems    | Lista         |
| getItems_listaVacia                | GET con BD vacía retorna []     | Lista vacía   |
| recibirItem_payloadValido          | POST válido guarda el ítem      | 200 OK        |
| recibirItem_sinItemId_retorna400    | POST sin item_id rechazado      | 400           |
| recibirItem_sinNombre_retorna400    | POST sin nombre rechazado       | 400           |
| health_retornaOk                   | Endpoint de salud responde      | 200 OK        |

### EmpleadoControllerTest.java — 6 tests

| Test                                  | Verifica                             | HTTP esperado |
|---------------------------------------|--------------------------------------|---------------|
| getRegistros_retornaListaCompleta      | GET devuelve todos los registros     | Lista         |
| getRegistros_listaVacia               | GET vacío retorna []                 | Lista vacía   |
| recibirRegistro_payloadValido         | POST válido guarda el registro       | 200 OK        |
| recibirRegistro_sinEmpleadoId         | POST sin empleado_id rechazado       | 400           |
| recibirRegistro_horasInvalidas        | POST con horas > 24 rechazado        | 400           |
| health_retornaOk                      | Endpoint de salud responde           | 200 OK        |

### ReporteControllerTest.java — 6 tests

| Test                               | Verifica                         | HTTP esperado |
|------------------------------------|----------------------------------|---------------|
| getEventos_retornaListaCompleta     | GET devuelve todos los eventos   | Lista         |
| getEventos_listaVacia              | GET vacío retorna []             | Lista vacía   |
| recibirEvento_payloadValido        | POST válido guarda el evento     | 200 OK        |
| recibirEvento_sinReporteId         | POST sin reporte_id rechazado    | 400           |
| recibirEvento_montoNegativo        | POST con monto < 0 rechazado     | 400           |
| health_retornaOk                   | Endpoint de salud responde       | 200 OK        |

---

## Relación entre patrones de diseño y calidad

| Patrón GoF  | Componente           | Beneficio para testing                              |
|-------------|----------------------|-----------------------------------------------------|
| Factory     | ApiServiceFactory.js | Inyección de mock-fetcher → tests sin red real      |
| Facade      | DataFacade           | Tests de alto nivel sin conocer implementación      |
| Proxy       | BFF ServiceProxy     | Seguridad centralizada → testeable de forma aislada |
| Singleton   | MS1/MS2 Repository   | Mock del repositorio reemplaza la lista en memoria  |
| Strategy    | ORQ-DATOS            | Cada estrategia es testeable independientemente     |

---

## Cómo ejecutar las pruebas

### JavaScript
```bash
# Con Docker (recomendado — gate automático):
docker build --target test --no-cache -t frontend-test frontend-app/

# Local:
cd frontend-app && npm install && npm test

# Generar reporte HTML:
cd frontend-app
npx jest --coverage --coverageReporters=html --coverageDirectory=coverage-report
# → abrir frontend-app/coverage-report/index.html
```

### Java
```bash
cd ms-auth        && mvn test
cd ms3-inventario && mvn test
cd ms4-empleados  && mvn test
cd ms5-reportes   && mvn test
```
