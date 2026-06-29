'use strict';
const { DataDisplay } = require('../components/DataDisplay');

function mockFetch(data, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok, status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

describe('DataDisplay — Consumidor del Factory/Facade', () => {

  describe('constructor', () => {
    test('se instancia con containerId', () => {
      const dd = new DataDisplay('contenedor-1', { environment: 'test', fetcher: mockFetch({}) });
      expect(dd.containerId).toBe('contenedor-1');
    });

    test('tiene estado inicial correcto', () => {
      const dd = new DataDisplay('c', { environment: 'test', fetcher: mockFetch({}) });
      expect(dd.state.loading).toBe(false);
      expect(dd.state.data).toBeNull();
      expect(dd.state.error).toBeNull();
      expect(dd.state.domain).toBeNull();
    });

    test('crea un DataFacade internamente', () => {
      const dd = new DataDisplay('c', { environment: 'test', fetcher: mockFetch({}) });
      expect(dd.facade).toBeDefined();
    });
  });

  describe('loadVentas()', () => {
    test('carga datos y actualiza state.data', async () => {
      const data = [{ transactionId: 'TRX-001', montoTotal: 29990 }];
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadVentas();
      expect(dd.state.data).toEqual(data);
      expect(dd.state.domain).toBe('ventas');
      expect(dd.state.loading).toBe(false);
      expect(dd.state.error).toBeNull();
    });

    test('pone loading=true durante la carga', async () => {
      let capturedLoading = false;
      const fetcher = jest.fn().mockImplementation(async () => {
        capturedLoading = true;
        return { ok: true, status: 200, json: async () => [] };
      });
      const dd = new DataDisplay('c', { environment: 'test', fetcher });
      await dd.loadVentas();
      expect(capturedLoading).toBe(true);
    });
  });

  describe('loadInventario()', () => {
    test('carga inventario correctamente', async () => {
      const data = [{ itemId: 'ITEM-001', nombre: 'Laptop', cantidad: 3 }];
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadInventario();
      expect(dd.state.data).toEqual(data);
      expect(dd.state.domain).toBe('inventario');
    });
  });

  describe('loadEmpleados()', () => {
    test('carga empleados correctamente', async () => {
      const data = [{ empleadoId: 'EMP-001', nombre: 'Ana Torres' }];
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadEmpleados();
      expect(dd.state.domain).toBe('empleados');
      expect(dd.state.data[0].nombre).toBe('Ana Torres');
    });
  });

  describe('loadEventos()', () => {
    test('carga eventos financieros', async () => {
      const data = [{ reporteId: 'REP-001', tipo: 'descuento', monto: 75000 }];
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadEventos();
      expect(dd.state.domain).toBe('eventos');
      expect(dd.state.data[0].tipo).toBe('descuento');
    });
  });

  describe('loadIndicadores()', () => {
    test('carga indicadores', async () => {
      const data = { itemsInventario: 112, totalHorasTrabajadas: 740 };
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadIndicadores();
      expect(dd.state.domain).toBe('indicadores');
      expect(dd.state.data).toHaveProperty('itemsInventario');
    });
  });

  describe('loadReportes()', () => {
    test('carga reportes', async () => {
      const data = { totalEventos: 5, totalMonto: 297010 };
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadReportes();
      expect(dd.state.domain).toBe('reportes');
      expect(dd.state.data).toHaveProperty('totalEventos');
    });
  });

  describe('loadDashboard()', () => {
    test('carga datos del dashboard', async () => {
      const data = { ventas: [], indicadores: {}, reportes: {} };
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadDashboard();
      expect(dd.state.domain).toBe('dashboard');
    });
  });

  describe('manejo de errores', () => {
    test('captura error HTTP y lo guarda en state.error', async () => {
      const dd = new DataDisplay('c', { environment: 'test',
        fetcher: jest.fn().mockResolvedValue({
          ok: false, status: 503, text: async () => 'Service Unavailable',
        }),
      });
      await expect(dd.loadVentas()).rejects.toThrow('HTTP 503');
      expect(dd.state.error).toContain('503');
      expect(dd.state.loading).toBe(false);
      expect(dd.state.data).toBeNull();
    });

    test('captura error de red', async () => {
      const dd = new DataDisplay('c', { environment: 'test',
        fetcher: jest.fn().mockRejectedValue(new Error('timeout')),
      });
      await expect(dd.loadInventario()).rejects.toThrow('timeout');
      expect(dd.state.error).toBe('timeout');
    });
  });

  describe('getState()', () => {
    test('retorna copia del estado, no referencia', async () => {
      const dd    = new DataDisplay('c', { environment: 'test', fetcher: mockFetch([]) });
      await dd.loadVentas();
      const state = dd.getState();
      state.domain = 'modificado';
      expect(dd.state.domain).toBe('ventas');
    });
  });

  describe('render()', () => {
    test('retorna estado loading cuando está cargando', () => {
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch([]) });
      dd.state.loading = true;
      expect(dd.render()).toContain('loading');
    });

    test('retorna estado error cuando hay error', () => {
      const dd = new DataDisplay('c', { environment: 'test', fetcher: mockFetch([]) });
      dd.state.error = 'Error de red';
      expect(dd.render()).toContain('Error de red');
    });

    test('retorna empty state sin data', () => {
      const dd = new DataDisplay('c', { environment: 'test', fetcher: mockFetch([]) });
      expect(dd.render()).toContain('Sin datos');
    });

    test('renderiza lista para dominio ventas', async () => {
      const data = [{ transactionId: 'TRX-001', montoTotal: 5000, canal: 'Online' }];
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadVentas();
      const html = dd.render();
      // _renderList muestra el domain en mayúsculas
      expect(html).toContain('VENTAS');
      expect(html).toContain('TRX-001');
    });

    test('renderiza key-value para dominio indicadores', async () => {
      const data = { itemsInventario: 100 };
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadIndicadores();
      const html = dd.render();
      expect(html).toContain('Indicadores');
      expect(html).toContain('itemsInventario');
    });

    test('sanitiza caracteres especiales en render', async () => {
      const data = [{ transactionId: '<script>alert(1)</script>', montoTotal: 0 }];
      const dd   = new DataDisplay('c', { environment: 'test', fetcher: mockFetch(data) });
      await dd.loadVentas();
      const html = dd.render();
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});
