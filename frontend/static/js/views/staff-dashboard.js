/* Trek Staff dashboard — grid of assigned treks. */
window.StaffDashboardView = {
  components: { TrekCard: window.TrekCard },
  data() { return { treks: [], loading: true }; },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <div>
          <h1 class="display-serif display-6 mb-1">Your treks</h1>
          <p class="text-muted mb-0">Manage slots, status, and participants for the treks you lead.</p>
        </div>
        <div class="d-flex gap-2">
          <span class="badge text-bg-light border fs-6 py-2 px-3">
            <i class="bi bi-map text-ridge"></i>
            {{ treks.length }} assigned
          </span>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-ridge"></div></div>

      <div v-else-if="!treks.length" class="card border-0 shadow-sm">
        <div class="card-body text-center py-5">
          <i class="bi bi-flag display-5 text-muted"></i>
          <h3 class="display-serif h5 mt-3">No treks assigned yet</h3>
          <p class="text-muted">Ask an admin to assign you a trek to lead.</p>
        </div>
      </div>

      <div v-else class="row g-4">
        <div v-for="t in treks" :key="t.id" class="col-md-6 col-xl-4">
          <trek-card :trek="t" :show-status="true" cta-label="Manage" @open="manage(t)" />
        </div>
      </div>
    </div>
  `,
  methods: {
    async reload() {
      this.loading = true;
      try {
        const all = await api.listTreks();
        this.treks = all.filter(t => t.staff_id === store.state.user.id);
      } finally { this.loading = false; }
    },
    manage(t) { this.$router.push("/staff/trek/" + t.id); }
  },
  created() { this.reload(); }
};
