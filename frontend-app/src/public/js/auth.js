window.App = window.App || {};

App.Auth = (() => {
  const KEY = 'gc_session';

  return {
    getSession() {
      try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    setSession(data) {
      sessionStorage.setItem(KEY, JSON.stringify(data));
    },

    clearSession() {
      sessionStorage.removeItem(KEY);
    },

    async handleLogin(event) {
      event.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const role     = document.getElementById('login-role').value;
      const errorEl  = document.getElementById('login-error');
      const btn      = event.target.querySelector('button[type="submit"]');

      errorEl.classList.add('hidden');

      if (!username || !password) {
        errorEl.textContent = 'Complete usuario y contraseña.';
        errorEl.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Verificando...';

      try {
        const res  = await fetch('/api/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Credenciales incorrectas. Intente nuevamente.');
        }

        this.setSession({
          token:     data.token,
          username:  data.username || username,
          role,
          loginTime: new Date().toISOString(),
        });

        App.Router.showApp(this.getSession());
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Ingresar al sistema';
      }
    },
  };
})();
