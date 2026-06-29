window.App = window.App || {};

App.Datos = (() => {
  const PAGE_SIZE  = 20;
  const SUCURSALES = [
    'Santiago Centro', 'Providencia', 'Las Condes', 'Maipu',
    'Pudahuel', 'Ñuñoa', 'Vitacura', 'La Florida', 'Quilicura', 'San Bernardo',
  ];

  const TABS = [
    { id: 'ventas',     label: 'Ventas'             },
    { id: 'inventario', label: 'Inventario'          },
    { id: 'empleados',  label: 'Empleados'           },
    { id: 'eventos',    label: 'Eventos Financieros' },
  ];

  const COLUMNS = {
    ventas: [
      { key: 'transactionId', label: 'ID',      fmt: v => v ?? '—' },
      { key: 'canal',      label: 'Canal',      fmt: v => v ?? '—' },
      { key: 'sucursal',   label: 'Sucursal',   fmt: v => v ?? '—' },
      { key: 'montoTotal', label: 'Monto',      fmt: v => '$' + parseFloat(v || 0).toLocaleString('es-CL') },
      { key: 'fecha',      label: 'Fecha',      fmt: v => fmtDate(v) },
    ],
    inventario: [
      { key: 'itemId',        label: 'ID Item',    fmt: v => v ?? '—' },
      { key: 'nombre',        label: 'Nombre',     fmt: v => v ?? '—' },
      { key: 'categoria',     label: 'Categoría',  fmt: v => v ? v.charAt(0).toUpperCase() + v.slice(1) : '—' },
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
  let searchQuery   = '';

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

function getSearchFields(tab) {
    const base = [{ value: '', label: 'Todos los campos' }];
    const byTab = {
      ventas: [
        { value: 'transactionId', label: 'ID'    },
        { value: 'montoTotal',    label: 'Monto' },
      ],
      inventario: [
        { value: 'itemId',         label: 'ID'       },
        { value: 'nombre',         label: 'Nombre'   },
        { value: 'cantidad',       label: 'Cantidad' },
        { value: 'precioUnitario', label: 'Precio'   },
      ],
      empleados: [
        { value: 'empleadoId',      label: 'ID'     },
        { value: 'nombre',          label: 'Nombre' },
        { value: 'horasTrabajadas', label: 'Horas'  },
      ],
      eventos: [
        { value: 'reporteId',   label: 'ID'          },
        { value: 'descripcion', label: 'Descripción' },
        { value: 'monto',       label: 'Monto'       },
      ],
    };
    return [...base, ...(byTab[tab] || [])];
  }

  function filterControls(tab) {
    let extraFilter = '';
    if (tab === 'ventas') {
      extraFilter = UI.dropdown({
        id: 'fc-canal',
        placeholder: 'Canal',
        options: [
          { value: '', label: 'Canal (todos)' },
          { value: 'Tienda Física', label: 'Tienda Física' },
          { value: 'Online', label: 'Online' },
        ],
      });
    } else if (tab === 'inventario') {
      extraFilter = UI.dropdown({
        id: 'fc-categoria',
        placeholder: 'Categoría',
        options: [
          { value: '', label: 'Categoría (todas)' },
          { value: 'electronica', label: 'Electrónica' },
          { value: 'ropa', label: 'Ropa' },
          { value: 'alimentos', label: 'Alimentos' },
          { value: 'hogar', label: 'Hogar' },
          { value: 'deportes', label: 'Deportes' },
        ],
      });
    } else if (tab === 'empleados') {
      extraFilter = UI.dropdown({
        id: 'fc-turno',
        placeholder: 'Turno',
        options: [
          { value: '', label: 'Turno (todos)' },
          { value: 'manana', label: 'Mañana' },
          { value: 'tarde', label: 'Tarde' },
          { value: 'noche', label: 'Noche' },
        ],
      });
    } else if (tab === 'eventos') {
      extraFilter = UI.dropdown({
        id: 'fc-tipo',
        placeholder: 'Tipo',
        options: [
          { value: '', label: 'Tipo (todos)' },
          { value: 'cierre-diario', label: 'Cierre diario' },
          { value: 'conciliacion', label: 'Conciliación' },
          { value: 'descuento', label: 'Descuento' },
          { value: 'devolucion', label: 'Devolución' },
          { value: 'bonificacion', label: 'Bonificación' },
        ],
      });
    }

    return `
      <div class="filter-pill-bar" id="filter-pill-bar">
        ${UI.dropdown({
          id: 'fc-sucursal',
          placeholder: 'Sucursal',
          options: [
            { value: '', label: 'Todas las sucursales' },
            ...SUCURSALES.map(s => ({ value: s, label: s })),
          ],
        })}
        ${UI.datePicker({ id: 'fc-dates', fromId: 'fc-desde', toId: 'fc-hasta', label: 'Fecha' })}
        ${extraFilter}
        <div class="filter-pill-sep"></div>
        <button onclick="App.Datos.applyFilters()" class="btn btn-primary btn-sm">Filtrar</button>
        <button onclick="App.Datos.clearFilters()" class="btn btn-outline btn-sm">Limpiar</button>
        <div id="filter-active-badges"></div>
      </div>
      <div class="filter-search-row">
        ${UI.dropdown({ id: 'fc-search-field', placeholder: 'Todos los campos', options: getSearchFields(tab) })}
        <span class="search-icon">${App.Icons?.datos || ''}</span>
        <input type="text" id="datos-search" class="datos-search-input"
          placeholder="Buscar…"
          oninput="App.Datos.search()">
      </div>
    `;
  }

  function renderActiveBadges() {
    const badgesEl = document.getElementById('filter-active-badges');
    if (!badgesEl) return;
    const suc   = document.getElementById('fc-sucursal')?.value;
    const desde = document.getElementById('fc-desde')?.value;
    const hasta = document.getElementById('fc-hasta')?.value;
    const extra = document.getElementById('fc-canal')?.value
               || document.getElementById('fc-categoria')?.value
               || document.getElementById('fc-turno')?.value
               || document.getElementById('fc-tipo')?.value;

    const badges = [];
    if (suc)          badges.push(`<span class="filter-badge">${suc} <span onclick="App.Datos.clearFilter('fc-sucursal')">×</span></span>`);
    if (desde || hasta) badges.push(`<span class="filter-badge">${desde || '…'} → ${hasta || '…'} <span onclick="App.Datos.clearFilter('fc-dates')">×</span></span>`);
    if (extra)        badges.push(`<span class="filter-badge">${extra} <span onclick="App.Datos.clearFilter('extra')">×</span></span>`);
    badgesEl.innerHTML = badges.join('');
  }

  function computeFilters() {
    const suc   = document.getElementById('fc-sucursal')?.value || '';
    const desde = document.getElementById('fc-desde')?.value   || '';
    const hasta = document.getElementById('fc-hasta')?.value   || '';
    const canal = activeTab === 'ventas'
      ? (document.getElementById('fc-canal')?.value || '') : '';

    let result = allData.filter(r => {
      // En ventas, los registros Online no tienen sucursal física:
      // solo se excluyen si tienen una sucursal distinta a la seleccionada.
      if (suc) {
        const esOnlineSinSucursal = activeTab === 'ventas' && !r.sucursal;
        if (!esOnlineSinSucursal && r.sucursal !== suc) return false;
      }
      if (desde || hasta) {
        const d = new Date(r.fecha);
        if (desde && d < new Date(desde)) return false;
        if (hasta && d > new Date(hasta + 'T23:59:59')) return false;
      }
      return true;
    });

    if (activeTab === 'ventas') {
      if (canal) result = result.filter(r => r.canal === canal);
    } else if (activeTab === 'inventario') {
      const cat = document.getElementById('fc-categoria')?.value || '';
      if (cat) result = result.filter(r => r.categoria === cat);
    } else if (activeTab === 'empleados') {
      const t = document.getElementById('fc-turno')?.value;
      if (t) result = result.filter(r => r.turno === t);
    } else if (activeTab === 'eventos') {
      const t = document.getElementById('fc-tipo')?.value;
      if (t) result = result.filter(r => r.tipo === t);
    }

    if (searchQuery) {
      const searchField = document.getElementById('fc-search-field')?.value || '';
      result = result.filter(row => {
        if (searchField) {
          return String(row[searchField] ?? '').toLowerCase().includes(searchQuery);
        }
        return Object.values(row).some(v =>
          String(v ?? '').toLowerCase().includes(searchQuery)
        );
      });
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
              <tr>
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
        <div>
          <h2>Datos Crudos</h2>
          <p class="text-muted small" style="margin-top:4px">
            Visualización en tiempo real de todos los registros por dominio
          </p>
        </div>
        <div class="page-header-actions">
          <button onclick="App.Datos.refresh()"
            class="btn-icon" title="Actualizar datos">
            ${App.Icons?.refresh || '↻'}
          </button>
        </div>
      </div>

      <div class="card" style="padding:0; overflow:hidden; margin-bottom:20px">
        <div class="tabs" id="datos-tabs" style="margin:0; border-bottom:1px solid var(--gray-200); padding:0 20px">
          ${TABS.map(t => `
            <button class="tab-btn ${t.id === activeTab ? 'active' : ''}"
              onclick="App.Datos.switchTab('${t.id}')">${t.label}</button>
          `).join('')}
        </div>
        <div id="filter-bar">
          ${filterControls(activeTab)}
        </div>
        <div id="table-container" class="table-container" style="padding:0">
          <div class="loading">Cargando datos…</div>
        </div>
        <div id="pagination" style="padding:12px 20px; border-top:1px solid var(--gray-100)"></div>
      </div>
    `;
  }

  return {
    async init(cont) {
      container   = cont;
      activeTab   = 'ventas';
      currentPage = 1;
      renderShell();
      UI.onSelect('fc-search-field', campo => {
        const input = document.getElementById('datos-search');
        if (input) input.placeholder = campo ? `Buscar por ${campo}…` : 'Buscar…';
      });
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
      activeTab   = tab;
      searchQuery = '';
      document.querySelectorAll('.tab-btn').forEach(b => {
        const t = TABS.find(t => t.label === b.textContent);
        b.classList.toggle('active', t?.id === tab);
      });
      document.getElementById('filter-bar').innerHTML = filterControls(tab);
      UI.onSelect('fc-search-field', campo => {
        const input = document.getElementById('datos-search');
        if (input) input.placeholder = campo ? `Buscar por ${campo}…` : 'Buscar…';
      });
      await this._load();
    },

    applyFilters() {
      currentPage  = 1;
      filteredData = computeFilters();
      renderTable(filteredData);
      renderActiveBadges();
    },

    clearFilters() {
      ['fc-sucursal','fc-desde','fc-hasta','fc-canal','fc-categoria','fc-turno','fc-tipo','fc-search-field','datos-search']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      ['fc-sucursal','fc-canal','fc-categoria','fc-turno','fc-tipo','fc-search-field'].forEach(id => {
        const label = document.getElementById(`dd-label-${id}`);
        if (label) label.textContent = label.dataset?.placeholder || 'Seleccionar';
      });
      UI.clearDate?.('fc-dates', 'fc-desde', 'fc-hasta');
      searchQuery  = '';
      const search = document.getElementById('datos-search');
      if (search) search.value = '';
      currentPage  = 1;
      filteredData = [...allData];
      renderTable(filteredData);
      const badges = document.getElementById('filter-active-badges');
      if (badges) badges.innerHTML = '';
    },

    clearFilter(which) {
      if (which === 'extra') {
        ['fc-canal','fc-categoria','fc-turno','fc-tipo'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
          const label = document.getElementById(`dd-label-${id}`);
          if (label) label.textContent = label.dataset?.placeholder || 'Seleccionar';
        });
      } else if (which === 'fc-dates') {
        UI.clearDate?.('fc-dates', 'fc-desde', 'fc-hasta');
      } else {
        const el = document.getElementById(which); if (el) el.value = '';
        const label = document.getElementById(`dd-label-${which}`);
        if (label) label.textContent = label.dataset?.placeholder || 'Seleccionar';
      }
      currentPage  = 1;
      filteredData = computeFilters();
      renderTable(filteredData);
      renderActiveBadges();
    },

    goPage(p) {
      const total = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
      if (p < 1 || p > total) return;
      currentPage = p;
      renderTable(filteredData);
    },

    search() {
      searchQuery  = document.getElementById('datos-search')?.value.toLowerCase().trim() || '';
      currentPage  = 1;
      filteredData = computeFilters();
      renderTable(filteredData);
    },

    async refresh() { await this._load(); },
  };
})();
