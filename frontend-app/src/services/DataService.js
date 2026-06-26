// PATRÓN FACADE
// DataFacade es el "código cliente" del patrón Factory Method.
// Oculta la complejidad de múltiples ApiService detrás de una interfaz simple.

const { ApiServiceFactory } = require('./ApiServiceFactory');

class DataFacade {
  constructor(environment = 'production', fetcherOverride = null) {
    const overrides = fetcherOverride ? { fetcher: fetcherOverride } : {};
    this.dataService      = ApiServiceFactory.create('data',      environment, overrides);
    this.dashboardService = ApiServiceFactory.create('dashboard', environment, overrides);
    this.datosService     = ApiServiceFactory.create('datos',     environment, overrides);
  }

  // Compatibilidad con código existente
  async getUserData(userId) {
    return this.dataService.fetchData(`user-${userId}`);
  }

  async getDashboardData() {
    return this.dashboardService.fetchDashboard();
  }

  // Métodos extendidos
  async getVentas()      { return this.dashboardService.fetchVentas(); }
  async getIndicadores() { return this.dashboardService.fetchIndicadores(); }
  async getReportes()    { return this.dashboardService.fetchReportes(); }
  async getInventario()  { return this.datosService.fetchInventario(); }
  async getEmpleados()   { return this.datosService.fetchEmpleados(); }
  async getEventos()     { return this.datosService.fetchEventos(); }
}

module.exports = { DataFacade };
