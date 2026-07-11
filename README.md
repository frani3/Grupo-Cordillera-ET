# Grupo Cordillera — Plataforma de Gestión Centralizada

**DSY1106 · Desarrollo Fullstack III — Evaluación Transversal**
Francisca Barrera · Ignacio Sorko · Patricio Zapata

---

## ¿Qué es este sistema?

Plataforma web para centralizar datos de las 30 sucursales de Grupo Cordillera, permitiendo a ejecutivos y analistas tomar decisiones con datos en tiempo real desde un dashboard unificado. Consolida ventas presenciales (POS), ventas online, inventario, registros de empleados y eventos financieros en una sola interfaz.

---

## Flujo de la arquitectura

```
Web (3000) → API Gateway nginx (80) → BFF (8080)
  → ORQ-DATOS (8082) → MS1-POS (8081) + MS2-ONLINE (8083)
  → ORQ-IND   (8092) → MS3-INVENTARIO (8084) + MS4-EMPLEADOS (8085)
  → ORQ-REP   (8093) → MS5-REPORTES (8086)
  → MS AUTH   (8090) ← validación de tokens
```

---

## Levantar el sistema

```bash
docker compose up -d --build
```

---

## Acceso

```
http://localhost:3000
```

Usuarios disponibles:
- `admin` / `admin123`
- `usuario` / `user123`

---

## Ejecutar simuladores

```powershell
# Todos a la vez
.\run-simuladores.ps1

# O individualmente
.\simulador-pos.ps1
.\simulador-online.ps1
.\simulador-inventario.ps1
.\simulador-empleados.ps1
.\simulador-reportes.ps1
```

---

## Ejecutar tests

```bash
docker build --target test --no-cache -t frontend-test frontend-app/
```

Los tests JavaScript (Jest) se ejecutan durante el stage `test` del Dockerfile. Si algún test falla, el build se detiene antes de generar la imagen de producción.

---

## Frontend — SPA

Interfaz web construida en **vanilla JS** (sin framework), servida por Express como archivos estáticos.

- **Sistema de diseño propio**: CSS Custom Properties con escala tipográfica (7 niveles), escala de espaciado (8 niveles) y 4 niveles de elevación. Sidebar claro con borde derecho, login sobre fondo gris claro.
- **Dashboard KPIs**: semáforos animados, umbrales configurables por contexto (global / sucursal), log de cambios persistido en `localStorage`. Auto-refresh cada 15 segundos.
- **Gráficos Chart.js 4.4.0**: barras horizontales (Ventas por Sucursal) y doughnut 72% cutout (Presencial vs Online), paleta alineada al token `--accent: #4f46e5`.
- **Responsive**: sidebar completo ≥900px, icon-only 900–600px, off-canvas con overlay <600px.
- **Módulos**: `App.Indicadores`, `App.Datos`, `App.Reportes`, `App.Usuarios`, `App.Facade`, `App.Auth`, `App.Router`.

---

## Documentación

| Archivo | Contenido |
|---|---|
| `ARQUITECTURA.md` | Mapa de servicios, puertos, guía de prueba y health checks |
| `ANALISIS.md` | Justificación técnica de los patrones de diseño GoF implementados |
| `DEFENSA.md` | Guía de defensa oral: flujo completo, preguntas difíciles con respuesta |
| `PERSISTENCIA.md` | Estrategia de persistencia: JPA+H2 vs Singleton en memoria |
| `PRUEBAS_UNITARIAS.md` | Informe de tests: 68 casos JS (Jest) + 23 casos Java (JUnit 5 + Mockito) |
| `INFORME_RETROSPECTIVO.md` | Informe retrospectivo grupal (pauta EFT126): arquitectura, decisiones técnicas, patrones, versionado, integración y pruebas |
