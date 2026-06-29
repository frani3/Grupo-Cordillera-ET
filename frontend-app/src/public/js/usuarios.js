window.App = window.App || {};

App.Usuarios = (() => {
  const SEED = [
    { id: 1, username: 'admin',   email: 'admin@cordillera.cl',   role: 'ADMIN', estado: 'Activo', real: true },
    { id: 2, username: 'usuario', email: 'usuario@cordillera.cl', role: 'USER',  estado: 'Activo', real: true },
  ];

  let container = null;
  let lista     = [...SEED];
  let nextId    = 3;

  function renderTabla() {
    const el = document.getElementById('users-table');
    if (!el) return;
    const subtitleEl = document.querySelector('.card-subtitle');
    if (subtitleEl) subtitleEl.textContent = lista.length + ' usuarios en el sistema';
    el.innerHTML = `
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>ID</th><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            ${lista.map(u => `
              <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}">${u.role}</span></td>
                <td><span class="badge badge-success">${u.estado}</span></td>
                <td>
                  ${u.real
                    ? '<span class="text-muted small">Sistema</span>'
                    : `<button onclick="App.Usuarios.eliminar(${u.id})" class="btn btn-danger btn-sm">
                        ${App.Icons?.trash || ''} Eliminar
                      </button>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function render() {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>Gestión de Usuarios</h2>
          <p class="text-muted small" style="margin-top:4px">
            Administración de accesos al sistema
          </p>
        </div>
        <div class="page-header-actions">
          <span class="role-badge role-admin">Solo administradores</span>
        </div>
      </div>

      <div class="users-layout">

        <div class="card" style="padding:0; overflow:hidden">
          <div class="card-header" style="padding:16px 20px">
            <div>
              <div class="card-title">Usuarios registrados</div>
              <div class="card-subtitle">${lista.length} usuarios en el sistema</div>
            </div>
          </div>
          <div id="users-table"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Nuevo usuario</div>
              <div class="card-subtitle">Los usuarios creados son solo en sesión</div>
            </div>
          </div>
          <div class="form-group">
            <label>Nombre de usuario</label>
            <input type="text" id="u-username" placeholder="nuevousuario">
          </div>
          <div class="form-group">
            <label>Correo electrónico</label>
            <input type="email" id="u-email" placeholder="correo@empresa.cl">
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" id="u-password" placeholder="••••••••">
          </div>
          <div class="form-group">
            <label>Rol</label>
            ${UI.dropdown({
              id: 'u-role',
              placeholder: 'Seleccionar rol',
              options: [
                { value: 'USER',  label: 'Usuario' },
                { value: 'ADMIN', label: 'Administrador' },
              ],
              value: 'USER',
            })}
          </div>
          <button onclick="App.Usuarios.crear()" class="btn btn-primary btn-full">
            ${App.Icons?.plus || '+'} Crear usuario
          </button>
          <div id="u-msg" style="margin-top:10px"></div>
          <div class="info-box mt-2">
            El backend reconoce únicamente los usuarios semilla:
            <strong>admin</strong> y <strong>usuario</strong>.
          </div>
        </div>

      </div>
    `;
    renderTabla();
  }

  return {
    init(cont) {
      container = cont;
      lista     = [...SEED];
      nextId    = 3;
      render();
    },

    crear() {
      const username = document.getElementById('u-username').value.trim();
      const email    = document.getElementById('u-email').value.trim();
      const password = document.getElementById('u-password').value;
      const role     = document.getElementById('u-role').value;
      const msgEl    = document.getElementById('u-msg');

      if (!username || !email || !password) {
        msgEl.innerHTML = '<p class="error-msg">Complete todos los campos.</p>';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msgEl.innerHTML = '<p class="error-msg">Ingrese un correo válido.</p>';
        return;
      }
      if (lista.some(u => u.username === username)) {
        msgEl.innerHTML = '<p class="error-msg">El nombre de usuario ya existe.</p>';
        return;
      }

      lista.push({ id: nextId++, username, email, role, estado: 'Activo', real: false });
      ['u-username', 'u-email', 'u-password'].forEach(id => {
        document.getElementById(id).value = '';
      });
      const roleLabel = document.getElementById('dd-label-u-role');
      if (roleLabel) roleLabel.textContent = 'Usuario';
      const roleHidden = document.getElementById('u-role');
      if (roleHidden) roleHidden.value = 'USER';
      msgEl.innerHTML = '<p class="success-msg">Usuario creado (solo en memoria de esta sesión).</p>';
      setTimeout(() => { if (msgEl) msgEl.innerHTML = ''; }, 3500);
      renderTabla();
    },

    eliminar(id) {
      const u = lista.find(u => u.id === id);
      if (!u || u.real) return;
      if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return;
      lista = lista.filter(u => u.id !== id);
      renderTabla();
    },
  };
})();
