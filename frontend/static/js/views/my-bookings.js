/* Trekker — my bookings, with async CSV export trigger. */
window.MyBookingsView = {
  data() {
    return { bookings: [], loading: true, exporting: false, cancelling: null };
  },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h1 class="display-serif display-6 mb-1">My bookings</h1>
          <p class="text-muted mb-0">Your trail history, neatly stacked.</p>
        </div>
        <button class="btn btn-outline-ridge" :disabled="exporting || !bookings.length" @click="exportCsv">
          <span v-if="exporting" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-download me-1"></i>
          Download CSV
        </button>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-ridge"></div></div>

      <div v-else-if="!bookings.length" class="card border-0 shadow-sm">
        <div class="card-body text-center py-5">
          <i class="bi bi-suitcase2 display-5 text-muted"></i>
          <h3 class="display-serif h5 mt-3">No bookings yet</h3>
          <p class="text-muted mb-3">Pick a trek from the catalog to get started.</p>
          <router-link to="/catalog" class="btn btn-ridge">Browse treks</router-link>
        </div>
      </div>

      <div v-else>
        <!-- summary strip -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="small text-uppercase text-muted">Booked</div>
                <div class="stat-num text-ridge">{{ counts.Booked || 0 }}</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="small text-uppercase text-muted">Completed</div>
                <div class="stat-num text-ridge">{{ counts.Completed || 0 }}</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="small text-uppercase text-muted">Cancelled</div>
                <div class="stat-num text-ridge">{{ counts.Cancelled || 0 }}</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="small text-uppercase text-muted">Total spent</div>
                <div class="stat-num text-ridge">{{ inr(spent) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-4">Trek</th>
                  <th class="d-none d-md-table-cell">Departs</th>
                  <th class="d-none d-lg-table-cell">Booked on</th>
                  <th>Status</th>
                  <th class="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in bookings" :key="b.id">
                  <td class="ps-4">
                    <div class="fw-semibold">{{ b.trek.name }}</div>
                    <div class="small text-muted"><i class="bi bi-geo-alt"></i> {{ b.trek.location }} · {{ b.trek.duration_days }}d</div>
                  </td>
                  <td class="d-none d-md-table-cell text-body-secondary">{{ fmtDate(b.trek.start_date) }}</td>
                  <td class="d-none d-lg-table-cell text-body-secondary">{{ fmtDate(b.booked_on) }}</td>
                  <td><span class="badge" :class="statusClass(b.status)">{{ b.status }}</span></td>
                  <td class="text-end pe-4">
                    <button v-if="b.status === 'Booked'"
                            class="btn btn-sm btn-outline-danger"
                            :disabled="cancelling === b.id"
                            @click="cancel(b)">
                      <span v-if="cancelling === b.id" class="spinner-border spinner-border-sm me-1"></span>
                      Cancel
                    </button>
                    <span v-else class="text-muted small">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    counts() {
      const c = {};
      for (const b of this.bookings) c[b.status] = (c[b.status] || 0) + 1;
      return c;
    },
    spent() {
      return this.bookings.filter(b => b.status !== "Cancelled").reduce((sum, b) => sum + (b.trek?.price || 0), 0);
    },
  },
  methods: {
    inr: util.inr,
    fmtDate: util.fmtDate,
    statusClass: util.statusClass,
    async reload() {
      this.loading = true;
      try { this.bookings = await api.myBookings(store.state.user.id); }
      finally { this.loading = false; }
    },
    async cancel(b) {
      this.cancelling = b.id;
      try {
        await api.updateBooking(b.id, { status: "Cancelled" });
        store.toast({ title: "Booking cancelled", body: b.trek.name, variant: "secondary" });
        await this.reload();
      } catch (e) {
        store.toast({ title: "Could not cancel", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.cancelling = null; }
    },
    async exportCsv() {
      this.exporting = true;
      try {
        const job = await api.exportBookings(store.state.user.id);
        // Per spec: notify user the async export was queued — they'll receive an email.
        alert("Your bookings export is being prepared (job " + job.job_id + ").\nCheck your email — we'll send the CSV in a moment.");
      } finally { this.exporting = false; }
    }
  },
  created() { this.reload(); }
};
