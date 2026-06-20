/* Top navbar — auth-aware, role-based, with notification bell. */
window.Navbar = {
  data() {
    return {
      notifOpen: false,
      notifs: [],
      notifLoading: false,
    };
  },
  template: /*html*/`
    <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">
      <div class="container-xxl">
        <router-link to="/" class="navbar-brand d-flex align-items-center gap-2 fw-bold text-ridge">
          <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-ridge text-white" style="width:32px;height:32px;">
            <i class="bi bi-triangle-fill" style="font-size:.8rem;"></i>
          </span>
          <span class="display-serif fs-4">Ridgeline</span>
        </router-link>

        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#nav-main">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="nav-main">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 align-items-lg-center">
            <template v-if="!user">
              <li class="nav-item"><router-link class="nav-link" to="/">Catalog</router-link></li>
            </template>
            <template v-else-if="user.role === 'trekker'">
              <li class="nav-item"><router-link class="nav-link" to="/">Catalog</router-link></li>
              <li class="nav-item"><router-link class="nav-link" to="/me/bookings">My Bookings</router-link></li>
              <li class="nav-item"><router-link class="nav-link" to="/me/profile">Profile</router-link></li>
            </template>
            <template v-else-if="user.role === 'staff'">
              <li class="nav-item"><router-link class="nav-link" to="/staff">My Treks</router-link></li>
              <li class="nav-item"><router-link class="nav-link" to="/me/profile">Profile</router-link></li>
            </template>
            <template v-else-if="user.role === 'admin'">
              <li class="nav-item"><router-link class="nav-link" to="/admin">Dashboard</router-link></li>
              <li class="nav-item"><router-link class="nav-link" to="/admin/treks">Treks</router-link></li>
              <li class="nav-item"><router-link class="nav-link" to="/admin/users">Users &amp; Staff</router-link></li>
            </template>
          </ul>

          <div class="d-flex align-items-center gap-2">
            <!-- Notification bell (logged-in users only) -->
            <div v-if="user" class="position-relative" v-click-outside="closeNotif">
              <button class="btn btn-sm btn-outline-secondary position-relative"
                      style="width:36px;height:36px;padding:0;border-radius:50%;"
                      @click="toggleNotif"
                      aria-label="Notifications">
                <i class="bi bi-bell-fill" style="font-size:.85rem;"></i>
                <span v-if="unread > 0"
                      class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                      style="font-size:0.6rem;min-width:16px;padding:2px 4px;">
                  {{ unread > 9 ? '9+' : unread }}
                </span>
              </button>

              <!-- Dropdown panel -->
              <div v-if="notifOpen"
                   class="card border-0 shadow-lg position-absolute end-0 mt-2"
                   style="width:340px;max-height:420px;z-index:1040;border-radius:12px;overflow:hidden;">
                <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                  <span class="fw-semibold small">Notifications</span>
                  <button v-if="unread > 0"
                          class="btn btn-link btn-sm text-muted p-0"
                          style="font-size:0.75rem;"
                          @click="readAll">
                    Mark all read
                  </button>
                </div>

                <div class="overflow-auto" style="max-height:340px;">
                  <div v-if="notifLoading" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-ridge"></div>
                  </div>
                  <div v-else-if="!notifs.length" class="text-center py-5 text-muted small">
                    <i class="bi bi-bell-slash display-6 d-block mb-2 opacity-25"></i>
                    No notifications yet
                  </div>
                  <div v-else>
                    <div v-for="n in notifs" :key="n.id"
                         class="d-flex gap-2 px-3 py-2 border-bottom"
                         :class="n.read ? '' : 'bg-success-subtle'"
                         style="cursor:pointer;"
                         @click="clickNotif(n)">
                      <div class="flex-shrink-0 mt-1">
                        <i class="bi" :class="notifIcon(n.type)" style="font-size:0.85rem;"></i>
                      </div>
                      <div class="flex-grow-1 min-w-0">
                        <div class="small fw-semibold text-truncate">{{ n.title }}</div>
                        <div class="small text-muted" style="white-space:normal;line-height:1.3;">{{ n.body }}</div>
                        <div class="text-muted" style="font-size:0.68rem;margin-top:2px;">{{ relTime(n.created_at) }}</div>
                      </div>
                      <div v-if="!n.read" class="flex-shrink-0 mt-1">
                        <span class="badge bg-ridge rounded-pill" style="width:8px;height:8px;padding:0;display:inline-block;"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <template v-if="user">
              <span class="badge rounded-pill text-uppercase fw-semibold"
                    :class="roleBadge">
                <i class="bi" :class="roleIcon"></i>
                {{ user.role }}
              </span>
              <router-link to="/me/profile" class="d-none d-sm-flex flex-column lh-1 me-2 text-decoration-none">
                <span class="small fw-semibold text-body">{{ user.name }}</span>
                <span class="small text-muted">{{ user.email }}</span>
              </router-link>
              <button class="btn btn-sm btn-outline-secondary" @click="onLogout">
                <i class="bi bi-box-arrow-right"></i> Logout
              </button>
            </template>
            <template v-else>
              <router-link to="/login" class="btn btn-sm btn-outline-ridge">Login</router-link>
              <router-link to="/register" class="btn btn-sm btn-ridge">Register</router-link>
            </template>
          </div>
        </div>
      </div>
    </nav>
  `,
  computed: {
    user()   { return store.state.user; },
    unread() { return store.state.notifUnread; },
    roleBadge() {
      const r = this.user && this.user.role;
      return r === "admin" ? "text-bg-dark" : r === "staff" ? "text-bg-info" : "text-bg-success";
    },
    roleIcon() {
      const r = this.user && this.user.role;
      return r === "admin" ? "bi-shield-lock-fill" : r === "staff" ? "bi-person-badge-fill" : "bi-compass";
    },
  },
  methods: {
    onLogout() {
      store.logout();
      store.setNotifUnread(0);
      store.toast({ title: "Signed out", body: "Come back soon.", variant: "secondary" });
      this.$router.push("/login");
    },
    async fetchNotifs() {
      if (!this.user) return;
      this.notifLoading = true;
      try {
        const data = await api.getNotifications();
        this.notifs = data.notifications;
        store.setNotifUnread(data.unread);
      } catch (_) { /* silent */ }
      finally { this.notifLoading = false; }
    },
    toggleNotif() {
      this.notifOpen = !this.notifOpen;
      if (this.notifOpen) this.fetchNotifs();
    },
    closeNotif() { this.notifOpen = false; },
    async readAll() {
      await api.markAllRead().catch(() => {});
      this.notifs.forEach(n => n.read = true);
      store.setNotifUnread(0);
    },
    async clickNotif(n) {
      if (!n.read) {
        await api.markRead(n.id).catch(() => {});
        n.read = true;
        store.setNotifUnread(Math.max(0, store.state.notifUnread - 1));
      }
      this.notifOpen = false;
    },
    notifIcon(type) {
      return type === "success" ? "bi-check-circle-fill text-success"
           : type === "warning" ? "bi-exclamation-triangle-fill text-warning"
           : type === "danger"  ? "bi-x-circle-fill text-danger"
           : "bi-info-circle-fill text-ridge";
    },
    relTime(iso) {
      const diff = (Date.now() - new Date(iso)) / 1000;
      if (diff < 60)   return "just now";
      if (diff < 3600) return Math.floor(diff / 60) + "m ago";
      if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
      return Math.floor(diff / 86400) + "d ago";
    },
  },
  directives: {
    "click-outside": {
      mounted(el, binding) {
        el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e); };
        document.addEventListener("click", el._clickOutside);
      },
      unmounted(el) { document.removeEventListener("click", el._clickOutside); },
    },
  },
  mounted() {
    this.fetchNotifs();
    // Poll every 60s so the badge stays fresh
    this._pollTimer = setInterval(() => { if (this.user) this.fetchNotifs(); }, 60000);
  },
  unmounted() { clearInterval(this._pollTimer); },
};
