# Frontend App — SPA
Puerto: **3000** | Tecnología: Node.js + Express

## Propósito
Single Page Application que consume el BFF a través del API Gateway.
Implementa los patrones **Factory Method** (ApiServiceFactory) y
**Facade** (DataFacade) en el lado del navegador.

## Instalación y ejecución
```bash
npm install
npm start
# → http://localhost:3000
```

## Variables de entorno
| Variable  | Valor en Docker            | Valor local                |
|-----------|----------------------------|----------------------------|
| `BFF_URL` | `http://api-gateway:80`    | `http://localhost:80`      |
| `PORT`    | `3000`                     | `3000`                     |

## Usuarios de acceso
| Usuario  | Contraseña | Rol      |
|----------|------------|----------|
| admin    | admin123   | Admin    |
| usuario  | user123    | Usuario  |

Roles disponibles: `admin`, `ejecutivo`, `analista`, `USER`

## Tests
```bash
# Ejecutar tests (Jest)
npm test

# Generar reporte HTML de cobertura
npx jest --coverage --coverageReporters=html --coverageDirectory=coverage-report
# → abrir frontend-app/coverage-report/index.html

# Vía Docker (gate automático — si fallan, el build falla)
docker build --target test --no-cache -t frontend-test .
```

## Cobertura de tests
| Métrica    | Valor  |
|------------|--------|
| Statements | 86.71% |
| Branches   | 69.86% |
| Functions  | 81.96% |
| Lines      | 88.99% |

## Patrones implementados
- **Factory Method** — `ApiServiceFactory`: crea clientes HTTP según
  el entorno (production/development/test) y el tipo de servicio.
- **Facade** — `DataFacade`: oculta URLs, headers y manejo de errores
  HTTP a los módulos de presentación (Datos, Indicadores, Usuarios).

## Ejecutar con Docker
```bash
docker compose up -d frontend-app
# → http://localhost:3000
```
