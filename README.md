# Grupo Cordillera — Plataforma de Gestión Centralizada

**DSY1106 · Desarrollo Fullstack III — Evaluación 3**
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

## Documentación

| Archivo | Contenido |
|---|---|
| `ARQUITECTURA.md` | Mapa de servicios, puertos, guía de prueba y health checks |
| `ANALISIS.md` | Justificación técnica de los patrones de diseño GoF implementados |
| `DEFENSA.md` | Guía de defensa oral: flujo completo, preguntas difíciles con respuesta |
