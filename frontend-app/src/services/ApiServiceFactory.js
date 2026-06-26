// PATRÓN FACTORY METHOD
// Centraliza la creación de clientes HTTP por tipo y entorno,
// desacoplando a los consumidores de URLs concretas.

class ApiService {
  constructor(config) {
    this.baseUrl  = config.baseUrl;
    this.timeout  = config.timeout;
    this.headers  = { 'Content-Type': 'application/json', ...(config.headers || {}) };
    this._fetcher = config.fetcher || globalThis.fetch?.bind(globalThis) || null;
  }

  async get(endpoint) {
    if (!this._fetcher) throw new Error('No hay implementación de fetch disponible.');
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await this._fetcher(`${this.baseUrl}${endpoint}`, {
        method:  'GET',
        headers: this.headers,
        signal:  controller.signal,
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      return res.json();
    } finally {
      clearTimeout(tid);
    }
  }

  async post(endpoint, body) {
    if (!this._fetcher) throw new Error('No hay implementación de fetch disponible.');
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await this._fetcher(`${this.baseUrl}${endpoint}`, {
        method:  'POST',
        headers: this.headers,
        body:    JSON.stringify(body),
        signal:  controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return res.json();
    } finally {
      clearTimeout(tid);
    }
  }
}

// ── Productos concretos ────────────────────────────────────────────────────────

class DataService extends ApiService {
  async fetchData(requestId = 'default') {
    return this.get(`/api/proxy/data?id=${encodeURIComponent(requestId)}`);
  }
}

class AuthService extends ApiService {
  async login(username, password) {
    return this.post('/api/proxy/login', { username, password });
  }
  async validateToken() {
    return this.get('/api/proxy/auth/validate');
  }
}

class DashboardService extends ApiService {
  async fetchDashboard() { return this.get('/api/proxy/dashboard'); }
  async fetchVentas()    { return this.get('/api/proxy/ventas'); }
  async fetchIndicadores() { return this.get('/api/proxy/indicadores'); }
  async fetchReportes()  { return this.get('/api/proxy/reportes'); }
}

class DatosService extends ApiService {
  async fetchInventario() { return this.get('/api/proxy/datos/inventario'); }
  async fetchEmpleados()  { return this.get('/api/proxy/datos/empleados'); }
  async fetchEventos()    { return this.get('/api/proxy/datos/eventos'); }
}

// ── Creator ────────────────────────────────────────────────────────────────────

class ApiServiceFactory {
  static get ENVIRONMENTS() {
    const gw = (typeof process !== 'undefined' && process.env.BFF_URL)
      ? process.env.BFF_URL : null;
    return {
      production:  { baseUrl: gw || 'http://api-gateway:80', timeout: 5000 },
      development: { baseUrl: gw || 'http://localhost:80',   timeout: 10000 },
      test:        { baseUrl: gw || 'http://localhost:8080', timeout: 1000 },
    };
  }

  static REGISTRY = {
    data:      DataService,
    auth:      AuthService,
    dashboard: DashboardService,
    datos:     DatosService,
  };

  static create(serviceType = 'data', environment = 'production', overrides = {}) {
    const envConfig = ApiServiceFactory.ENVIRONMENTS[environment];
    if (!envConfig) throw new Error(`Entorno desconocido: '${environment}'`);
    const Cls = ApiServiceFactory.REGISTRY[serviceType];
    if (!Cls) throw new Error(`Tipo desconocido: '${serviceType}'`);
    return new Cls({ ...envConfig, ...overrides });
  }

  static register(serviceType, ServiceClass) {
    if (typeof ServiceClass !== 'function') throw new TypeError('ServiceClass debe ser un constructor');
    ApiServiceFactory.REGISTRY[serviceType] = ServiceClass;
  }
}

module.exports = { ApiServiceFactory, ApiService, DataService, AuthService, DashboardService, DatosService };
