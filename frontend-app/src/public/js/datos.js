window.App = window.App || {};

App.Datos = (() => {
  const PAGE_SIZE  = 20;
  const SUCURSALES = ['norte', 'sur', 'centro', 'oriente', 'poniente'];

  const TABS = [
    { id: 'ventas',     label: 'Ventas'             },
    { id: 'inventario', label: 'Inventario'          },
    { id: 'empleados',  label: 'Empleados'           },
    { id: 'eventos',    label: 'Eventos Financieros' },
  ];

  const COLUMNS = {
    ventas: [
      { key: 'trx_id',     label: 'ID',        fmt: v => v ?? '—' },
      { key: 'canal',      label: 'Canal',      fmt: v => v ?? '—' },
      { key: 'sucursal',   label: 'Sucursal',   fmt: v => v ?? '—' },
      { key: 'montoTotal', label: 'Monto',      fmt: v => '$' + parseFloat(v || 0).toLocaleString('es-CL') },
      { key: 'fecha',      label: 'Fecha',      fmt: v => fmtDate(v) },
    ],
    inventario: [
      { key: 'itemId',        label: 'ID Item',    fmt: v => v ?? '—' },
      { key: 'nombre',        label: 'Nombre',     fmt: v => v ?? '—' },
      { key: 'categoria',     label: 'Categoría',  fmt: v => v ?? '—' },
      { key: 'cantidad',      label: 'Cantidad',   fmt: v => v ?? 0 },
      { key: 'precioUnitario',label: 'Precio',     fmt: v => '$' + parseFloat(v || 0).toLocaleString('es-CL') },
      { key: 'sucursal',      label: 'Sucursal',   fmt: v => v ?? '—' },
      { key: 'fecha',         label: 'Fecha',      fmt: v => fmtDate(v) },
    ],
    empleados: [
      { key: 'empleadoId',     label: 'ID Empleado', fmt: v => v ?? '—' },
      { key: 'nombre',         label: 'Nombre',      fmt: v => v ?? '—' },
      { key: 'sucursal',       label: 'Sucursal',    fmt: v => v ?? '—' },
      { key: 'turno',          label: 'Turno',       fmt: v => v ?? '—' },
      { key: 'horasTrabajadas',label: 'Horas',       fmt: v => parseFloat(v || 0).toFixed(1) },
      { key: 'fecha',          label: 'Fecha',       fmt: v => fmtDate(v) },
    ],
    eventos: [
      { key: 'reporteId',  label: 'ID',          fmt: v => v ?? '—' },
      { key: 'tipo',       label: 'Tipo',         fmt: v => v ?? '—' },
      { key: 'descripcion',label: 'Descripción',  fmt: v => v ?? '—' },
      { key: 'monto',      label: 'Monto',        fmt: v => '$' + parseFloat(v || 0).toLocaleString('es-CL') },
      { key: 'sucursal',   label: 'Sucursal',     fmt: v => v ?? '—' },
      { key: 'fecha',      label: 'Fecha',        fmt: v => fmtDate(v) },
    ],
  };

  // Mapeo tab → método App.Facade (Patrón Facade en browser)
  const FACADE_MAP = {
    ventas:     () => App.Facade.getVentas(),
    inventario: () => App.Facade.getInventario(),
    empleados:  () => App.Facade.getEmpleados(),
    eventos:    () => App.Facade.getEventos(),
  };

  let activeTab     = 'ventas';
  let allData       = [];
  let filteredData  = [];
  let currentPage   = 1;
  let container     = null;

  function fmtDate(v) {
    if (!v) return '—';
    try { return new Date(v).toLocaleDateString('es-CL'); } catch { return String(v); }
  }

  async function loadData(tab) {
    const fn = FACADE_MAP[tab];
    if (!fn) return [];
    try {
      const d = await fn();
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  }

  function isAnomaly(row, tab) {
    switch (tab) {
      case 'ventas':
        return parseFloat(row.montoTotal) === 0 || row.montoTotal === null || row.montoTotal === undefined;
      case 'inventario':
        return parseInt(row.cantidad) < 0 || !row.nombre || String(row.nombre).trim() === '';
      case 'empleados': {
        const h = parseFloat(row.horasTrabajadas);
        return h > 12 || h < 0 || isNaN(h);
      }
      case 'eventos':
        return parseFloat(row.monto) === 0 || row.monto === null || row.monto === undefined;
      default:
        return false;
    }
  }

  function filterControls(tab) {
    let extra = '';
    if (tab === 'ventas') {
      extra = `<select id="fc-canal">
        <option value="">Canal (todos)</option>
        <option>pos</option>
        <option>online</option>
      </select>`;
    } else if (tab === 'inventario') {
      extra = `<input type="text" id="fc-categoria" placeholder="Categoría…">`;
    } else if (tab === 'empleados') {
      extra = `<select id="fc-turno">
        <option value="">Turno (todos)</option>
        <option value="manana">Mañana</option>
        <option value="tarde">Tarde</option>
        <option value="noche">Noche</option>
      </select>`;
    } else if (tab === 'eventos') {
      extra = `<select id="fc-tipo">
        <option value="">Tipo (todos)</option>
        <option value="cierre-diario">Cierre diario</option>
        <option value="conciliacion">Conciliación</option>
        <option value="descuento">Descuento</option>
        <option value="devolucion">Devolución</option>
        <option value="bonificacion">Bonificación</option>
      </select>`;
    }
    return `
      <select id="fc-sucursal">
        <option value="">Sucursal (todas)</option>
        ${SUCURSALES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
      </select>
      <input type="date" id="fc-desde" title="Desde">
      <input type="date" id="fc-hasta" title="Hasta">
      ${extra}
      <button onclick="App.Datos.applyFilters()" class="btn btn-primary btn-sm">Filtrar</button>
      <button onclick="App.Datos.clearFilters()" class="btn btn-secondary btn-sm">Limpiar</button>
    `;
  }

  function applyFilters() {
    const suc   = document.getElementById('fc-sucursal')?.value || '';
    const desde = document.getElementById('fc-desde')?.value   || '';
    const hasta = document.getElementById('fc-hasta')?.value   || '';

    let result = allData.filter(r => {
      if (suc && r.sucursal !== suc) return false;
      if (desde || hasta) {
        const d = new Date(r.fecha);
        if (desde && d < new Date(desde)) return false;
        if (hasta && d > new Date(hasta + 'T23:59:59')) return false;
      }
      return true;
    });

    if (activeTab === 'ventas') {
      const c = document.getElementById('fc-canal')?.value;
      if (c) result = result.filter(r => r.canal === c);
    } else if (activeTab === 'inventario') {
      const cat = (document.getElementById('fc-categoria')?.value || '').toLowerCase();
      if (cat) result = result.filter(r => (r.categoria || '').toLowerCase().includes(cat));
    } else if (activeTab === 'empleados') {
      const t = document.getElementById('fc-turno')?.value;
      if (t) result = result.filter(r => r.turno === t);
    } else if (activeTab === 'eventos') {
      const t = document.getElementById('fc-tipo')?.value;
      if (t) result = result.filter(r => r.tipo === t);
    }

    return result;
  }

  function renderTable(data) {
    const cols  = COLUMNS[activeTab];
    const total = data.length;
    const pages = Math.ceil(total / PAGE_SIZE) || 1;
    const page  = Math.min(currentPage, pages);
    const start = (page - 1) * PAGE_SIZE;
    const rows  = data.slice(start, start + PAGE_SIZE);

    const tcEl = document.getElementById('table-container');
    const pgEl = document.getElementById('pagination');
    if (!tcEl) return;

    if (total === 0) {
      tcEl.innerHTML = `<div class="empty-state">
        <p>Sin datos disponibles</p>
        <small>Inicie los simuladores y haga clic en "Actualizar".</small>
      </div>`;
      if (pgEl) pgEl.innerHTML = '';
      return;
    }

    tcEl.innerHTML = `
      <div class="table-info">${total} registros — página ${page} de ${pages}</div>
      <div class="table-scroll">
        <table>
          <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `
              <tr class="${isAnomaly(row, activeTab) ? 'row-anomaly' : ''}">
                ${cols.map(c => `<td>${c.fmt(row[c.key])}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    if (pgEl) pgEl.innerHTML = buildPagination(page, pages);
  }

  function buildPagination(page, total) {
    if (total <= 1) return '';
    const nums = [];
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - page) <= 2) nums.push(p);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    const btns = nums.map(p => p === '…'
      ? '<span>…</span>'
      : `<button onclick="App.Datos.goPage(${p})" class="${p === page ? 'active' : ''}">${p}</button>`
    ).join('');
    return `<div class="pagination">
      <button onclick="App.Datos.goPage(${page-1})" ${page<=1?'disabled':''}>‹</button>
      ${btns}
      <button onclick="App.Datos.goPage(${page+1})" ${page>=total?'disabled':''}>›</button>
    </div>`;
  }

  function renderShell() {
    container.innerHTML = `
      <div class="page-header">
        <h2>Datos Crudos</h2>
        <button onclick="App.Datos.refresh()" class="btn btn-secondary">↻ Actualizar</button>
      </div>
      <div class="tabs" id="datos-tabs">
        ${TABS.map(t => `
          <button class="tab-btn ${t.id === activeTab ? 'active' : ''}"
            onclick="App.Datos.switchTab('${t.id}')">${t.label}</button>`).join('')}
      </div>
      <div class="filter-bar" id="filter-bar">${filterControls(activeTab)}</div>
      <div class="anomaly-legend"><span class="anomaly-dot"></span> Fila con anomalía detectada</div>
      <div id="table-container" class="table-container"><div class="loading">Cargando datos…</div></div>
      <div id="pagination"></div>
    `;
  }

  return {
    async init(cont) {
      container   = cont;
      activeTab   = 'ventas';
      currentPage = 1;
      renderShell();
      await this._load();
    },

    async _load() {
      document.getElementById('table-container').innerHTML = '<div class="loading">Cargando…</div>';
      allData       = await loadData(activeTab);
      filteredData  = [...allData];
      currentPage   = 1;
      renderTable(filteredData);
    },

    async switchTab(tab) {
      activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        const t = TABS.find(t => t.label === b.textContent);
        b.classList.toggle('active', t?.id === tab);
      });
      document.getElementById('filter-bar').innerHTML = filterControls(tab);
      await this._load();
    },

    applyFilters() {
      currentPage  = 1;
      filteredData = applyFilters();
      renderTable(filteredData);
    },

    clearFilters() {
      ['fc-sucursal','fc-desde','fc-hasta','fc-canal','fc-categoria','fc-turno','fc-tipo']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      currentPage  = 1;
      filteredData = [...allData];
      renderTable(filteredData);
    },

    goPage(p) {
      const total = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
      if (p < 1 || p > total) return;
      currentPage = p;
      renderTable(filteredData);
    },

    async refresh() { await this._load(); },
  };
})();
