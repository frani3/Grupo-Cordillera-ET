window.App = window.App || {};

App.Router = (() => {
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  const MODULES = {
    admin:     ['indicadores', 'datos', 'reportes', 'usuarios'],
    ejecutivo: ['indicadores', 'datos', 'reportes'],
    analista:  ['indicadores', 'datos', 'reportes'],
  };

  const META = {
    indicadores: { label: 'Indicadores',        icon: '📊', init: c => App.Indicadores.init(c) },
    datos:       { label: 'Datos',              icon: '📋', init: c => App.Datos.init(c) },
    reportes:    { label: 'Reportes',           icon: '📄', init: c => App.Reportes.init(c) },
    usuarios:    { label: 'Gestión Usuarios',   icon: '👤', init: c => App.Usuarios.init(c) },
  };

  let current = null;

  return {
    init() {
      document.getElementById('logout-btn')
        .addEventListener('click', () => { App.Auth.clearSession(); this.showLogin(); });
      document.getElementById('login-form')
        .addEventListener('submit', e => App.Auth.handleLogin(e));

      const session = App.Auth.getSession();
      session ? this.showApp(session) : this.showLogin();
    },

    showLogin() {
      document.getElementById('view-login').classList.remove('hidden');
      document.getElementById('view-app').classList.add('hidden');
      document.getElementById('login-error').classList.add('hidden');
    },

    showApp(session) {
      document.getElementById('view-login').classList.add('hidden');
      document.getElementById('view-app').classList.remove('hidden');

      document.getElementById('header-username').textContent = session.username;
      const badge = document.getElementById('header-role-badge');
      badge.textContent = session.role;
      badge.className   = `role-badge role-${session.role}`;

      this._buildNav(session.role);
      this.navigate((MODULES[session.role] || ['datos'])[0]);
    },

    _buildNav(role) {
      const allowed = MODULES[role] || ['datos'];
      document.getElementById('sidebar-nav').innerHTML = allowed.map(m => `
        <a href="#" class="nav-item" data-module="${m}"
           onclick="App.Router.navigate('${m}'); return false;">
          <span class="nav-icon">${META[m].icon}</span>
          <span class="nav-label">${META[m].label}</span>
        </a>`).join('');
    },

    navigate(mod) {
      if (!META[mod]) return;
      // Llamar destroy() del módulo anterior si lo tiene (ej. limpia intervalos)
      if (current) {
        const prev = App[capitalize(current)];
        if (prev?.destroy) prev.destroy();
      }
      current = mod;

      document.querySelectorAll('.nav-item').forEach(el =>
        el.classList.toggle('active', el.dataset.module === mod));

      document.getElementById('header-breadcrumb').textContent = META[mod].label;

      const content = document.getElementById('app-content');
      content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Cargando ${META[mod].label}…</span></div>`;

      META[mod].init(content);
    },
  };
})();

document.addEventListener('DOMContentLoaded', () => App.Router.init());
