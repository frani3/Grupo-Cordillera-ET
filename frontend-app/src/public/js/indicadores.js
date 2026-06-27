window.App = window.App || {};

App.Indicadores = (() => {
  const THRESHOLD_KEY = 'gc_kpi_thresholds';

  const DEFAULTS = {
    ventasTotales:  5000000,
    ticketPromedio:   50000,
    pctPresencial:       50,
    pctOnline:           30,
    itemsInventario:     50,
    promedioHoras:        5,
    montoEventos:  3000000,
  };

  const KPIS = [
    {
      id:      'ventasTotales',
      zone:    'main',
      label:   'Ventas Totales',
      format:  v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext: data => `${data.totalTransacciones} transacciones`,
    },
    {
      id:      'ticketPromedio',
      zone:    'main',
      label:   'Ticket Promedio',
      format:  v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext: () => 'Por transacción',
    },
    {
      id:         'pctPresencial',
      zone:       'main',
      label:      'Ventas Presenciales',
      format:     v => v + '%',
      subtext:    data => `${data.transaccionesTienda} transacciones en tienda`,
    },
    {
      id:         'pctOnline',
      zone:       'main',
      globalOnly: true,   // se oculta al filtrar por sucursal
      label:      'Ventas Online',
      format:     v => v + '%',
      subtext:    data => `${data.transaccionesOnline} transacciones online`,
    },
    {
      id:      'itemsInventario',
      zone:    'ops',
      label:   'Items en Inventario',
      format:  v => v.toLocaleString('es-CL'),
      subtext: data => data.stockCritico > 0
        ? `⚠ ${data.stockCritico} con stock crítico (<10 unidades)`
        : '✓ Sin stock crítico',
    },
    {
      id:      'promedioHoras',
      zone:    'ops',
      label:   'Horas Prom. por Empleado',
      format:  v => v.toFixed(1) + ' hrs',
      subtext: data => `${data.totalEventos} registros de turno`,
    },
    {
      id:      'montoEventos',
      zone:    'ops',
      label:   'Movimientos Financieros',
      format:  v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext: data => `${data.totalEventos} eventos (cierres, devoluciones, descuentos)`,
    },
  ];

  const SUCURSALES = [
    'Santiago Centro', 'Providencia', 'Las Condes', 'Maipu',
    'Pudahuel', 'Nunoa', 'Vitacura', 'La Florida', 'Quilicura', 'San Bernardo',
  ];

  let thresholds     = {};
  let currentValues  = {};
  let container      = null;
  let configTarget   = null;
  let refreshInterval = null;
  let rawData        = { ventas: [], inventario: [], empleados: [], eventos: [] };
  let sucursalFiltro = '';

  function loadThresholds() {
    try {
      const saved = JSON.parse(localStorage.getItem(THRESHOLD_KEY) || '{}');
      thresholds = { ...DEFAULTS, ...saved };
    } catch {
      thresholds = { ...DEFAULTS };
    }
  }

  function saveThresholds() {
    localStorage.setItem(THRESHOLD_KEY, JSON.stringify(thresholds));
  }

  async function fetchAllRaw() {
    const [ventasRes, invRes, empRes, evtRes] = await Promise.allSettled([
      App.Facade.getVentas(),
      App.Facade.getInventario(),
      App.Facade.getEmpleados(),
      App.Facade.getEventos(),
    ]);

    return {
      ventas:     ventasRes.status === 'fulfilled' && Array.isArray(ventasRes.value) ? ventasRes.value : [],
      inventario: invRes.status    === 'fulfilled' && Array.isArray(invRes.value)    ? invRes.value    : [],
      empleados:  empRes.status    === 'fulfilled' && Array.isArray(empRes.value)    ? empRes.value    : [],
      eventos:    evtRes.status    === 'fulfilled' && Array.isArray(evtRes.value)    ? evtRes.value    : [],
    };
  }

  function computeValues(data, sucursal) {
    const v  = sucursal ? data.ventas.filter(r => r.sucursal === sucursal)     : data.ventas;
    const i  = sucursal ? data.inventario.filter(r => r.sucursal === sucursal) : data.inventario;
    const e  = sucursal ? data.empleados.filter(r => r.sucursal === sucursal)  : data.empleados;
    const ev = sucursal ? data.eventos.filter(r => r.sucursal === sucursal)    : data.eventos;

    const ventasTotales       = v.reduce((s, r) => s + (parseFloat(r.montoTotal) || 0), 0);
    const transaccionesOnline = v.filter(r => r.canal === 'Online').length;
    const transaccionesTienda = v.filter(r => r.canal === 'Tienda Física').length;
    const totalTransacciones  = v.length;
    const ticketPromedio      = totalTransacciones > 0 ? ventasTotales / totalTransacciones : 0;
    const itemsInventario     = i.length;
    const stockCritico        = i.filter(r => (parseInt(r.cantidad) || 0) < 10).length;
    const totalHoras          = e.reduce((s, r) => s + (parseFloat(r.horasTrabajadas) || 0), 0);
    const promedioHoras       = e.length > 0 ? totalHoras / e.length : 0;
    const montoEventos        = ev.reduce((s, r) => s + (parseFloat(r.monto) || 0), 0);
    const totalEventos        = ev.length;
    const pctOnline           = totalTransacciones > 0
      ? Math.round((transaccionesOnline / totalTransacciones) * 100) : 0;
    const pctPresencial       = totalTransacciones > 0
      ? Math.round((transaccionesTienda / totalTransacciones) * 100) : 0;

    return {
      ventasTotales,
      totalTransacciones,
      ticketPromedio,
      transaccionesOnline,
      transaccionesTienda,
      itemsInventario,
      stockCritico,
      promedioHoras,
      montoEventos,
      totalEventos,
      pctOnline,
      pctPresencial,
    };
  }

  function canConfigure() {
    const role = App.Auth.getSession()?.role;
    return role === 'analista' || role === 'admin';
  }

  function formatThreshold(id) {
    const v = thresholds[id];
    if (id === 'ventasTotales' || id === 'ticketPromedio' || id === 'montoEventos') {
      return '$' + Math.round(v).toLocaleString('es-CL');
    }
    if (id === 'pctOnline' || id === 'pctPresencial') return v + '%';
    if (id === 'promedioHoras') return v + ' hrs';
    return String(v);
  }

  function syncOnlineCardVisibility() {
    const card = document.getElementById('kpi-card-pctOnline');
    if (card) card.classList.toggle('hidden', !!sucursalFiltro);
  }

  function renderCard(k) {
    return `
      <div class="kpi-card" id="kpi-card-${k.id}">
        <div class="kpi-header">
          <span class="kpi-label">${k.label}</span>
          <span class="semaphore semaphore-loading" id="sem-${k.id}" title="Calculando..."></span>
        </div>
        <div class="kpi-value" id="val-${k.id}">—</div>
        <div class="kpi-sub" id="sub-${k.id}" style="font-size:0.78rem;color:#666;margin:2px 0 6px 0;">—</div>
        <div class="kpi-footer">
          <span class="kpi-threshold" id="thr-${k.id}">Umbral: ${formatThreshold(k.id)}</span>
          ${canConfigure()
            ? `<button class="btn-config" onclick="App.Indicadores.openConfig('${k.id}')">Configurar</button>`
            : ''}
        </div>
      </div>`;
  }

  function renderShell() {
    const main = KPIS.filter(k => k.zone === 'main');
    const ops  = KPIS.filter(k => k.zone === 'ops');

    container.innerHTML = `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <h2>Panel de Indicadores</h2>
          <span id="kpi-sucursal-badge" class="sucursal-badge hidden"></span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <select id="kpi-sucursal" onchange="App.Indicadores.filterSucursal()">
            <option value="">Todas las sucursales</option>
            ${SUCURSALES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <button onclick="App.Indicadores.refresh()" class="btn btn-secondary">↻ Actualizar</button>
        </div>
      </div>
      <div class="kpi-section-title">Métricas de Venta</div>
      <div class="kpi-grid kpi-grid-main" id="kpi-grid-main">
        ${main.map(renderCard).join('')}
      </div>
      <div class="kpi-section-title kpi-section-ops">Métricas Operacionales</div>
      <div class="kpi-grid kpi-grid-ops" id="kpi-grid-ops">
        ${ops.map(renderCard).join('')}
      </div>
      <div id="kpi-ts" class="small text-muted"></div>
      <!-- Overlay de configuración -->
      <div id="config-overlay" class="config-overlay hidden" onclick="if(event.target===this)App.Indicadores.closeConfig()">
        <div class="config-box">
          <h3 id="config-title">Configurar umbral</h3>
          <label>Valor mínimo aceptable</label>
          <input type="number" id="config-input" min="0" step="1">
          <div class="config-actions">
            <button onclick="App.Indicadores.closeConfig()" class="btn btn-secondary btn-sm">Cancelar</button>
            <button onclick="App.Indicadores.saveConfig()" class="btn btn-primary btn-sm">Guardar</button>
          </div>
        </div>
      </div>
    `;
  }

  function applyValues(values) {
    currentValues = values;
    KPIS.forEach(k => {
      const val    = values[k.id] ?? 0;
      const ok     = val >= thresholds[k.id];
      const valEl  = document.getElementById(`val-${k.id}`);
      const subEl  = document.getElementById(`sub-${k.id}`);
      const semEl  = document.getElementById(`sem-${k.id}`);
      const cardEl = document.getElementById(`kpi-card-${k.id}`);
      if (valEl)  valEl.textContent = k.format(val);
      if (subEl && k.subtext) subEl.textContent = k.subtext(values);
      if (semEl) {
        semEl.className = `semaphore ${ok ? 'semaphore-green' : 'semaphore-red'}`;
        semEl.title     = ok ? 'OK — sobre umbral' : 'ALERTA — bajo umbral';
      }
      if (cardEl) {
        cardEl.classList.toggle('card-green', ok);
        cardEl.classList.toggle('card-red', !ok);
      }
    });
    const tsEl = document.getElementById('kpi-ts');
    if (tsEl) tsEl.textContent = 'Última actualización: ' + new Date().toLocaleTimeString('es-CL');
  }

  return {
    async init(cont) {
      container      = cont;
      sucursalFiltro = '';
      loadThresholds();
      renderShell();
      await this.refresh();
      refreshInterval = setInterval(() => App.Indicadores.refresh(), 15000);
    },

    destroy() {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    },

    async refresh() {
      try {
        rawData = await fetchAllRaw();
        applyValues(computeValues(rawData, sucursalFiltro));
      } catch (err) {
        console.error('Error indicadores:', err);
      }
    },

    filterSucursal() {
      sucursalFiltro = document.getElementById('kpi-sucursal')?.value || '';
      const badge = document.getElementById('kpi-sucursal-badge');
      if (badge) {
        if (sucursalFiltro) {
          badge.textContent = '📍 ' + sucursalFiltro;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
      syncOnlineCardVisibility();
      applyValues(computeValues(rawData, sucursalFiltro));
    },

    openConfig(kpiId) {
      if (!canConfigure()) return;
      configTarget = kpiId;
      const kpi = KPIS.find(k => k.id === kpiId);
      document.getElementById('config-title').textContent = 'Configurar: ' + kpi.label;
      document.getElementById('config-input').value = thresholds[kpiId];
      document.getElementById('config-overlay').classList.remove('hidden');
    },

    closeConfig() {
      document.getElementById('config-overlay').classList.add('hidden');
      configTarget = null;
    },

    saveConfig() {
      if (!configTarget) return;
      const raw = document.getElementById('config-input').value;
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) {
        alert('Ingrese un número válido (≥ 0).');
        return;
      }
      thresholds[configTarget] = val;
      saveThresholds();

      const thrEl = document.getElementById(`thr-${configTarget}`);
      if (thrEl) thrEl.textContent = 'Umbral: ' + formatThreshold(configTarget);

      applyValues(currentValues);
      this.closeConfig();
    },
  };
})();
