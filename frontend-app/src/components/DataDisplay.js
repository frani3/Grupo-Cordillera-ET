const { DataFacade } = require("../services/DataService");

// PATRÓN FACTORY METHOD: DataDisplay es el consumidor final.
// Recibe el entorno y delega la creación del servicio a DataFacade.
// DataDisplay no sabe qué implementación de fetch se usa ni qué
// URL concreta se llama — eso lo maneja la Factory internamente.
class DataDisplay {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.facade = new DataFacade(
      options.environment || "production",
      options.fetcher || null
    );
    this.state = { loading: false, data: null, error: null, domain: null };
  }

  // ── Métodos de carga por dominio ─────────────────────────────────────────

  async loadUserData(userId) {
    return this._load(() => this.facade.getUserData(userId), "user");
  }

  async loadDashboard(requestId = "default") {
    return this._load(() => this.facade.getDashboardData(requestId), "dashboard");
  }

  async loadVentas() {
    return this._load(() => this.facade.getVentas(), "ventas");
  }

  async loadInventario() {
    return this._load(() => this.facade.getInventario(), "inventario");
  }

  async loadEmpleados() {
    return this._load(() => this.facade.getEmpleados(), "empleados");
  }

  async loadEventos() {
    return this._load(() => this.facade.getEventos(), "eventos");
  }

  async loadIndicadores(id = "default") {
    return this._load(() => this.facade.getIndicadores(id), "indicadores");
  }

  async loadReportes(id = "default") {
    return this._load(() => this.facade.getReportes(id), "reportes");
  }

  // ── Render adaptativo según dominio ──────────────────────────────────────

  render() {
    const { loading, data, error, domain } = this.state;
    if (loading) return `<div class="data-display loading">Cargando datos...</div>`;
    if (error)   return `<div class="data-display error">Error: ${this._sanitize(error)}</div>`;
    if (!data)   return `<div class="data-display empty">Sin datos disponibles</div>`;

    switch (domain) {
      case "ventas":
      case "inventario":
      case "empleados":
      case "eventos":
        return this._renderList(data, domain);
      case "indicadores":
        return this._renderKeyValue(data, "Indicadores");
      case "reportes":
        return this._renderKeyValue(data, "Reportes");
      case "dashboard":
        return this._renderKeyValue(data, "Dashboard");
      default:
        return this._renderKeyValue(data, "Datos");
    }
  }

  // ── Helpers de render ─────────────────────────────────────────────────────

  _renderList(data, domain) {
    const items = Array.isArray(data) ? data : [];
    if (items.length === 0) {
      return `<div class="data-display empty">Sin registros de ${domain}.</div>`;
    }
    const keys = Object.keys(items[0]);
    return `
      <div class="data-display" id="${this._sanitize(this.containerId)}">
        <p><strong>${domain.toUpperCase()}</strong> — ${items.length} registros</p>
        <table border="1" cellpadding="4" cellspacing="0">
          <thead><tr>${keys.map(k => `<th>${this._sanitize(k)}</th>`).join("")}</tr></thead>
          <tbody>
            ${items.slice(0, 10).map(row =>
              `<tr>${keys.map(k => `<td>${this._sanitize(String(row[k] ?? ""))}</td>`).join("")}</tr>`
            ).join("")}
          </tbody>
        </table>
        ${items.length > 10 ? `<p>... y ${items.length - 10} registros más.</p>` : ""}
      </div>
    `.trim();
  }

  _renderKeyValue(data, label) {
    const entries = Object.entries(data || {});
    return `
      <div class="data-display" id="${this._sanitize(this.containerId)}">
        <p><strong>${this._sanitize(label)}</strong></p>
        <ul>
          ${entries.map(([k, v]) =>
            `<li><strong>${this._sanitize(k)}:</strong> ${this._sanitize(String(v))}</li>`
          ).join("")}
        </ul>
      </div>
    `.trim();
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  getState() {
    return { ...this.state };
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  async _load(fetcher, domain) {
    this._setState({ loading: true, error: null, domain });
    try {
      const data = await fetcher();
      this._setState({ loading: false, data });
      return data;
    } catch (error) {
      this._setState({ loading: false, error: error.message });
      throw error;
    }
  }

  _setState(partial) {
    this.state = { ...this.state, ...partial };
  }

  _sanitize(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

module.exports = { DataDisplay };
