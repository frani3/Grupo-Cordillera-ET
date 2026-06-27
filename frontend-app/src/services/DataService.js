// PATRÓN FACADE
// DataFacade es el "código cliente" del patrón Factory Method.
// Oculta la complejidad de múltiples ApiService detrás de una interfaz simple.

const { ApiServiceFactory } = require('./ApiServiceFactory');

class DataFacade {
  constructor(environment = 'production', fetcherOverride = null) {
    this.environment = environment;
    this.overrides   = fetcherOverride ? { fetcher: fetcherOverride } : {};
    // Servicios pre-instanciados para las operaciones más frecuentes
    this.dataService      = ApiServiceFactory.create('data',      environment, this.overrides);
    this.dashboardService = ApiServiceFactory.create('dashboard', environment, this.overrides);
    this.datosService     = ApiServiceFactory.create('datos',     environment, this.overrides);
  }

  // Compatibilidad con código existente
  async getUserData(userId) {
    return this.dataService.fetchData(`user-${userId}`);
  }

  async getDashboardData() {
    return this.dashboardService.fetchDashboard();
  }

  // Métodos por dominio — cada uno delega al producto concreto creado por Factory
  async getVentas() {
    return ApiServiceFactory.create('ventas', this.environment, this.overrides).fetchVentas();
  }

  async getIndicadores(id = 'frontend') {
    return ApiServiceFactory.create('indicadores', this.environment, this.overrides).fetchIndicadores(id);
  }

  async getReportes(id = 'frontend') {
    return ApiServiceFactory.create('reportes', this.environment, this.overrides).fetchReportes(id);
  }

  async getInventario() {
    return ApiServiceFactory.create('inventario', this.environment, this.overrides).fetchInventario();
  }

  async getEmpleados() {
    return ApiServiceFactory.create('empleados', this.environment, this.overrides).fetchEmpleados();
  }

  async getEventos() {
    return ApiServiceFactory.create('eventos', this.environment, this.overrides).fetchEventos();
  }
}

module.exports = { DataFacade };
