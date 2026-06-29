'use strict';
const {
  ApiServiceFactory,
  ApiService,
  DataService,
  AuthService,
  DashboardService,
  DatosService,
  IndicadoresService,
  VentasService,
  ReportesService,
  InventarioService,
  EmpleadosService,
  EventosService,
} = require('../services/ApiServiceFactory');

function mockFetch(data, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json:  async () => data,
    text:  async () => JSON.stringify(data),
  });
}

function mockFetchError(msg = 'Network error') {
  return jest.fn().mockRejectedValue(new Error(msg));
}

describe('ApiServiceFactory — Factory Method', () => {

  describe('create() — resolución de tipos', () => {
    const types = [
      ['data',        DataService],
      ['auth',        AuthService],
      ['dashboard',   DashboardService],
      ['datos',       DatosService],
      ['indicadores', IndicadoresService],
      ['ventas',      VentasService],
      ['reportes',    ReportesService],
      ['inventario',  InventarioService],
      ['empleados',   EmpleadosService],
      ['eventos',     EventosService],
    ];

    test.each(types)('create("%s") retorna instancia de %s', (type, Cls) => {
      const svc = ApiServiceFactory.create(type, 'test', { fetcher: mockFetch({}) });
      expect(svc).toBeInstanceOf(Cls);
      expect(svc).toBeInstanceOf(ApiService);
    });

    test('lanza error para tipo desconocido', () => {
      expect(() => ApiServiceFactory.create('inexistente', 'test'))
        .toThrow("Tipo desconocido: 'inexistente'");
    });

    test('lanza error para entorno desconocido', () => {
      expect(() => ApiServiceFactory.create('data', 'staging'))
        .toThrow("Entorno desconocido: 'staging'");
    });
  });

  describe('create() — configuración de entornos', () => {
    test('production usa baseUrl del gateway', () => {
      const svc = ApiServiceFactory.create('data', 'production', { fetcher: mockFetch({}) });
      expect(svc.baseUrl).toBeTruthy();
    });

    test('development tiene timeout mayor que test', () => {
      const dev   = ApiServiceFactory.create('data', 'development', { fetcher: mockFetch({}) });
      const test_ = ApiServiceFactory.create('data', 'test',        { fetcher: mockFetch({}) });
      expect(dev.timeout).toBeGreaterThan(test_.timeout);
    });

    test('test tiene el timeout menor', () => {
      const svc = ApiServiceFactory.create('data', 'test', { fetcher: mockFetch({}) });
      expect(svc.timeout).toBe(1000);
    });

    test('overrides de fetcher se aplican correctamente', () => {
      const customFetch = mockFetch({ ok: true });
      const svc = ApiServiceFactory.create('data', 'test', { fetcher: customFetch });
      expect(svc._fetcher).toBe(customFetch);
    });
  });

  describe('register() — extensión dinámica', () => {
    test('permite registrar un servicio personalizado', () => {
      class CustomService extends ApiService {}
      ApiServiceFactory.register('custom', CustomService);
      const svc = ApiServiceFactory.create('custom', 'test', { fetcher: mockFetch({}) });
      expect(svc).toBeInstanceOf(CustomService);
      delete ApiServiceFactory.REGISTRY['custom'];
    });

    test('lanza TypeError si ServiceClass no es constructor', () => {
      expect(() => ApiServiceFactory.register('bad', 'no-es-clase'))
        .toThrow(TypeError);
    });
  });

  describe('ApiService — métodos HTTP', () => {
    test('get() llama al endpoint correcto con método GET', async () => {
      const fetch = mockFetch({ result: 'ok' });
      const svc   = ApiServiceFactory.create('ventas', 'test', { fetcher: fetch });
      await svc.fetchVentas();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/ventas'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('get() retorna el JSON de la respuesta', async () => {
      const data  = [{ id: 1, monto: 5000 }];
      const fetch = mockFetch(data);
      const svc   = ApiServiceFactory.create('ventas', 'test', { fetcher: fetch });
      const result = await svc.fetchVentas();
      expect(result).toEqual(data);
    });

    test('get() lanza error con código HTTP cuando !ok', async () => {
      const fetch = mockFetch(null, false, 401);
      const svc   = ApiServiceFactory.create('ventas', 'test', { fetcher: fetch });
      await expect(svc.fetchVentas()).rejects.toThrow('HTTP 401');
    });

    test('get() lanza error de red si fetch falla', async () => {
      const svc = ApiServiceFactory.create('ventas', 'test', { fetcher: mockFetchError() });
      await expect(svc.fetchVentas()).rejects.toThrow();
    });

    test('post() envía body serializado como JSON', async () => {
      const fetch = mockFetch({ token: 'abc' });
      const svc   = ApiServiceFactory.create('auth', 'test', { fetcher: fetch });
      await svc.login('admin', 'admin123');
      const callArgs = fetch.mock.calls[0][1];
      expect(callArgs.method).toBe('POST');
      expect(JSON.parse(callArgs.body)).toEqual({ username: 'admin', password: 'admin123' });
    });

    test('post() lanza error HTTP cuando !ok', async () => {
      const fetch = mockFetch(null, false, 403);
      const svc   = ApiServiceFactory.create('auth', 'test', { fetcher: fetch });
      await expect(svc.login('x', 'y')).rejects.toThrow('HTTP 403');
    });
  });

  describe('Servicios individuales — endpoints correctos', () => {
    const cases = [
      ['inventario', 'fetchInventario', '/api/proxy/datos/inventario'],
      ['empleados',  'fetchEmpleados',  '/api/proxy/datos/empleados'],
      ['eventos',    'fetchEventos',    '/api/proxy/datos/eventos'],
    ];

    test.each(cases)('%s llama a %s', async (type, method, path) => {
      const fetch = mockFetch([]);
      const svc   = ApiServiceFactory.create(type, 'test', { fetcher: fetch });
      await svc[method]();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(path),
        expect.anything()
      );
    });

    test('indicadores incluye id en la query string', async () => {
      const fetch = mockFetch({});
      const svc   = ApiServiceFactory.create('indicadores', 'test', { fetcher: fetch });
      await svc.fetchIndicadores('mi-id');
      const url = fetch.mock.calls[0][0];
      expect(url).toContain('mi-id');
    });

    test('reportes incluye id en la query string', async () => {
      const fetch = mockFetch({});
      const svc   = ApiServiceFactory.create('reportes', 'test', { fetcher: fetch });
      await svc.fetchReportes('rep-123');
      const url = fetch.mock.calls[0][0];
      expect(url).toContain('rep-123');
    });
  });
});
