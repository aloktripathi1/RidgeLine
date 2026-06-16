/* Register view — trekkers only. */
window.RegisterView = {
  data() {
    return {
      name: "", email: "", password: "", confirm: "",
      loading: false, submitted: false, error: "",
    };
  },
  template: /*html*/`
    <div class="container-xxl py-5">
      <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5">
          <div class="text-center mb-4">
            <h1 class="display-serif display-6 mb-1">Start your account</h1>
            <p class="text-muted mb-0">Trekker accounts are free. Staff is invite-only.</p>
          </div>
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4 p-md-5">
              <form @submit.prevent="onSubmit" novalidate :class="{ 'was-validated': submitted }">
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Full name</label>
                  <input v-model.trim="name" type="text" class="form-control form-control-lg" required minlength="2" />
                  <div class="invalid-feedback">Please enter your name.</div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Email</label>
                  <input v-model.trim="email" type="email" class="form-control form-control-lg" required />
                  <div class="invalid-feedback">Please enter a valid email.</div>
                </div>
                <div class="row g-3 mb-3">
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold text-uppercase">Password</label>
                    <input v-model="password" type="password" class="form-control form-control-lg" required minlength="6" />
                    <div class="invalid-feedback">Min 6 characters.</div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold text-uppercase">Confirm</label>
                    <input v-model="confirm" type="password" class="form-control form-control-lg" required :class="{ 'is-invalid': submitted && confirm !== password }" />
                    <div class="invalid-feedback">Passwords don't match.</div>
                  </div>
                </div>
                <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>
                <button class="btn btn-ridge btn-lg w-100" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Create account
                </button>
              </form>
            </div>
          </div>
          <p class="text-center text-muted small mt-4">
            Already have one? <router-link to="/login" class="text-ridge fw-semibold">Sign in →</router-link>
          </p>
        </div>
      </div>
    </div>
  `,
  methods: {
    async onSubmit(e) {
      this.submitted = true; this.error = "";
      if (!e.target.checkValidity() || this.password !== this.confirm) return;
      this.loading = true;
      try {
        const res = await api.register(this.name, this.email, this.password);
        store.setAuth(res.token, res.user);
        store.toast({ title: "Welcome to Ridgeline!", body: "Your trekker account is ready.", variant: "success" });
        this.$router.push("/catalog");
      } catch (err) {
        this.error = err?.response?.data?.detail || "Could not register";
      } finally { this.loading = false; }
    }
  }
};
