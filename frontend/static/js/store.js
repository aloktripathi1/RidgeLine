/* Tiny reactive global store.
   Holds auth state (decoded from JWT) and exposes helpers to push toasts.
*/
(function (global) {
  const { reactive } = Vue;

  const TOKEN_KEY = "tma:token";

  function decodeJwt(token) {
    try {
      const [, payload] = token.split(".");
      return JSON.parse(atob(payload));
    } catch { return null; }
  }

  const state = reactive({
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: null,
    toasts: [], // {id, title, body, variant}
  });

  if (state.token) {
    const claims = decodeJwt(state.token);
    if (claims && claims.exp * 1000 > Date.now()) {
      state.user = { id: claims.sub, email: claims.email, name: claims.name, role: claims.role };
    } else {
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function setAuth(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_KEY, token);
  }
  function setUser(patch) {
    // Merge profile changes into the reactive user (id/role/email stay authoritative).
    if (state.user) Object.assign(state.user, patch);
  }
  function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  let nextToastId = 1;
  function toast({ title, body, variant = "success", delay = 3200 }) {
    const id = nextToastId++;
    state.toasts.push({ id, title, body, variant });
    setTimeout(() => {
      const i = state.toasts.findIndex(t => t.id === id);
      if (i >= 0) state.toasts.splice(i, 1);
    }, delay);
  }

  global.store = { state, setAuth, setUser, logout, toast };
})(window);
