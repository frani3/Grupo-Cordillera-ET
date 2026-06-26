const express = require("express");
const path = require("path");
const { DataFacade } = require("../services/DataService");

const app = express();
const PORT = process.env.PORT || 3000;
const GATEWAY_URL = process.env.BFF_URL || "http://api-gateway:80";

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

function buildFacade(authToken) {
  const env = process.env.NODE_ENV === "production" ? "production" : "development";
  const authedFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: authToken || "" },
    });
  return new DataFacade(env, authedFetch);
}

function authHeaders(req) {
  return { Authorization: req.headers.authorization || "" };
}

async function proxyGet(gatewayPath, req, res) {
  try {
    const response = await fetch(`${GATEWAY_URL}${gatewayPath}`, {
      headers: authHeaders(req),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Gateway no disponible: " + err.message });
  }
}

// ── Rutas de la SPA ──────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "frontend-app", port: PORT, gateway: GATEWAY_URL });
});

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

app.get("/api/dashboard",    (req, res) => proxyGet("/api/proxy/dashboard",        req, res));
app.get("/api/ventas",       (req, res) => proxyGet("/api/proxy/ventas",           req, res));
app.get("/api/indicadores",  (req, res) => proxyGet("/api/proxy/indicadores",      req, res));
app.get("/api/reportes",     (req, res) => proxyGet("/api/proxy/reportes",         req, res));

// Datos crudos de MS3/4/5 a traves del BFF
app.get("/api/datos/inventario", (req, res) => proxyGet("/api/proxy/datos/inventario", req, res));
app.get("/api/datos/empleados",  (req, res) => proxyGet("/api/proxy/datos/empleados",  req, res));
app.get("/api/datos/eventos",    (req, res) => proxyGet("/api/proxy/datos/eventos",    req, res));

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

app.listen(PORT, () => {
  console.log(`frontend-app escuchando en puerto ${PORT}`);
  console.log(`Gateway URL: ${GATEWAY_URL}`);
});

module.exports = app;
