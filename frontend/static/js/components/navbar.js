/* Top navbar. Dynamic based on auth state + role. */
window.Navbar = {
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
    user() { return store.state.user; },
    roleBadge() {
      const r = this.user && this.user.role;
      return r === "admin" ? "text-bg-dark"
           : r === "staff" ? "text-bg-info"
           : "text-bg-success";
    },
    roleIcon() {
      const r = this.user && this.user.role;
      return r === "admin" ? "bi-shield-lock-fill"
           : r === "staff" ? "bi-person-badge-fill"
           : "bi-compass";
    },
  },
  methods: {
    onLogout() {
      store.logout();
      store.toast({ title: "Signed out", body: "Come back soon.", variant: "secondary" });
      this.$router.push("/login");
    }
  }
};
