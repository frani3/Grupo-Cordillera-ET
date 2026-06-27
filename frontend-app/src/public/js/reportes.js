window.App = window.App || {};

App.Reportes = (() => {
  const HISTORY_KEY = 'gc_reportes_historial';
  const SUCURSALES  = [
    'Santiago Centro', 'Providencia', 'Las Condes', 'Maipu',
    'Pudahuel', 'Nunoa', 'Vitacura', 'La Florida', 'Quilicura', 'San Bernardo',
  ];
  const TIPOS       = ['cierre-diario', 'conciliacion', 'descuento', 'devolucion', 'bonificacion'];

  let container    = null;
  let lastData     = null;
  let lastParams   = null;

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function addHistory(params, resultado) {
    const h = loadHistory();
    h.unshift({
      id:            Date.now(),
      generado:      new Date().toLocaleString('es-CL'),
      sucursal:      params.sucursal || 'todas',
      tipo:          params.tipo     || 'todos',
      desde:         params.desde    || '—',
      hasta:         params.hasta    || '—',
      totalEventos:  resultado.total,
      totalMonto:    resultado.monto,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50)));
  }

  function escapeCsv(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  }

  function render() {
    container.innerHTML = `
      <div class="page-header">
        <h2>Reportes Financieros</h2>
      </div>
      <div class="report-layout">

        <!-- Panel de filtros -->
        <div class="report-panel">
          <h3>Parámetros del reporte</h3>
          <div class="form-group">
            <label>Sucursal</label>
            <select id="rp-sucursal">
              <option value="">Todas</option>
              ${SUCURSALES.map(s => `<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tipo de Evento</label>
            <select id="rp-tipo">
              <option value="">Todos</option>
              ${TIPOS.map(t => `<option value="${t}">${t.replace(/-/g,' ').replace(/^\w/,c=>c.toUpperCase())}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Fecha Desde</label>
            <input type="date" id="rp-desde">
          </div>
          <div class="form-group">
            <label>Fecha Hasta</label>
            <input type="date" id="rp-hasta">
          </div>
          <div class="form-actions">
            <button onclick="App.Reportes.generar()" class="btn btn-primary">Generar Reporte</button>
          </div>
        </div>

        <!-- Resultados -->
        <div class="report-results">
          <div id="rp-summary">
            <div class="empty-state">
              <p>Configure los filtros y genere un reporte</p>
              <small>Los datos se obtienen en tiempo real desde los microservicios.</small>
            </div>
          </div>
          <div id="rp-actions" class="report-actions hidden"></div>
        </div>
      </div>

      <!-- Historial -->
      <div class="historial-section">
        <h3>Historial de reportes generados</h3>
        <div id="rp-historial"></div>
      </div>
    `;
    renderHistorial();
  }

  function renderHistorial() {
    const el = document.getElementById('rp-historial');
    if (!el) return;
    const h = loadHistory();
    if (h.length === 0) {
      el.innerHTML = '<p class="text-muted small">Sin reportes generados en esta sesión.</p>';
      return;
    }
    el.innerHTML = `
      <div class="table-scroll" style="margin-bottom:12px">
        <table>
          <thead><tr>
            <th>Generado</th><th>Sucursal</th><th>Tipo</th><th>Desde</th><th>Hasta</th>
            <th>Eventos</th><th>Monto Total</th>
          </tr></thead>
          <tbody>
            ${h.map(r => `<tr>
              <td>${r.generado}</td>
              <td>${r.sucursal}</td>
              <td>${r.tipo}</td>
              <td>${r.desde}</td>
              <td>${r.hasta}</td>
              <td><strong>${r.totalEventos}</strong></td>
              <td>$${parseFloat(r.totalMonto||0).toLocaleString('es-CL')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button onclick="App.Reportes.clearHistorial()" class="btn btn-danger-outline btn-sm">Limpiar historial</button>
    `;
  }

  return {
    async init(cont) {
      container  = cont;
      lastData   = null;
      lastParams = null;
      render();
    },

    async generar() {
      const params = {
        sucursal: document.getElementById('rp-sucursal').value,
        tipo:     document.getElementById('rp-tipo').value,
        desde:    document.getElementById('rp-desde').value,
        hasta:    document.getElementById('rp-hasta').value,
      };

      const summaryEl = document.getElementById('rp-summary');
      const actionsEl = document.getElementById('rp-actions');
      summaryEl.innerHTML = '<div class="loading">Consultando eventos…</div>';
      actionsEl.classList.add('hidden');
      actionsEl.innerHTML = '';

      try {
        let eventos = [];
        try { eventos = await App.Facade.getEventos(); } catch { eventos = []; }
        if (!Array.isArray(eventos)) eventos = [];

        // Filtrar en cliente
        let filtered = eventos.filter(e => {
          if (params.sucursal && e.sucursal !== params.sucursal) return false;
          if (params.tipo     && e.tipo     !== params.tipo)     return false;
          if (params.desde || params.hasta) {
            const d = new Date(e.fecha);
            if (params.desde && d < new Date(params.desde)) return false;
            if (params.hasta && d > new Date(params.hasta + 'T23:59:59')) return false;
          }
          return true;
        });

        const totalMonto = filtered.reduce((s, e) => s + parseFloat(e.monto || 0), 0);
        const byTipo     = filtered.reduce((acc, e) => {
          acc[e.tipo || 'sin tipo'] = (acc[e.tipo || 'sin tipo'] || 0) + 1;
          return acc;
        }, {});

        lastData   = filtered;
        lastParams = params;

        summaryEl.innerHTML = `
          <div class="report-card">
            <h4>Resultado del reporte</h4>
            <div class="report-stats">
              <div class="stat">
                <span class="stat-label">Total eventos</span>
                <span class="stat-value">${filtered.length}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Monto total</span>
                <span class="stat-value">$${totalMonto.toLocaleString('es-CL')}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Sucursal</span>
                <span class="stat-value">${params.sucursal || 'Todas'}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Tipo</span>
                <span class="stat-value">${params.tipo || 'Todos'}</span>
              </div>
            </div>
            ${Object.keys(byTipo).length > 0 ? `
              <div style="margin-top:14px">
                <div class="table-info">Desglose por tipo</div>
                <div class="table-scroll">
                  <table>
                    <thead><tr><th>Tipo</th><th>Eventos</th><th>Monto</th></tr></thead>
                    <tbody>
                      ${Object.entries(byTipo).map(([tipo, count]) => {
                        const m = filtered.filter(e => (e.tipo||'sin tipo') === tipo)
                                          .reduce((s,e) => s + parseFloat(e.monto||0), 0);
                        return `<tr><td>${tipo}</td><td>${count}</td><td>$${m.toLocaleString('es-CL')}</td></tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>` : '<p class="text-muted" style="margin-top:10px">No se encontraron eventos con los filtros seleccionados.</p>'}
          </div>`;

        addHistory(params, { total: filtered.length, monto: totalMonto });
        renderHistorial();

        if (filtered.length > 0) {
          actionsEl.innerHTML = `<button onclick="App.Reportes.exportar()" class="btn btn-success">⬇ Exportar CSV</button>`;
          actionsEl.classList.remove('hidden');
        }
      } catch (err) {
        summaryEl.innerHTML = `<div class="error-card">Error al generar reporte: ${err.message}</div>`;
      }
    },

    exportar() {
      if (!lastData || lastData.length === 0) return;
      const cols    = ['reporteId', 'tipo', 'descripcion', 'monto', 'sucursal', 'fecha'];
      const headers = ['ID', 'Tipo', 'Descripcion', 'Monto', 'Sucursal', 'Fecha'];
      const p       = lastParams || {};
      const lines   = [
        `# Grupo Cordillera — Reporte financiero`,
        `# Generado: ${new Date().toLocaleString('es-CL')}`,
        `# Filtros: sucursal=${p.sucursal||'todas'}, tipo=${p.tipo||'todos'}, desde=${p.desde||'—'}, hasta=${p.hasta||'—'}`,
        headers.join(','),
        ...lastData.map(r => cols.map(c => escapeCsv(r[c])).join(',')),
      ];
      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `reporte_cordillera_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },

    clearHistorial() {
      localStorage.removeItem(HISTORY_KEY);
      renderHistorial();
    },
  };
})();
