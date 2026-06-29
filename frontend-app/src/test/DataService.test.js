'use strict';
const { DataFacade } = require('../services/DataService');

function mockFetch(data, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok, status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

describe('DataFacade — Facade Pattern', () => {

  describe('constructor', () => {
    test('se instancia con entorno production por defecto', () => {
      const facade = new DataFacade('production', mockFetch({}));
      expect(facade).toBeDefined();
      expect(facade.environment).toBe('production');
    });

    test('acepta entorno test', () => {
      const facade = new DataFacade('test', mockFetch({}));
      expect(facade.environment).toBe('test');
    });

    test('almacena overrides del fetcher', () => {
      const fetcher = mockFetch({});
      const facade  = new DataFacade('test', fetcher);
      expect(facade.overrides).toEqual({ fetcher });
    });

    test('overrides vacíos si no se pasa fetcher', () => {
      const facade = new DataFacade('test', null);
      expect(facade.overrides).toEqual({});
    });
  });

  describe('getUserData()', () => {
    test('retorna datos del usuario', async () => {
      const data   = { userId: '1', name: 'admin' };
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getUserData('1');
      expect(result).toEqual(data);
    });

    test('llama al endpoint con el userId', async () => {
      const fetch  = mockFetch({ id: 'user-42' });
      const facade = new DataFacade('test', fetch);
      await facade.getUserData('42');
      const url = fetch.mock.calls[0][0];
      expect(url).toContain('42');
    });
  });

  describe('getDashboardData()', () => {
    test('retorna datos del dashboard', async () => {
      const data   = { ventas: [], indicadores: {}, reportes: {} };
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getDashboardData();
      expect(result).toHaveProperty('ventas');
      expect(result).toHaveProperty('indicadores');
      expect(result).toHaveProperty('reportes');
    });
  });

  describe('getVentas()', () => {
    test('retorna lista de ventas', async () => {
      const data   = [{ transactionId: 'TRX-001', montoTotal: 5000 }];
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getVentas();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('transactionId');
    });

    test('lanza error HTTP 401 si no autenticado', async () => {
      const facade = new DataFacade('test', jest.fn().mockResolvedValue({
        ok: false, status: 401, text: async () => 'Unauthorized',
      }));
      await expect(facade.getVentas()).rejects.toThrow('HTTP 401');
    });
  });

  describe('getInventario()', () => {
    test('retorna lista de items', async () => {
      const data   = [{ itemId: 'ITEM-001', nombre: 'Laptop', cantidad: 5 }];
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getInventario();
      expect(result[0]).toHaveProperty('itemId');
      expect(result[0]).toHaveProperty('nombre');
    });

    test('llama al endpoint correcto', async () => {
      const fetch  = mockFetch([]);
      const facade = new DataFacade('test', fetch);
      await facade.getInventario();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('inventario'),
        expect.anything()
      );
    });
  });

  describe('getEmpleados()', () => {
    test('retorna lista de empleados', async () => {
      const data   = [{ empleadoId: 'EMP-001', nombre: 'Ana Torres', turno: 'noche' }];
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getEmpleados();
      expect(result[0]).toHaveProperty('empleadoId');
      expect(result[0]).toHaveProperty('turno');
    });
  });

  describe('getEventos()', () => {
    test('retorna lista de eventos financieros', async () => {
      const data   = [{ reporteId: 'REP-001', tipo: 'descuento', monto: 50000 }];
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getEventos();
      expect(result[0]).toHaveProperty('tipo');
      expect(result[0]).toHaveProperty('monto');
    });
  });

  describe('getIndicadores()', () => {
    test('retorna datos de indicadores', async () => {
      const data   = { itemsInventario: 112, totalHorasTrabajadas: 740 };
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getIndicadores();
      expect(result).toHaveProperty('itemsInventario');
    });

    test('llama al endpoint con id', async () => {
      const fetch  = mockFetch({});
      const facade = new DataFacade('test', fetch);
      await facade.getIndicadores('test-id');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('indicadores'),
        expect.anything()
      );
    });
  });

  describe('getReportes()', () => {
    test('retorna datos de reportes', async () => {
      const data   = { totalEventos: 14, totalMonto: 5697044 };
      const facade = new DataFacade('test', mockFetch(data));
      const result = await facade.getReportes();
      expect(result).toHaveProperty('totalEventos');
    });
  });

  describe('manejo de errores', () => {
    test('propaga error HTTP 500', async () => {
      const facade = new DataFacade('test', jest.fn().mockResolvedValue({
        ok: false, status: 500, text: async () => 'Internal Server Error',
      }));
      await expect(facade.getVentas()).rejects.toThrow('HTTP 500');
    });

    test('propaga error de red', async () => {
      const facade = new DataFacade('test',
        jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      );
      await expect(facade.getVentas()).rejects.toThrow('ECONNREFUSED');
    });

    test('propaga error en getEmpleados', async () => {
      const facade = new DataFacade('test', jest.fn().mockResolvedValue({
        ok: false, status: 502, text: async () => 'Bad Gateway',
      }));
      await expect(facade.getEmpleados()).rejects.toThrow('HTTP 502');
    });
  });
});
