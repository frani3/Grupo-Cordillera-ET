window.App = window.App || {};

App.Reportes = (() => {
  const HISTORY_KEY = 'gc_reportes_historial';
  const SUCURSALES  = [
    'Santiago Centro','Providencia','Las Condes','Maipu',
    'Pudahuel','Nunoa','Vitacura','La Florida','Quilicura','San Bernardo',
  ];
  const TIPOS = ['cierre-diario','conciliacion','descuento','devolucion','bonificacion'];

  let container  = null;
  let lastResult = null; // { params, rawFiltrado, kpis }

  // ── Lectura de controles ─────────────────────────────────────────────────
  function getSelectedSucursales() {
    const todasEl = document.getElementById('rp-suc-todas');
    if (todasEl?.checked) return [];
    return Array.from(
      document.querySelectorAll('.rp-suc-cb:checked')
    ).map(cb => cb.value);
  }

  function getSelectedTipos() {
    const todosEl = document.getElementById('rp-tipo-todos');
    if (todosEl?.checked) return [];
    return Array.from(
      document.querySelectorAll('.rp-tipo-cb:checked')
    ).map(cb => cb.value);
  }

  // ── Historial ────────────────────────────────────────────────────────────
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function addHistory(params, kpis) {
    const h = loadHistory();
    h.unshift({
      id:                 Date.now(),
      generado:           new Date().toLocaleString('es-CL'),
      sucursal:           params.sucursales?.length > 0
                            ? params.sucursales.join(', ')
                            : 'Todas',
      desde:              params.desde || '—',
      hasta:              params.hasta || '—',
      ventasTotales:      kpis.ventasTotales,
      totalTransacciones: kpis.totalTransacciones,
      totalEventos:       kpis.totalEventos,
      montoEventos:       kpis.montoEventos,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 30)));
  }

  // ── Filtrado de datos crudos ─────────────────────────────────────────────
  function filtrarPorContexto(raw, params) {
    const sucursales = params.sucursales || [];
    const { desde, hasta } = params;

    function filtrarArray(arr) {
      return arr.filter(r => {
        if (sucursales.length > 0 && r.sucursal && !sucursales.includes(r.sucursal))
          return false;
        if (desde || hasta) {
          const d = new Date(r.fecha);
          if (desde && d < new Date(desde))               return false;
          if (hasta && d > new Date(hasta + 'T23:59:59')) return false;
        }
        return true;
      });
    }

    return {
      ventas:     filtrarArray(raw.ventas),
      inventario: filtrarArray(raw.inventario),
      empleados:  filtrarArray(raw.empleados),
      eventos:    filtrarArray(raw.eventos),
    };
  }

  // ── CSV ──────────────────────────────────────────────────────────────────
  function esc(v) {
    if (v == null) return '';
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportar() {
    if (!lastResult) return;
    const { params, rawFiltrado, kpis } = lastResult;
    const p = params;
    const sucLabel = p.sucursales?.length > 0 ? p.sucursales.join(', ') : 'Todas';

    const lines = [
      '# GRUPO CORDILLERA — REPORTE EJECUTIVO',
      `# Generado: ${new Date().toLocaleString('es-CL')}`,
      `# Sucursal: ${sucLabel} | Desde: ${p.desde || '—'} | Hasta: ${p.hasta || '—'}`,
      '',
      '## RESUMEN KPIs DEL PERÍODO',
      'Indicador,Valor',
      `Ventas Totales,$${Math.round(kpis.ventasTotales).toLocaleString('es-CL')}`,
      `Ventas Presenciales,$${Math.round(kpis.ventasPresencial).toLocaleString('es-CL')}`,
      `Ventas Online,$${Math.round(kpis.ventasOnline).toLocaleString('es-CL')}`,
      `Total Transacciones,${kpis.totalTransacciones}`,
      `Ticket Promedio,$${Math.round(kpis.ticketPromedio).toLocaleString('es-CL')}`,
      `Productos en Stock,${kpis.itemsInventario}`,
      `Stock Crítico,${kpis.stockCritico}`,
      `Horas Prom. por Empleado,${kpis.promedioHoras.toFixed(1)} hrs`,
      `Ajustes Financieros,$${Math.round(kpis.montoEventos).toLocaleString('es-CL')}`,
      `Total Eventos Financieros,${kpis.totalEventos}`,
      '',
      '## DETALLE DE VENTAS',
      'ID,Canal,Sucursal,Monto,Fecha',
      ...rawFiltrado.ventas.map(r =>
        [r.transactionId, r.canal, r.sucursal || 'Online', r.montoTotal, r.fecha]
          .map(esc).join(',')
      ),
      '',
      '## DETALLE DE EVENTOS FINANCIEROS',
      'ID,Tipo,Descripcion,Monto,Sucursal,Fecha',
      ...rawFiltrado.eventos.map(r =>
        [r.reporteId, r.tipo, r.descripcion, r.monto, r.sucursal, r.fecha]
          .map(esc).join(',')
      ),
    ];

    const blob = new Blob(['﻿' + lines.join('\n')],
      { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `reporte_gc_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render resultado ─────────────────────────────────────────────────────
  function renderResultado(params, rawFiltrado, kpis) {
    const fmt = v => '$' + Math.round(v).toLocaleString('es-CL');
    const hayFiltroSucursal = params.sucursales?.length > 0;
    const sucLabel = hayFiltroSucursal
      ? params.sucursales.join(', ')
      : 'Todas las sucursales';

    // Desglose ventas por canal
    const ventasPorCanal = {};
    rawFiltrado.ventas.forEach(r => {
      const canal = r.canal || 'Desconocido';
      if (!ventasPorCanal[canal]) ventasPorCanal[canal] = { count: 0, monto: 0 };
      ventasPorCanal[canal].count++;
      ventasPorCanal[canal].monto += parseFloat(r.montoTotal || 0);
    });

    // Desglose eventos por tipo
    const eventosPorTipo = {};
    rawFiltrado.eventos.forEach(r => {
      const tipo = r.tipo || 'sin tipo';
      if (!eventosPorTipo[tipo]) eventosPorTipo[tipo] = { count: 0, monto: 0 };
      eventosPorTipo[tipo].count++;
      eventosPorTipo[tipo].monto += parseFloat(r.monto || 0);
    });

    // Top sucursales: solo si no hay exactamente 1 sucursal seleccionada
    let topSucursalesHtml = '';
    if (!params.sucursales || params.sucursales.length !== 1) {
      const porSucursal = {};
      rawFiltrado.ventas.forEach(r => {
        if (!r.sucursal) return;
        porSucursal[r.sucursal] = (porSucursal[r.sucursal] || 0)
          + parseFloat(r.montoTotal || 0);
      });
      const top = Object.entries(porSucursal)
        .sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length > 0) {
        const max = top[0][1];
        topSucursalesHtml = `
          <div class="report-section">
            <h4 class="report-section-title">🏆 Top Sucursales por Ventas</h4>
            <div class="ranking-list">
              ${top.map(([suc, monto], i) => `
                <div class="ranking-item">
                  <span class="ranking-pos">#${i + 1}</span>
                  <span class="ranking-name">${suc}</span>
                  <div class="ranking-bar-wrap">
                    <div class="ranking-bar"
                      style="width:${Math.round((monto / max) * 100)}%"></div>
                  </div>
                  <span class="ranking-val">${fmt(monto)}</span>
                </div>`).join('')}
            </div>
          </div>`;
      }
    }

    // Ratio ajustes/ventas
    const ratioAjustes = kpis.ventasTotales > 0
      ? ((kpis.montoEventos / kpis.ventasTotales) * 100).toFixed(1)
      : '—';

    return `
      <div class="report-card">

        <div class="report-header-row">
          <div>
            <h4>Reporte ejecutivo</h4>
            <small class="text-muted">
              ${sucLabel} · ${params.desde || '—'} → ${params.hasta || '—'}
            </small>
          </div>
          <button onclick="App.Reportes.exportar()" class="btn btn-success btn-sm">
            ⬇ Exportar CSV
          </button>
        </div>

        <!-- KPIs del período -->
        <div class="report-section">
          <h4 class="report-section-title">📊 KPIs del Período</h4>
          <div class="report-kpi-grid">
            <div class="report-kpi">
              <span class="report-kpi-label">Ventas Totales</span>
              <span class="report-kpi-value">${fmt(kpis.ventasTotales)}</span>
              <span class="report-kpi-sub">${kpis.totalTransacciones} transacciones</span>
            </div>
            <div class="report-kpi">
              <span class="report-kpi-label">Ticket Promedio</span>
              <span class="report-kpi-value">${fmt(kpis.ticketPromedio)}</span>
              <span class="report-kpi-sub">Por transacción</span>
            </div>
            <div class="report-kpi">
              <span class="report-kpi-label">
                ${hayFiltroSucursal ? 'Ventas en Sucursal' : 'Ventas Presenciales'}
              </span>
              <span class="report-kpi-value">${fmt(kpis.ventasPresencial)}</span>
              <span class="report-kpi-sub">${kpis.transaccionesTienda} en tienda</span>
            </div>
            ${!hayFiltroSucursal ? `
            <div class="report-kpi">
              <span class="report-kpi-label">Ventas Online</span>
              <span class="report-kpi-value">${fmt(kpis.ventasOnline)}</span>
              <span class="report-kpi-sub">${kpis.transaccionesOnline} online</span>
            </div>` : ''}
            <div class="report-kpi">
              <span class="report-kpi-label">Productos en Stock</span>
              <span class="report-kpi-value">${kpis.itemsInventario}</span>
              <span class="report-kpi-sub ${kpis.stockCritico > 0 ? 'text-red' : 'text-green'}">
                ${kpis.stockCritico > 0
                  ? `⚠ ${kpis.stockCritico} críticos`
                  : '✓ Sin stock crítico'}
              </span>
            </div>
            <div class="report-kpi">
              <span class="report-kpi-label">Ajustes Financieros</span>
              <span class="report-kpi-value">${fmt(kpis.montoEventos)}</span>
              <span class="report-kpi-sub">
                ${kpis.totalEventos} eventos · ${ratioAjustes}% de ventas
              </span>
            </div>
          </div>
        </div>

        <!-- Top sucursales -->
        ${topSucursalesHtml}

        <!-- Desglose ventas por canal -->
        ${Object.keys(ventasPorCanal).length > 0 ? `
          <div class="report-section">
            <h4 class="report-section-title">🛒 Ventas por Canal</h4>
            <div class="table-scroll">
              <table>
                <thead><tr>
                  <th>Canal</th><th>Transacciones</th><th>Monto</th><th>% del Total</th>
                </tr></thead>
                <tbody>
                  ${Object.entries(ventasPorCanal).map(([canal, d]) => `
                    <tr>
                      <td>${canal}</td>
                      <td>${d.count}</td>
                      <td>${fmt(d.monto)}</td>
                      <td>${kpis.ventasTotales > 0
                        ? ((d.monto / kpis.ventasTotales) * 100).toFixed(1) + '%'
                        : '—'}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>` : ''}

        <!-- Desglose eventos por tipo -->
        ${Object.keys(eventosPorTipo).length > 0 ? `
          <div class="report-section">
            <h4 class="report-section-title">📋 Eventos Financieros por Tipo</h4>
            <div class="table-scroll">
              <table>
                <thead><tr><th>Tipo</th><th>Cantidad</th><th>Monto</th></tr></thead>
                <tbody>
                  ${Object.entries(eventosPorTipo).map(([tipo, d]) => `
                    <tr>
                      <td>${tipo}</td>
                      <td>${d.count}</td>
                      <td>${fmt(d.monto)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>` : ''}

        ${rawFiltrado.ventas.length === 0 && rawFiltrado.eventos.length === 0
          ? '<p class="text-muted" style="padding:20px 0">No se encontraron datos con los filtros seleccionados.</p>'
          : ''}
      </div>`;
  }

  // ── Historial render ─────────────────────────────────────────────────────
  function renderHistorial() {
    const el = document.getElementById('rp-historial');
    if (!el) return;
    const h = loadHistory();
    if (h.length === 0) {
      el.innerHTML = '<p class="text-muted small">Sin reportes generados aún.</p>';
      return;
    }
    const fmt = v => '$' + Math.round(v || 0).toLocaleString('es-CL');
    el.innerHTML = `
      <div class="table-scroll" style="margin-bottom:12px">
        <table>
          <thead><tr>
            <th>Generado</th><th>Sucursal</th><th>Desde</th><th>Hasta</th>
            <th>Ventas Totales</th><th>Transacciones</th>
            <th>Eventos</th><th>Ajustes</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${h.map(r => `<tr>
              <td>${r.generado}</td>
              <td>${r.sucursal}</td>
              <td>${r.desde}</td>
              <td>${r.hasta}</td>
              <td><strong>${fmt(r.ventasTotales)}</strong></td>
              <td>${r.totalTransacciones ?? '—'}</td>
              <td>${r.totalEventos ?? '—'}</td>
              <td>${fmt(r.montoEventos)}</td>
              <td>
                <button onclick="App.Reportes.regenerar(${r.id})"
                  class="btn-regener" title="Re-generar con estos filtros">↺</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button onclick="App.Reportes.clearHistorial()"
        class="btn btn-danger-outline btn-sm">Limpiar historial</button>`;
  }

  // ── Shell render ─────────────────────────────────────────────────────────
  function render() {
    container.innerHTML = `
      <div class="page-header">
        <h2>Reportes Ejecutivos</h2>
      </div>
      <div class="report-layout">
        <div class="report-panel">
          <h3>Parámetros</h3>

          <!-- Sucursales y Tipos en fila -->
          <div class="params-row">
            <div class="form-group">
              <label>Sucursales</label>
              <div class="multi-select multi-select-dimmed" id="rp-sucursales">
                <label class="multi-select-item multi-select-all">
                  <input type="checkbox" id="rp-suc-todas" value=""
                    onchange="App.Reportes.toggleTodas(this)" checked>
                  <span>Todas las sucursales</span>
                </label>
                <div class="multi-select-divider"></div>
                ${SUCURSALES.map(s => `
                  <label class="multi-select-item">
                    <input type="checkbox" class="rp-suc-cb" value="${s}"
                      onchange="App.Reportes.onSucursalChange()">
                    <span>${s}</span>
                  </label>`).join('')}
              </div>
            </div>
            <div class="form-group">
              <label>Tipos de Evento</label>
              <div class="multi-select multi-select-dimmed" id="rp-tipos">
                <label class="multi-select-item multi-select-all">
                  <input type="checkbox" id="rp-tipo-todos" value=""
                    onchange="App.Reportes.toggleTodosTipos(this)" checked>
                  <span>Todos los tipos</span>
                </label>
                <div class="multi-select-divider"></div>
                ${TIPOS.map(t => `
                  <label class="multi-select-item">
                    <input type="checkbox" class="rp-tipo-cb" value="${t}"
                      onchange="App.Reportes.onTipoChange()">
                    <span>${t.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())}</span>
                  </label>`).join('')}
              </div>
            </div>
          </div>

          <!-- Fechas en fila -->
          <div class="params-dates">
            <div class="form-group">
              <label>Fecha Desde</label>
              <input type="date" id="rp-desde">
            </div>
            <div class="form-group">
              <label>Fecha Hasta</label>
              <input type="date" id="rp-hasta">
            </div>
          </div>

          <button onclick="App.Reportes.generar()" class="btn btn-primary">
            Generar Reporte
          </button>
        </div>
        <div class="report-results" id="rp-results">
          <div class="empty-state">
            <p>Configure los filtros y genere un reporte</p>
            <small>El reporte incluye ventas, inventario, empleados y eventos financieros.</small>
          </div>
        </div>
      </div>
      <div class="historial-section">
        <h3>Historial de reportes generados</h3>
        <div id="rp-historial"></div>
      </div>`;
    renderHistorial();
  }

  // ── API pública ──────────────────────────────────────────────────────────
  return {
    async init(cont) {
      container  = cont;
      lastResult = null;
      render();
    },

    async generar(paramsOverride) {
      const params = paramsOverride || {
        sucursales: getSelectedSucursales(),
        tipos:      getSelectedTipos(),
        desde:      document.getElementById('rp-desde')?.value || '',
        hasta:      document.getElementById('rp-hasta')?.value || '',
      };

      const resultsEl = document.getElementById('rp-results');
      if (resultsEl) resultsEl.innerHTML =
        '<div class="loading">Generando reporte…</div>';

      try {
        // 1. Obtener datos crudos via App.Indicadores
        const raw = await App.Indicadores.fetchRaw();

        // 2. Filtrar por sucursales y fechas
        const rawFiltrado = filtrarPorContexto(raw, params);

        // 3. Filtrar eventos por tipos seleccionados
        if (params.tipos && params.tipos.length > 0) {
          rawFiltrado.eventos = rawFiltrado.eventos
            .filter(e => params.tipos.includes(e.tipo));
        }

        // 4. Calcular KPIs del período (rawFiltrado ya está filtrado, sucursal='')
        const kpis = App.Indicadores.computeKpis(rawFiltrado, '');

        // 5. Guardar resultado para exportar
        lastResult = { params, rawFiltrado, kpis };

        // 6. Guardar en historial
        addHistory(params, kpis);
        renderHistorial();

        // 7. Renderizar resultado
        if (resultsEl) resultsEl.innerHTML =
          renderResultado(params, rawFiltrado, kpis);

      } catch (err) {
        if (resultsEl) resultsEl.innerHTML =
          `<div class="error-card">Error al generar reporte: ${err.message}</div>`;
      }
    },

    exportar() { exportar(); },

    toggleTodas(checkbox) {
      const cont = document.getElementById('rp-sucursales');
      if (checkbox.checked) {
        document.querySelectorAll('.rp-suc-cb').forEach(cb => { cb.checked = false; });
        cont?.classList.add('multi-select-dimmed');
      } else {
        cont?.classList.remove('multi-select-dimmed');
      }
    },

    onSucursalChange() {
      const marcados = document.querySelectorAll('.rp-suc-cb:checked').length;
      const todas    = document.getElementById('rp-suc-todas');
      const cont     = document.getElementById('rp-sucursales');
      if (marcados > 0 && todas) {
        todas.checked = false;
        cont?.classList.remove('multi-select-dimmed');
      } else if (marcados === 0 && todas) {
        todas.checked = true;
        cont?.classList.add('multi-select-dimmed');
      }
    },

    toggleTodosTipos(checkbox) {
      const cont = document.getElementById('rp-tipos');
      if (checkbox.checked) {
        document.querySelectorAll('.rp-tipo-cb').forEach(cb => { cb.checked = false; });
        cont?.classList.add('multi-select-dimmed');
      } else {
        cont?.classList.remove('multi-select-dimmed');
      }
    },

    onTipoChange() {
      const marcados = document.querySelectorAll('.rp-tipo-cb:checked').length;
      const todos    = document.getElementById('rp-tipo-todos');
      const cont     = document.getElementById('rp-tipos');
      if (marcados > 0 && todos) {
        todos.checked = false;
        cont?.classList.remove('multi-select-dimmed');
      } else if (marcados === 0 && todos) {
        todos.checked = true;
        cont?.classList.add('multi-select-dimmed');
      }
    },

    regenerar(id) {
      const h = loadHistory().find(r => r.id === id);
      if (!h) return;
      const todasEl = document.getElementById('rp-suc-todas');
      const cbs     = document.querySelectorAll('.rp-suc-cb');
      const sucCont = document.getElementById('rp-sucursales');
      if (h.sucursal === 'Todas') {
        if (todasEl) todasEl.checked = true;
        cbs.forEach(cb => { cb.checked = false; });
        sucCont?.classList.add('multi-select-dimmed');
      } else {
        const seleccionadas = h.sucursal.split(', ');
        if (todasEl) todasEl.checked = false;
        sucCont?.classList.remove('multi-select-dimmed');
        cbs.forEach(cb => {
          cb.checked = seleccionadas.includes(cb.value);
        });
      }
      const dEl = document.getElementById('rp-desde');
      const hEl = document.getElementById('rp-hasta');
      if (dEl) dEl.value = h.desde === '—' ? '' : h.desde;
      if (hEl) hEl.value = h.hasta === '—' ? '' : h.hasta;
      this.generar();
    },

    clearHistorial() {
      localStorage.removeItem(HISTORY_KEY);
      renderHistorial();
    },
  };
})();
