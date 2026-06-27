// PATRÓN FACADE — capa browser
// App.Facade oculta los detalles de fetch (URL, header Authorization)
// detrás de métodos de dominio. Los módulos JS llaman App.Facade.getVentas()
// sin saber cómo se construye la petición ni qué endpoint concreto se usa.

window.App = window.App || {};

App.Facade = (() => {
  function authHeader() {
    return { Authorization: 'Bearer ' + (App.Auth.getSession()?.token || '') };
  }

  async function apiFetch(endpoint) {
    const res = await fetch(endpoint, { headers: authHeader() });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${body ? ': ' + body : ''}`);
    }
    return res.json();
  }

  return {
    // KPIs y métricas agregadas (via ORQ-IND / ORQ-REP)
    getIndicadores: () => apiFetch('/api/indicadores'),
    getReportes:    () => apiFetch('/api/reportes'),

    // Datos transaccionales
    getVentas:     () => apiFetch('/api/ventas'),

    // Datos crudos de MS3 / MS4 / MS5
    getInventario: () => apiFetch('/api/datos/inventario'),
    getEmpleados:  () => apiFetch('/api/datos/empleados'),
    getEventos:    () => apiFetch('/api/datos/eventos'),
  };
})();
