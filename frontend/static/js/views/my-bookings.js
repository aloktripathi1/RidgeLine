/* Trekker — my bookings with AI Trip Planner. */
window.MyBookingsView = {
  data() {
    return {
      bookings: [], loading: true, exporting: false, cancelling: null,
      // Reviews
      reviewedBookingIds: [],
      reviewTarget: null, reviewRating: 5, hoverRating: 0, reviewBody: "", reviewSaving: false, reviewModalInst: null,
      // Waitlist
      waitlist: [],
      waitlistLeaving: null,
      // AI Trip Planner
      planTrek: null,
      planLoading: false,
      planResult: null,
      planError: "",
      planModalInst: null,
      planCached: false,
      planCachedAt: null,
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
                      <!-- Review button for completed, un-reviewed treks -->
                      <button v-if="b.status === 'Completed' && !reviewedBookingIds.includes(b.id)"
                              class="btn btn-sm btn-outline-ridge"
                              @click="openReview(b)">
                        <i class="bi bi-star me-1"></i>Review
                      </button>
                      <span v-if="b.status === 'Completed' && reviewedBookingIds.includes(b.id)"
                            class="small text-muted"><i class="bi bi-star-fill text-warning me-1"></i>Reviewed</span>
                      <span v-if="b.status === 'Cancelled'" class="text-muted small">—</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Waitlist section -->
      <div v-if="waitlist.length" class="mt-4">
        <h2 class="display-serif h5 mb-3">Waitlist</h2>
        <div class="card border-0 shadow-sm">
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="ps-4">Trek</th>
                  <th>Position</th>
                  <th class="d-none d-md-table-cell">Joined</th>
                  <th class="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="w in waitlist" :key="w.trek_id">
                  <td class="ps-4">
                    <div class="fw-semibold">{{ w.trek_name }}</div>
                    <div class="small text-muted"><i class="bi bi-geo-alt"></i> {{ w.trek_location }}</div>
                  </td>
                  <td>
                    <span class="badge bg-secondary">#{{ w.position }}</span>
                  </td>
                  <td class="d-none d-md-table-cell text-body-secondary">{{ fmtDate(w.joined_at) }}</td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-danger"
                            :disabled="waitlistLeaving === w.trek_id"
                            @click="leaveWaitlist(w)">
                      <span v-if="waitlistLeaving === w.trek_id" class="spinner-border spinner-border-sm me-1"></span>
                      Leave
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Review modal -->
      <div class="modal fade" id="reviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-0">
              <h5 class="modal-title display-serif">Rate your trek</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body pt-0" v-if="reviewTarget">
              <p class="text-muted small mb-3">{{ reviewTarget.trek.name }} · {{ reviewTarget.trek.location }}</p>
              <!-- Star picker -->
              <div class="d-flex gap-1 mb-3" style="font-size:2rem;" @mouseleave="hoverRating=0">
                <span v-for="s in [1,2,3,4,5]" :key="s"
                      style="cursor:pointer;transition:color .1s;"
                      :style="s<=(hoverRating||reviewRating)?'color:#f59e0b;':'color:#ddd;'"
                      @click="reviewRating=s"
                      @mouseenter="hoverRating=s">
                  ★
                </span>
              </div>
              <label class="form-label small fw-semibold text-uppercase">Your review <span class="fw-normal text-muted">(optional)</span></label>
              <textarea v-model="reviewBody" class="form-control" rows="3"
                        placeholder="Share what made this trek memorable…" maxlength="1000"></textarea>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button class="btn btn-link text-muted" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-ridge" @click="submitReview" :disabled="reviewSaving">
                <span v-if="reviewSaving" class="spinner-border spinner-border-sm me-2"></span>
                Submit review
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Trip Planner Modal -->
      <div class="modal fade" id="tripPlannerModal" tabindex="-1" aria-labelledby="tripPlannerLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg">
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

                <div class="d-flex align-items-center justify-content-between mt-4 pt-3 border-top">
                  <span v-if="planCached" class="small text-muted">
                    <i class="bi bi-lightning-charge-fill text-success me-1"></i>
                    Loaded from cache · {{ planCachedAt }}
                  </span>
                  <span v-else class="small text-muted">
                    <i class="bi bi-stars text-ridge me-1"></i>Just generated
                  </span>
                  <button class="btn btn-sm btn-outline-secondary" @click="generatePlan(true)" :disabled="planLoading">
                    <i class="bi bi-arrow-clockwise me-1"></i>Regenerate
                  </button>
                </div>
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
      try {
        const [bookings, reviewed, wl] = await Promise.all([
          api.myBookings(),
          api.myReviewedBookings().catch(() => []),
          api.myWaitlist().catch(() => []),
        ]);
        this.bookings = bookings;
        this.reviewedBookingIds = reviewed;
        this.waitlist = wl;
      } finally { this.loading = false; }
    },
    openReview(b) {
      this.reviewTarget = b;
      this.reviewRating = 5;
      this.hoverRating = 0;
      this.reviewBody = "";
      this.$nextTick(() => {
        const el = document.getElementById("reviewModal");
        if (!el) return;
        this.reviewModalInst = bootstrap.Modal.getOrCreateInstance(el);
        this.reviewModalInst.show();
      });
    },
    async submitReview() {
      if (!this.reviewTarget) return;
      this.reviewSaving = true;
      try {
        await api.submitReview({ booking_id: this.reviewTarget.id, rating: this.reviewRating, body: this.reviewBody });
        this.reviewedBookingIds = [...this.reviewedBookingIds, this.reviewTarget.id];
        store.toast({ title: "Review submitted!", body: "Thanks for sharing your experience.", variant: "success" });
        bootstrap.Modal.getInstance(document.getElementById("reviewModal"))?.hide();
      } catch (e) {
        store.toast({ title: "Could not submit", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.reviewSaving = false; }
    },
    async leaveWaitlist(w) {
      this.waitlistLeaving = w.trek_id;
      try {
        await api.leaveWaitlist(w.trek_id);
        this.waitlist = this.waitlist.filter(x => x.trek_id !== w.trek_id);
        store.toast({ title: "Left waitlist", body: w.trek_name, variant: "secondary" });
      } catch (e) {
        store.toast({ title: "Error", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.waitlistLeaving = null; }
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
        await api.exportBookings();
        store.toast({ title: "Export queued", body: "Check your email — the CSV will arrive shortly.", variant: "success", delay: 5000 });
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
    async generatePlan(forceRefresh = false) {
      if (!this.planTrek) return;
      const trekId = this.planTrek.trek_id || this.planTrek.trek.id;
      const cacheKey = "tma:itinerary:" + trekId;

      if (!forceRefresh) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw);
            this.planResult = cached.data;
            this.planCached = true;
            this.planCachedAt = util.fmtDate(cached.savedAt);
            return;
          }
        } catch (_) { /* corrupt entry — fall through to generate */ }
      }

      this.planLoading = true;
      this.planError = "";
      this.planResult = null;
      this.planCached = false;
      this.planCachedAt = null;
      try {
        const result = await api.aiItinerary(trekId, {});
        this.planResult = result;
        localStorage.setItem(cacheKey, JSON.stringify({ data: result, savedAt: new Date().toISOString() }));
      } catch (e) {
        this.planError = e?.response?.data?.detail || "AI service unavailable. Please try again.";
      } finally {
        this.planLoading = false;
      }
    },
  },
  created() { this.reload(); }
};
