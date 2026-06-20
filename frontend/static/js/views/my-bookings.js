/* Trekker — my bookings with AI Trip Planner. */
window.MyBookingsView = {
  data() {
    return {
      bookings: [], loading: true, exporting: false, cancelling: null,
      // AI Trip Planner
      planTrek: null,
      planLoading: false,
      planResult: null,
      planError: "",
      planModalInst: null,
    };
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
                    <div class="d-flex gap-2 justify-content-end">
                      <button v-if="b.status === 'Booked'"
                              class="btn btn-sm btn-outline-ridge"
                              @click="openPlanModal(b)">
                        <i class="bi bi-stars me-1"></i>Plan trip
                      </button>
                      <button v-if="b.status === 'Booked'"
                              class="btn btn-sm btn-outline-danger"
                              :disabled="cancelling === b.id"
                              @click="cancel(b)">
                        <span v-if="cancelling === b.id" class="spinner-border spinner-border-sm me-1"></span>
                        Cancel
                      </button>
                      <span v-if="b.status !== 'Booked'" class="text-muted small">—</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- AI Trip Planner Modal -->
      <div class="modal fade" id="tripPlannerModal" tabindex="-1" aria-labelledby="tripPlannerLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header border-0">
              <div>
                <h5 class="modal-title display-serif mb-0" id="tripPlannerLabel">
                  <i class="bi bi-stars text-ridge me-2"></i>AI Trip Planner
                </h5>
                <p class="small text-muted mb-0" v-if="planTrek">{{ planTrek.trek.name }} · {{ planTrek.trek.location }}</p>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <!-- Loading -->
              <div v-if="planLoading" class="text-center py-5">
                <div class="spinner-border text-ridge mb-3"></div>
                <p class="text-muted">Generating your personalised itinerary…</p>
              </div>
              <!-- Error -->
              <div v-else-if="planError" class="alert alert-danger">{{ planError }}</div>
              <!-- Results -->
              <div v-else-if="planResult">
                <!-- Day by day -->
                <h6 class="text-uppercase small fw-bold text-muted mb-3">Day-by-day itinerary</h6>
                <div class="timeline">
                  <div v-for="day in planResult.itinerary" :key="day.day" class="d-flex gap-3 mb-3">
                    <div class="flex-shrink-0 text-center" style="width:44px;">
                      <div class="rounded-circle bg-ridge text-white d-flex align-items-center justify-content-center fw-bold"
                           style="width:36px;height:36px;font-size:0.8rem;">{{ day.day }}</div>
                      <div v-if="day.day < planResult.itinerary.length" class="mx-auto mt-1" style="width:2px;height:24px;background:#ddd;"></div>
                    </div>
                    <div class="flex-grow-1 pb-1">
                      <div class="fw-semibold">{{ day.title }}</div>
                      <div class="small text-body-secondary">{{ day.activities }}</div>
                      <div class="small text-muted mt-1"><i class="bi bi-moon-stars me-1"></i>{{ day.stay }}</div>
                    </div>
                  </div>
                </div>

                <div class="ridge-divider my-4"></div>

                <!-- Packing list -->
                <h6 class="text-uppercase small fw-bold text-muted mb-3">Packing essentials</h6>
                <div class="row g-2">
                  <div v-for="item in planResult.packing_list" :key="item" class="col-sm-6">
                    <div class="d-flex align-items-center gap-2 small">
                      <i class="bi bi-check-circle-fill text-ridge flex-shrink-0"></i>
                      <span>{{ item }}</span>
                    </div>
                  </div>
                </div>

                <div class="ridge-divider my-4"></div>

                <!-- Tips -->
                <h6 class="text-uppercase small fw-bold text-muted mb-3">Safety tips</h6>
                <ul class="list-unstyled mb-0">
                  <li v-for="tip in planResult.tips" :key="tip" class="d-flex align-items-start gap-2 mb-2 small">
                    <i class="bi bi-exclamation-triangle-fill text-warning flex-shrink-0 mt-1"></i>
                    <span>{{ tip }}</span>
                  </li>
                </ul>

              </div>
              <!-- Idle (should not show — auto-generates on open) -->
              <div v-else class="text-center py-5">
                <div class="spinner-border text-ridge"></div>
              </div>
            </div>
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
      try { this.bookings = await api.myBookings(); }
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
        const job = await api.exportBookings();
        alert("Your bookings export is being prepared (job " + job.job_id + ").\nCheck your email — we'll send the CSV in a moment.");
      } finally { this.exporting = false; }
    },
    openPlanModal(b) {
      this.planTrek = b;
      this.planResult = null;
      this.planError = "";
      this.planLoading = false;
      this.$nextTick(() => {
        const el = document.getElementById("tripPlannerModal");
        if (!el) return;
        this.planModalInst = bootstrap.Modal.getOrCreateInstance(el);
        // Wait until Bootstrap finishes the fade-in animation before touching
        // reactive state — otherwise the re-render breaks Bootstrap's focus trap.
        el.addEventListener("shown.bs.modal", () => this.generatePlan(), { once: true });
        this.planModalInst.show();
      });
    },
    async generatePlan() {
      if (!this.planTrek) return;
      this.planLoading = true;
      this.planError = "";
      this.planResult = null;
      try {
        this.planResult = await api.aiItinerary(this.planTrek.trek_id || this.planTrek.trek.id, {});
      } catch (e) {
        this.planError = e?.response?.data?.detail || "AI service unavailable. Please try again.";
      } finally {
        this.planLoading = false;
      }
    },
  },
  created() { this.reload(); }
};
