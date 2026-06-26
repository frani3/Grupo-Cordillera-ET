const express = require("express");
const { DataFacade } = require("../services/DataService");

const app = express();
const PORT = process.env.PORT || 3000;
// BFF_URL apunta al API Gateway en produccion Docker (puerto 80)
const GATEWAY_URL = process.env.BFF_URL || "http://api-gateway:80";

app.use(express.json());

function buildFacade(authToken) {
  const env = process.env.NODE_ENV === "production" ? "production" : "development";
  const authedFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: authToken || "" },
    });
  return new DataFacade(env, authedFetch);
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "frontend-app", port: PORT, gateway: GATEWAY_URL });
});

// POST /api/login — proxy al API Gateway → MS AUTH
app.post("/api/login", async (req, res) => {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/proxy/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Gateway no disponible: " + err.message });
  }
});

// GET /api/dashboard — agrega los 3 dominios via BFF /api/proxy/dashboard
app.get("/api/dashboard", async (req, res) => {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/proxy/dashboard`, {
      headers: { Authorization: req.headers.authorization || "" },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Gateway no disponible: " + err.message });
  }
});

// GET /api/user/:id
app.get("/api/user/:id", async (req, res) => {
  const facade = buildFacade(req.headers.authorization);
  try {
    const data = await facade.getUserData(req.params.id);
    res.json(data);
  } catch (err) {
    const status = err.message.includes("401") ? 401 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/indicadores — via BFF → ORQ-IND
app.get("/api/indicadores", async (req, res) => {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/proxy/indicadores`, {
      headers: { Authorization: req.headers.authorization || "" },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/reportes — via BFF → ORQ-REP
app.get("/api/reportes", async (req, res) => {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/proxy/reportes`, {
      headers: { Authorization: req.headers.authorization || "" },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Pagina principal con instrucciones del flujo completo
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Grupo Cordillera — Arquitectura Completa</title>
      <style>
        body { font-family: sans-serif; max-width: 960px; margin: 40px auto; padding: 0 20px; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre  { background: #f4f4f4; padding: 12px; border-radius: 5px; overflow-x: auto; }
        h2   { border-bottom: 2px solid #ddd; padding-bottom: 6px; }
        .tag { background: #0066cc; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; }
      </style>
    </head>
    <body>
      <h1>Web-Container — Grupo Cordillera</h1>
      <p>Puerto: <strong>${PORT}</strong> | Gateway: <strong>${GATEWAY_URL}</strong></p>

      <h2>Flujo de autenticacion</h2>
      <pre>
1. Obtener token:
   curl -X POST http://localhost:3000/api/login \\
        -H "Content-Type: application/json" \\
        -d '{"username":"admin","password":"admin123"}'

   Respuesta: { "token": "uuid-del-token", "username": "admin" }

2. Usar el token en las siguientes llamadas:
   export TOKEN="uuid-del-token"
      </pre>

      <h2>Endpoints del frontend <span class="tag">Web-Container → API Gateway → BFF</span></h2>
      <pre>
GET  /health                      — Estado del frontend
POST /api/login                   — Login (usuario/password) → MS AUTH
GET  /api/dashboard               — Dashboard completo (requiere Bearer token)
GET  /api/user/:id                — Datos de usuario (requiere Bearer token)
GET  /api/indicadores             — Indicadores operacionales (requiere Bearer token)
GET  /api/reportes                — Reportes financieros (requiere Bearer token)
      </pre>

      <h2>Ejemplo completo</h2>
      <pre>
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}' | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. Dashboard
curl http://localhost:3000/api/dashboard -H "Authorization: Bearer $TOKEN"

# 3. Indicadores
curl http://localhost:3000/api/indicadores -H "Authorization: Bearer $TOKEN"

# 4. Reportes
curl http://localhost:3000/api/reportes -H "Authorization: Bearer $TOKEN"
      </pre>

      <h2>Arquitectura de capas</h2>
      <pre>
SCRIPTS 1-5  →  MS1-MS5 (8081-8086)
                     ↓
         ORQ-DATOS (8082) → BD DATOS
         ORQ-IND   (8092) → BD IND
         ORQ-REP   (8093) → BD REP
                     ↓
              BFF (8080) ←→ MS AUTH (8090) → BD USUARIO
                     ↓
            API Gateway (80)
                     ↓
           Web-Container (3000)
      </pre>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`frontend-app escuchando en puerto ${PORT}`);
  console.log(`Gateway URL: ${GATEWAY_URL}`);
});

module.exports = app;
