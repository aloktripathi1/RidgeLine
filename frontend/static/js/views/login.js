/* Login view. Single form for all roles. */
window.LoginView = {
  data() {
    return {
      email: "",
      password: "",
      loading: false,
      submitted: false,
      error: "",
    };
  },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5">
          <div class="text-center mb-4">
            <h1 class="display-serif display-6 mb-1">Welcome back</h1>
            <p class="text-muted mb-0">Sign in to continue your expedition.</p>
          </div>
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4 p-md-5">
              <form @submit.prevent="onSubmit" novalidate :class="{ 'was-validated': submitted }">
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Email</label>
                  <input v-model.trim="email" type="email" class="form-control form-control-lg" required autocomplete="email" />
                  <div class="invalid-feedback">Please enter a valid email.</div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase d-flex justify-content-between">
                    <span>Password</span>
                    <span class="text-muted small opacity-50" style="cursor:default;">Forgot?</span>
                  </label>
                  <input v-model="password" type="password" class="form-control form-control-lg" required minlength="6" autocomplete="current-password" />
                  <div class="invalid-feedback">Password is required.</div>
                </div>
                <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>
                <button class="btn btn-ridge btn-lg w-100" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Sign in
                </button>
              </form>

              <div class="d-flex align-items-center gap-2 my-3">
                <hr class="flex-grow-1 m-0" />
                <span class="small text-muted">or</span>
                <hr class="flex-grow-1 m-0" />
              </div>
              <a href="/api/auth/google"
                 class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2">
                <i class="bi bi-google"></i>
                Continue with Google
              </a>

              <hr class="my-4" />
              <div class="small text-muted">
                <div class="fw-semibold text-body mb-2">Try a demo account</div>
                <div class="d-grid gap-2">
                  <button type="button" class="btn btn-sm btn-outline-secondary text-start" @click="prefill('admin@ridgeline.app', 'admin123')">
                    <i class="bi bi-shield-lock-fill text-dark"></i>
                    <span class="ms-2 fw-semibold">Admin</span>
                    <span class="text-muted ms-2">admin@ridgeline.app</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-secondary text-start" @click="prefill('devraj@ridgeline.app', 'staff123')">
                    <i class="bi bi-person-badge-fill text-info"></i>
                    <span class="ms-2 fw-semibold">Trek Staff</span>
                    <span class="text-muted ms-2">devraj@ridgeline.app</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-secondary text-start" @click="prefill('riya@trekker.app', 'trek123')">
                    <i class="bi bi-compass text-success"></i>
                    <span class="ms-2 fw-semibold">Trekker</span>
                    <span class="text-muted ms-2">riya@trekker.app</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p class="text-center text-muted small mt-4">
            No account yet? <router-link to="/register" class="text-ridge fw-semibold">Create one →</router-link>
          </p>
        </div>
      </div>
    </div>
  `,
  methods: {
    prefill(email, password) { this.email = email.trim(); this.password = password; },
    async onSubmit(e) {
      this.submitted = true;
      this.error = "";
      if (!e.target.checkValidity()) return;
      this.loading = true;
      try {
        const res = await api.login(this.email, this.password);
        store.setAuth(res.token, res.user);
        store.toast({ title: "Welcome back, " + res.user.name.split(" ")[0] + "!", body: "Signed in as " + res.user.role + ".", variant: "success" });
        const role = res.user.role;
        this.$router.push(role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/catalog");
      } catch (err) {
        this.error = err?.response?.data?.detail || "Invalid login";
      } finally {
        this.loading = false;
      }
    }
  }
};
