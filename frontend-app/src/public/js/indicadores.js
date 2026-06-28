window.App = window.App || {};

App.Indicadores = (() => {
  const THRESHOLD_KEY = 'gc_kpi_thresholds';

  const DEFAULTS = {
    ventasTotales:    5000000,
    ventasPresencial: 2500000,
    ventasOnline:     2500000,
    ticketPromedio:     50000,
    itemsInventario:       50,
    promedioHoras:          5,
    montoEventos:     3000000,
  };

  const KPIS = [
    // ── Zona main ──────────────────────────────────────────────────────────
    {
      id:      'ventasTotales',
      zone:    'main',
      label:   'Ventas Totales',
      format:  v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext: (data, sucursal) => sucursal
        ? `${data.totalTransacciones} transacciones en esta sucursal`
        : `${data.totalTransacciones} transacciones totales`,
    },
    {
      id:         'ventasPresencial',
      zone:       'main',
      globalOnly: true,
      label:      'Ventas Presenciales',
      format:     v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext:    data => `${data.transaccionesTienda} transacciones en tienda`,
    },
    {
      id:         'ventasOnline',
      zone:       'main',
      globalOnly: true,
      label:      'Ventas Online',
      format:     v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext:    data => `${data.transaccionesOnline} transacciones online`,
    },
    {
      id:           'ticketPromedio',
      zone:         'main',
      sucursalOnly: true,
      label:        'Ticket Promedio',
      format:       v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext:      () => 'Valor promedio por transacción',
    },

    // ── Zona ops ───────────────────────────────────────────────────────────
    {
      id:      'itemsInventario',
      zone:    'ops',
      label:   'Productos en Stock',
      format:  v => v.toLocaleString('es-CL'),
      subtext: data => data.stockCritico > 0
        ? `⚠ ${data.stockCritico} productos con stock crítico (menos de 10 unidades)`
        : '✓ Todos los productos sobre stock mínimo',
    },
    {
      id:      'promedioHoras',
      zone:    'ops',
      label:   'Horas Trabajadas Prom.',
      format:  v => v.toFixed(1) + ' hrs',
      subtext: data => `Promedio por empleado — ${data.totalEmpleados} registros de turno`,
    },
    {
      id:      'montoEventos',
      zone:    'ops',
      label:   'Ajustes Financieros',
      format:  v => '$' + Math.round(v).toLocaleString('es-CL'),
      subtext: data => `${data.totalEventos} movimientos — cierres, devoluciones y descuentos`,
    },
  ];

  const SUCURSALES = [
    'Santiago Centro', 'Providencia', 'Las Condes', 'Maipu',
    'Pudahuel', 'Nunoa', 'Vitacura', 'La Florida', 'Quilicura', 'San Bernardo',
  ];

  let thresholds      = {};
  let currentValues   = {};
  let container       = null;
  let configTarget    = null;
  let refreshInterval = null;
  let rawData         = { ventas: [], inventario: [], empleados: [], eventos: [] };
  let sucursalFiltro  = '';

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
    const ventasPresencial    = v
      .filter(r => r.canal === 'Tienda Física')
      .reduce((s, r) => s + (parseFloat(r.montoTotal) || 0), 0);
    const ventasOnline        = v
      .filter(r => r.canal === 'Online')
      .reduce((s, r) => s + (parseFloat(r.montoTotal) || 0), 0);
    const itemsInventario     = i.length;
    const stockCritico        = i.filter(r => (parseInt(r.cantidad) || 0) < 10).length;
    const totalEmpleados      = e.length;
    const totalHoras          = e.reduce((s, r) => s + (parseFloat(r.horasTrabajadas) || 0), 0);
    const promedioHoras       = totalEmpleados > 0 ? totalHoras / totalEmpleados : 0;
    const montoEventos        = ev.reduce((s, r) => s + (parseFloat(r.monto) || 0), 0);
    const totalEventos        = ev.length;

    return {
      ventasTotales,
      totalTransacciones,
      ticketPromedio,
      transaccionesOnline,
      transaccionesTienda,
      ventasPresencial,
      ventasOnline,
      itemsInventario,
      stockCritico,
      totalEmpleados,
      promedioHoras,
      montoEventos,
      totalEventos,
    };
  }

  function canConfigure() {
    const role = App.Auth.getSession()?.role;
    return role === 'analista' || role === 'admin';
  }

  function formatThreshold(id) {
    const v = thresholds[id];
    if (['ventasTotales','ticketPromedio','ventasPresencial','ventasOnline','montoEventos'].includes(id)) {
      return '$' + Math.round(v).toLocaleString('es-CL');
    }
    if (id === 'promedioHoras') return v + ' hrs';
    return String(v);
  }

  function updateKpiVisibility(sucursal) {
    KPIS.forEach(k => {
      const card = document.getElementById(`kpi-card-${k.id}`);
      if (!card) return;
      let visible = true;
      if (k.globalOnly   && sucursal)  visible = false;
      if (k.sucursalOnly && !sucursal) visible = false;
      card.classList.toggle('hidden', !visible);
    });
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
        <div class="kpi-title-group">
          <h2>Panel de Indicadores</h2>
          <div class="kpi-context-bar">
            <span class="kpi-context-label">Mostrando:</span>
            <select id="kpi-sucursal" onchange="App.Indicadores.filterSucursal()">
              <option value="">Todas las sucursales</option>
              ${SUCURSALES.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <button onclick="App.Indicadores.refresh()" class="btn btn-secondary">↻ Actualizar</button>
      </div>
      <div id="kpi-banner" class="kpi-banner kpi-banner-total">
        <span id="kpi-banner-text">📊 Vista consolidada — todas las sucursales</span>
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
      const ok     = val >= (thresholds[k.id] ?? 0);
      const valEl  = document.getElementById(`val-${k.id}`);
      const subEl  = document.getElementById(`sub-${k.id}`);
      const semEl  = document.getElementById(`sem-${k.id}`);
      const cardEl = document.getElementById(`kpi-card-${k.id}`);
      if (valEl) valEl.textContent = k.format(val);
      if (subEl && k.subtext) subEl.textContent = k.subtext(values, sucursalFiltro);
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
        updateKpiVisibility(sucursalFiltro);
      } catch (err) {
        console.error('Error indicadores:', err);
      }
    },

    filterSucursal() {
      sucursalFiltro = document.getElementById('kpi-sucursal')?.value || '';

      const sel = document.getElementById('kpi-sucursal');
      if (sel) sel.classList.toggle('sucursal-activa', !!sucursalFiltro);

      const banner     = document.getElementById('kpi-banner');
      const bannerText = document.getElementById('kpi-banner-text');
      if (banner && bannerText) {
        if (sucursalFiltro) {
          banner.className       = 'kpi-banner kpi-banner-sucursal';
          bannerText.textContent = '📍 Sucursal: ' + sucursalFiltro;
        } else {
          banner.className       = 'kpi-banner kpi-banner-total';
          bannerText.textContent = '📊 Vista consolidada — todas las sucursales';
        }
      }

      applyValues(computeValues(rawData, sucursalFiltro));
      updateKpiVisibility(sucursalFiltro);
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
