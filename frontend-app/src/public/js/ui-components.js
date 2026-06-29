window.UI = (() => {

  // ── CustomDropdown ───────────────────────────────────────────────────────
  function dropdown({ id, options, value = '', placeholder = 'Seleccionar', onChange }) {
    const selected = options.find(o => o.value === value);
    const html = `
      <div class="ui-dropdown" id="dd-${id}" tabindex="0"
        onclick="UI.toggleDropdown('${id}')">
        <span class="ui-dd-label" id="dd-label-${id}" data-placeholder="${placeholder}">
          ${selected ? selected.label : placeholder}
        </span>
        <span class="ui-dd-arrow">${App.Icons?.chevron || `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4l4 4 4-4"/></svg>`}</span>
        <div class="ui-dd-menu hidden" id="dd-menu-${id}">
          ${options.map(o => `
            <div class="ui-dd-option ${o.value === value ? 'selected' : ''}"
              data-value="${o.value}"
              onclick="event.stopPropagation(); UI.selectOption('${id}', '${o.value}', '${o.label.replace(/'/g, "\\'")}')">
              ${o.value === value ? `<span class="ui-dd-check">${App.Icons?.check || '✓'}</span>` : '<span class="ui-dd-check-empty"></span>'}
              ${o.label}
            </div>`).join('')}
        </div>
      </div>
      <input type="hidden" id="${id}" value="${value}">
    `;
    return html;
  }

  function toggleDropdown(id) {
    const menu = document.getElementById(`dd-menu-${id}`);
    const dd   = document.getElementById(`dd-${id}`);
    const isOpen = !menu.classList.contains('hidden');
    document.querySelectorAll('.ui-dd-menu:not(.hidden)').forEach(m => {
      if (m.id !== `dd-menu-${id}`) m.classList.add('hidden');
      m.closest('.ui-dropdown')?.classList.remove('open');
    });
    if (isOpen) {
      menu.classList.add('hidden');
      dd.classList.remove('open');
    } else {
      menu.classList.remove('hidden');
      dd.classList.add('open');
    }
  }

  function selectOption(id, value, label) {
    document.getElementById(id).value = value;
    document.getElementById(`dd-label-${id}`).textContent = label;
    document.getElementById(`dd-menu-${id}`).classList.add('hidden');
    document.getElementById(`dd-${id}`)?.classList.remove('open');
    const menu = document.getElementById(`dd-menu-${id}`);
    if (menu) {
      menu.querySelectorAll('.ui-dd-option').forEach(opt => {
        const isSelected = opt.dataset?.value === value;
        opt.classList.toggle('selected', isSelected);
      });
    }
    const cb = _callbacks[id];
    if (cb) cb(value);
  }

  const _callbacks = {};
  function onSelect(id, fn) { _callbacks[id] = fn; }

  document.addEventListener('click', e => {
    if (!e.target.closest('.ui-dropdown')) {
      document.querySelectorAll('.ui-dd-menu:not(.hidden)').forEach(m => {
        m.classList.add('hidden');
        m.closest('.ui-dropdown')?.classList.remove('open');
      });
    }
  });


  // ── DateRangePicker ──────────────────────────────────────────────────────
  function datePicker({ id, fromId, toId, label = 'Fecha' }) {
    return `
      <div class="ui-daterange" id="drp-${id}">
        <button class="ui-daterange-btn" onclick="UI.toggleDatePicker('${id}')">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="2" width="11" height="10" rx="1.5"/><path d="M1 5h11M4 1v2M9 1v2"/></svg>
          <span id="drp-label-${id}">${label}</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4l4 4 4-4"/></svg>
        </button>
        <div class="ui-cal hidden" id="drp-cal-${id}">
          <div class="ui-cal-header">
            <button class="ui-cal-nav" onclick="UI.calPrev('${id}')">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 3L5 7l4 4"/></svg>
            </button>
            <span class="ui-cal-month" id="drp-month-${id}"></span>
            <button class="ui-cal-nav" onclick="UI.calNext('${id}')">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 3l4 4-4 4"/></svg>
            </button>
          </div>
          <div class="ui-cal-grid" id="drp-grid-${id}"></div>
          <div class="ui-cal-footer">
            <button class="btn btn-sm btn-outline" onclick="UI.clearDate('${id}','${fromId}','${toId}')">Limpiar</button>
            <button class="btn btn-sm btn-primary" onclick="UI.applyDate('${id}','${fromId}','${toId}')">Aplicar</button>
          </div>
        </div>
        <input type="hidden" id="${fromId}">
        <input type="hidden" id="${toId}">
      </div>
    `;
  }

  const _calState = {};

  function toggleDatePicker(id) {
    const cal = document.getElementById(`drp-cal-${id}`);
    const isOpen = !cal.classList.contains('hidden');
    document.querySelectorAll('.ui-cal:not(.hidden)').forEach(c => c.classList.add('hidden'));
    if (!isOpen) {
      if (!_calState[id]) {
        _calState[id] = { year: new Date().getFullYear(), month: new Date().getMonth(), from: null, to: null };
      }
      cal.classList.remove('hidden');
      renderCal(id);
    }
  }

  function renderCal(id) {
    const s = _calState[id];
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const dayNames   = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

    document.getElementById(`drp-month-${id}`).textContent =
      `${monthNames[s.month]} ${s.year}`;

    const firstDay = new Date(s.year, s.month, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(s.year, s.month + 1, 0).getDate();

    let html = '<div class="ui-cal-days-header">';
    dayNames.forEach(d => { html += `<div class="ui-cal-day-name">${d}</div>`; });
    html += '</div><div class="ui-cal-days">';

    for (let i = 0; i < offset; i++) html += '<div class="ui-cal-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${s.year}-${String(s.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFrom  = s.from === date;
      const isTo    = s.to   === date;
      const inRange = s.from && s.to && date > s.from && date < s.to;
      html += `<div class="ui-cal-day ${isFrom ? 'from' : ''} ${isTo ? 'to' : ''} ${inRange ? 'in-range' : ''}"
        onclick="UI.selectDate('${id}','${date}')">${d}</div>`;
    }
    html += '</div>';
    document.getElementById(`drp-grid-${id}`).innerHTML = html;
  }

  function selectDate(id, date) {
    const s = _calState[id];
    if (!s.from || (s.from && s.to) || date < s.from) {
      s.from = date; s.to = null;
    } else {
      s.to = date;
    }
    renderCal(id);
  }

  function calPrev(id) {
    const s = _calState[id];
    s.month--;
    if (s.month < 0) { s.month = 11; s.year--; }
    renderCal(id);
  }

  function calNext(id) {
    const s = _calState[id];
    s.month++;
    if (s.month > 11) { s.month = 0; s.year++; }
    renderCal(id);
  }

  function applyDate(id, fromId, toId) {
    const s = _calState[id];
    if (s.from) document.getElementById(fromId).value = s.from;
    if (s.to)   document.getElementById(toId).value   = s.to;
    const label = document.getElementById(`drp-label-${id}`);
    if (label) {
      if (s.from && s.to) {
        label.textContent = `${s.from.slice(5).replace('-', '/')} — ${s.to.slice(5).replace('-', '/')}`;
      } else if (s.from) {
        label.textContent = `Desde ${s.from.slice(5).replace('-', '/')}`;
      }
    }
    document.getElementById(`drp-cal-${id}`).classList.add('hidden');
  }

  function clearDate(id, fromId, toId) {
    _calState[id] = { year: new Date().getFullYear(), month: new Date().getMonth(), from: null, to: null };
    const fromEl = document.getElementById(fromId);
    const toEl   = document.getElementById(toId);
    if (fromEl) fromEl.value = '';
    if (toEl)   toEl.value   = '';
    const label = document.getElementById(`drp-label-${id}`);
    if (label) label.textContent = 'Fecha';
    const cal = document.getElementById(`drp-cal-${id}`);
    if (cal) cal.classList.add('hidden');
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.ui-daterange')) {
      document.querySelectorAll('.ui-cal:not(.hidden)').forEach(c => c.classList.add('hidden'));
    }
  });

  return {
    dropdown, toggleDropdown, selectOption, onSelect, _callbacks,
    datePicker, toggleDatePicker, renderCal, selectDate,
    calPrev, calNext, applyDate, clearDate,
  };
})();
