window.App = window.App || {};

App.Indicadores = (() => {
  const THRESHOLD_KEY = 'gc_kpi_thresholds';

  const DEFAULTS = {
    ventasTotales:       50000,
    totalTransacciones:  10,
    itemsInventario:     20,
    horasTrabajadas:     100,
    eventosFinancieros:  5,
  };

  const KPIS = [
    {
      id:     'ventasTotales',
      label:  'Ventas Totales',
      format: v => '$' + Math.round(v).toLocaleString('es-CL'),
    },
    {
      id:     'totalTransacciones',
      label:  'Total Transacciones',
      format: v => v.toString(),
    },
    {
      id:     'itemsInventario',
      label:  'Items en Inventario',
      format: v => v.toString(),
    },
    {
      id:     'horasTrabajadas',
      label:  'Horas Trabajadas Totales',
      format: v => v.toFixed(1) + ' hrs',
    },
    {
      id:     'eventosFinancieros',
      label:  'Eventos Financieros',
      format: v => v.toString(),
    },
  ];

  let thresholds      = {};
  let currentValues   = {};
  let container       = null;
  let configTarget    = null;
  let refreshInterval = null;

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

  async function fetchData() {
    const [ventasRes, indRes, repRes] = await Promise.allSettled([
      App.Facade.getVentas(),
      App.Facade.getIndicadores(),
      App.Facade.getReportes(),
    ]);

    const ventas = ventasRes.status === 'fulfilled' && Array.isArray(ventasRes.value)
      ? ventasRes.value : [];
    const ind    = (indRes.status === 'fulfilled' && !indRes.value?.error)  ? indRes.value  : {};
    const rep    = (repRes.status === 'fulfilled' && !repRes.value?.error)  ? repRes.value  : {};

    return {
      ventasTotales:      ventas.reduce((s, v) => s + (parseFloat(v.montoTotal) || 0), 0),
      totalTransacciones: ventas.length,
      itemsInventario:    parseInt(ind.itemsInventario)       || 0,
      horasTrabajadas:    parseFloat(ind.totalHorasTrabajadas) || 0,
      eventosFinancieros: parseInt(rep.totalEventos)           || 0,
    };
  }

  function canConfigure() {
    const role = App.Auth.getSession()?.role;
    return role === 'analista' || role === 'admin';
  }

  function renderShell() {
    container.innerHTML = `
      <div class="page-header">
        <h2>Panel de Indicadores</h2>
        <button onclick="App.Indicadores.refresh()" class="btn btn-secondary">↻ Actualizar</button>
      </div>
      <div class="kpi-grid" id="kpi-grid">
        ${KPIS.map(k => `
          <div class="kpi-card" id="kpi-card-${k.id}">
            <div class="kpi-header">
              <span class="kpi-label">${k.label}</span>
              <span class="semaphore semaphore-loading" id="sem-${k.id}" title="Calculando..."></span>
            </div>
            <div class="kpi-value" id="val-${k.id}">—</div>
            <div class="kpi-footer">
              <span class="kpi-threshold" id="thr-${k.id}">Umbral: ${formatThreshold(k.id)}</span>
              ${canConfigure()
                ? `<button class="btn-config" onclick="App.Indicadores.openConfig('${k.id}')">Configurar</button>`
                : ''}
            </div>
          </div>
        `).join('')}
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

  function formatThreshold(id) {
    const v = thresholds[id];
    return id === 'ventasTotales' ? '$' + Math.round(v).toLocaleString('es-CL') : String(v);
  }

  function applyValues(values) {
    currentValues = values;
    KPIS.forEach(k => {
      const val   = values[k.id] ?? 0;
      const ok    = val >= thresholds[k.id];
      const valEl = document.getElementById(`val-${k.id}`);
      const semEl = document.getElementById(`sem-${k.id}`);
      const cardEl= document.getElementById(`kpi-card-${k.id}`);
      if (valEl)  valEl.textContent = k.format(val);
      if (semEl)  { semEl.className = `semaphore ${ok ? 'semaphore-green' : 'semaphore-red'}`; semEl.title = ok ? 'OK — sobre umbral' : 'ALERTA — bajo umbral'; }
      if (cardEl) { cardEl.classList.toggle('card-green', ok); cardEl.classList.toggle('card-red', !ok); }
    });
    const tsEl = document.getElementById('kpi-ts');
    if (tsEl) tsEl.textContent = 'Última actualización: ' + new Date().toLocaleTimeString('es-CL');
  }

  return {
    async init(cont) {
      container = cont;
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
        const values = await fetchData();
        applyValues(values);
      } catch (err) {
        console.error('Error indicadores:', err);
      }
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
