/* App entrypoint — wires Vue, the router and global components.
   Notes on assumptions documented in code:
   - Route guards redirect unauthenticated users to /login for protected paths.
   - Role-based access is enforced client-side here for UX; the real backend re-checks.
*/
(function () {
  const { createApp, h } = Vue;
  const { createRouter, createWebHashHistory } = VueRouter;

  // --- Routes ---
  const routes = [
    { path: "/",          name: "home",   component: window.HomeView, meta: { layout: true } },
    { path: "/login",     name: "login",  component: window.LoginView, meta: { layout: true, guestOnly: true } },
    { path: "/register",       name: "register",       component: window.RegisterView,     meta: { layout: true, guestOnly: true } },
    { path: "/auth/callback",  name: "oauth-callback", component: window.OAuthCallbackView, meta: { layout: true } },
    { path: "/catalog",        name: "catalog",        component: window.CatalogView,       meta: { layout: true } },

    // Trekker
    { path: "/me/bookings", name: "my-bookings", component: window.MyBookingsView, meta: { layout: true, roles: ["trekker"] } },

    // Profile (any authenticated role)
    { path: "/me/profile", name: "profile", component: window.ProfileView, meta: { layout: true, roles: ["trekker", "staff", "admin"] } },

    // Staff
    { path: "/staff",                  name: "staff-dash", component: window.StaffDashboardView, meta: { layout: true, roles: ["staff"] } },
    { path: "/staff/trek/:id",         name: "staff-trek", component: window.StaffTrekView, props: true, meta: { layout: true, roles: ["staff"] } },

    // Admin
    { path: "/admin",        name: "admin",       component: window.AdminDashboardView, meta: { layout: true, roles: ["admin"] } },
    { path: "/admin/treks",  name: "admin-treks", component: window.AdminTreksView, meta: { layout: true, roles: ["admin"] } },
    { path: "/admin/users",  name: "admin-users", component: window.AdminUsersView, meta: { layout: true, roles: ["admin"] } },

    { path: "/:pathMatch(.*)*", redirect: "/" },
  ];

  const router = createRouter({
    history: createWebHashHistory(),
    routes,
    linkActiveClass: "router-link-active",
  });

  router.beforeEach((to) => {
    const u = store.state.user;
    if (to.meta.roles && (!u || !to.meta.roles.includes(u.role))) {
      return u ? { path: "/" } : { path: "/login" };
    }
    if (to.meta.guestOnly && u) return { path: "/" };
    return true;
  });

  // --- Toast portal renderer (uses Bootstrap Toast classes) ---
  const ToastPortal = {
    computed: { toasts() { return store.state.toasts; } },
    template: /*html*/`
      <teleport to="#toast-portal">
        <div v-for="t in toasts" :key="t.id"
             class="toast show align-items-center text-white border-0 mb-2"
             :class="'bg-' + (t.variant === 'secondary' ? 'secondary' : t.variant === 'danger' ? 'danger' : t.variant === 'info' ? 'info' : 'success')"
             role="alert">
          <div class="d-flex">
            <div class="toast-body">
              <div class="fw-semibold">{{ t.title }}</div>
              <div v-if="t.body" class="small opacity-75">{{ t.body }}</div>
            </div>
          </div>
        </div>
      </teleport>
    `
  };

  // --- Root App component ---
  const App = {
    components: { Navbar: window.Navbar, ToastPortal, AiChat: window.AiChat },
    template: /*html*/`
      <div class="min-vh-100 d-flex flex-column">
        <navbar />
        <main class="flex-grow-1">
          <router-view />
        </main>
        <toast-portal />
        <ai-chat />
      </div>
    `
  };

  const app = createApp(App);
  app.use(router);

  // Register globally-used components so views referencing them as kebab-case work.
  app.component("trek-card", window.TrekCard);
  app.component("trek-modal", window.TrekModal);
  app.component("checkout-modal", window.CheckoutModal);
  app.component("confirm-modal", window.ConfirmModal);

  app.mount("#app");
})();
