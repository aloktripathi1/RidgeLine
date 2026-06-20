/* Trek detail modal — tabs: Details | Reviews | Fitness Check. */
window.TrekModal = {
  props: ["trek"],
  emits: ["booked", "checkout"],
  data() {
    return {
      tab: "details",
      // Reviews
      reviews: [], avgRating: 0, reviewCount: 0,
      reviewSummary: null, reviewSummaryLoading: false,
      // Fitness check
      fitForm: { age: 28, fitness: "active", health_notes: "", previous_treks: 0 },
      fitLoading: false, fitResult: null, fitError: "",
      // Waitlist
      onWaitlist: false, waitlistLoading: false, waitlistPosition: null,
    };
  },
  template: /*html*/`
    <div class="modal fade" id="trekModal" tabindex="-1" aria-hidden="true" ref="root">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg" v-if="trek">

          <!-- Cover image -->
          <div class="card-trek-img" style="aspect-ratio: 24/9;">
            <img v-if="trek.image_url" :src="trek.image_url" :alt="trek.name"
                 class="w-100 h-100" style="object-fit:cover;" @error="onImgError" />
            <span v-else class="placeholder-label">cover · {{ trek.location.toLowerCase() }}</span>
            <div class="position-absolute top-0 start-0 end-0 bottom-0"
                 style="background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 40%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%);pointer-events:none;"></div>
            <button type="button" class="btn btn-sm btn-light position-absolute top-0 end-0 m-3 rounded-circle"
                    data-bs-dismiss="modal"><i class="bi bi-x-lg"></i></button>
            <div class="position-absolute bottom-0 start-0 m-3 d-flex gap-2 align-items-center">
              <span class="badge" :class="diffCls">{{ trek.difficulty }}</span>
              <span class="badge" :class="stCls">{{ trek.status }}</span>
              <span class="text-white small fw-semibold ms-1" style="text-shadow:0 1px 3px rgba(0,0,0,.6);">
                <i class="bi bi-geo-alt-fill"></i> {{ trek.location }}
              </span>
            </div>
          </div>

          <!-- Tab bar -->
          <div class="px-4 pt-3 pb-0 border-bottom">
            <h2 class="display-serif h4 mb-2">{{ trek.name }}</h2>
            <ul class="nav nav-tabs border-0 gap-1">
              <li class="nav-item">
                <button class="nav-link px-3 py-1" :class="tab==='details'?'active':''" @click="tab='details'">
                  Details
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link px-3 py-1" :class="tab==='reviews'?'active':''" @click="switchTab('reviews')">
                  Reviews
                  <span v-if="reviewCount" class="badge bg-ridge ms-1" style="font-size:0.65rem;">{{ reviewCount }}</span>
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link px-3 py-1" :class="tab==='fitness'?'active':''" @click="tab='fitness'">
                  <i class="bi bi-heart-pulse me-1"></i>Fitness Check
                </button>
              </li>
            </ul>
          </div>

          <div class="modal-body p-4">

            <!-- ── Details tab ── -->
            <div v-if="tab==='details'">
              <div class="row g-3 mb-4">
                <div class="col-6 col-md-3">
                  <div class="small text-muted">Departs</div>
                  <div class="fw-semibold">{{ fmtDate(trek.start_date) }}</div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="small text-muted">Duration</div>
                  <div class="fw-semibold">{{ trek.duration_days }} days</div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="small text-muted">Slots</div>
                  <div class="fw-semibold" :class="trek.available_slots===0?'text-danger':''">
                    {{ trek.available_slots === 0 ? 'Full' : trek.available_slots + ' / ' + trek.max_slots }}
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="small text-muted">Price</div>
                  <div class="fw-semibold text-ridge">{{ inr(trek.price) }}</div>
                </div>
              </div>

              <!-- Star rating summary -->
              <div v-if="reviewCount" class="d-flex align-items-center gap-2 mb-3">
                <span class="fs-5 fw-bold text-ridge">{{ avgRating }}</span>
                <span>{{ starStr(avgRating) }}</span>
                <span class="small text-muted">({{ reviewCount }} review{{ reviewCount !== 1 ? 's' : '' }})</span>
              </div>

              <h6 class="text-uppercase small text-muted mb-2">About this trek</h6>
              <p style="text-wrap:pretty;">{{ trek.description }}</p>
            </div>

            <!-- ── Reviews tab ── -->
            <div v-if="tab==='reviews'">
              <div v-if="!reviewCount" class="text-center py-5 text-muted">
                <i class="bi bi-chat-square-dots display-5 d-block mb-2 opacity-25"></i>
                <p class="mb-0">No reviews yet. Be the first after your trek!</p>
              </div>
              <div v-else>
                <!-- AI summary -->
                <div v-if="reviewSummaryLoading" class="alert alert-light py-2 small">
                  <span class="spinner-border spinner-border-sm me-2"></span>Summarising reviews…
                </div>
                <div v-else-if="reviewSummary"
                     class="alert border-0 py-2 mb-3"
                     style="background:#f0f7f4;border-left:3px solid var(--ridge) !important;">
                  <div class="small fw-semibold text-ridge mb-1"><i class="bi bi-stars me-1"></i>AI Summary</div>
                  <div class="small">{{ reviewSummary }}</div>
                </div>

                <!-- Rating bar -->
                <div class="d-flex align-items-center gap-3 mb-3 p-3 bg-light rounded-3">
                  <div class="text-center">
                    <div class="display-4 fw-bold text-ridge lh-1">{{ avgRating }}</div>
                    <div class="small">{{ starStr(avgRating) }}</div>
                    <div class="text-muted" style="font-size:0.72rem;">{{ reviewCount }} reviews</div>
                  </div>
                  <div class="flex-grow-1">
                    <div v-for="star in [5,4,3,2,1]" :key="star" class="d-flex align-items-center gap-2 mb-1">
                      <span class="small text-muted" style="width:8px;">{{ star }}</span>
                      <div class="progress flex-grow-1" style="height:6px;">
                        <div class="progress-bar bg-ridge" :style="'width:' + barPct(star) + '%'"></div>
                      </div>
                      <span class="small text-muted" style="width:20px;">{{ starCount(star) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Review cards -->
                <div v-for="r in reviews" :key="r.id" class="mb-3 pb-3 border-bottom">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <div class="rounded-circle bg-ridge text-white d-inline-flex align-items-center justify-content-center fw-bold"
                         style="width:30px;height:30px;font-size:0.75rem;flex-shrink:0;">
                      {{ r.user_name[0].toUpperCase() }}
                    </div>
                    <div>
                      <div class="fw-semibold small">{{ r.user_name }}</div>
                      <div style="font-size:0.72rem;" class="text-muted">{{ fmtDate(r.created_at) }}</div>
                    </div>
                    <div class="ms-auto small">{{ starStr(r.rating) }}</div>
                  </div>
                  <p class="mb-0 small text-body-secondary" style="padding-left:38px;">{{ r.body }}</p>
                </div>
              </div>
            </div>

            <!-- ── Fitness Check tab ── -->
            <div v-if="tab==='fitness'">
              <p class="text-muted small mb-3">
                Answer a few questions and our AI will give you an honest assessment of whether this trek suits your current fitness.
              </p>

              <div v-if="!fitResult">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold text-uppercase">Your age</label>
                    <input v-model.number="fitForm.age" type="number" min="10" max="80" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold text-uppercase">Previous treks completed</label>
                    <input v-model.number="fitForm.previous_treks" type="number" min="0" class="form-control" />
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-semibold text-uppercase">Fitness level</label>
                    <div class="d-flex gap-2">
                      <button v-for="lvl in ['sedentary','active','athletic']" :key="lvl"
                              class="btn btn-sm flex-fill"
                              :class="fitForm.fitness===lvl ? 'btn-ridge' : 'btn-outline-secondary'"
                              @click="fitForm.fitness=lvl">
                        {{ lvl.charAt(0).toUpperCase() + lvl.slice(1) }}
                      </button>
                    </div>
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-semibold text-uppercase">Health notes <span class="fw-normal text-muted">(optional)</span></label>
                    <input v-model="fitForm.health_notes" type="text" class="form-control"
                           placeholder="e.g. mild asthma, knee injury in 2023" />
                  </div>
                </div>
                <div v-if="fitError" class="alert alert-danger mt-3 py-2 small">{{ fitError }}</div>
                <button class="btn btn-ridge w-100 mt-3" @click="runFitnessCheck" :disabled="fitLoading">
                  <span v-if="fitLoading" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-heart-pulse me-1"></i>
                  {{ fitLoading ? 'Analysing…' : 'Check my fitness' }}
                </button>
              </div>

              <!-- Fitness result -->
              <div v-else>
                <div class="text-center mb-3">
                  <div class="display-5" :class="verdictColor">
                    {{ fitResult.verdict === 'Go' ? '✅' : fitResult.verdict === 'Caution' ? '⚠️' : '🔄' }}
                  </div>
                  <div class="fw-bold fs-5 mt-1" :class="verdictColor">{{ fitResult.verdict }}</div>
                </div>
                <div class="alert border-0 py-2 mb-3" :class="verdictBg">
                  <p class="mb-0 small">{{ fitResult.reason }}</p>
                </div>
                <h6 class="text-uppercase small fw-bold text-muted mb-2">How to prepare</h6>
                <ul class="list-unstyled mb-3">
                  <li v-for="tip in fitResult.prep_tips" :key="tip" class="d-flex gap-2 mb-1 small">
                    <i class="bi bi-check2 text-ridge flex-shrink-0 mt-1"></i>
                    <span>{{ tip }}</span>
                  </li>
                </ul>
                <button class="btn btn-sm btn-outline-secondary" @click="fitResult=null">Re-check</button>
              </div>
            </div>
          </div>

          <div class="modal-footer bg-light border-0">
            <button class="btn btn-link text-muted" data-bs-dismiss="modal">Maybe later</button>
            <!-- Waitlist button when full -->
            <template v-if="trek.available_slots === 0 && trek.status === 'Open' && isTrekker">
              <button v-if="!onWaitlist"
                      class="btn btn-outline-ridge"
                      @click="joinWaitlist"
                      :disabled="waitlistLoading">
                <span v-if="waitlistLoading" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-hourglass-split me-1"></i>
                Join Waitlist
              </button>
              <button v-else
                      class="btn btn-outline-secondary"
                      @click="leaveWaitlist"
                      :disabled="waitlistLoading">
                <i class="bi bi-hourglass-top me-1"></i>
                On waitlist #{{ waitlistPosition }} · Leave
              </button>
            </template>
            <!-- Normal book button -->
            <template v-else>
              <button v-if="canBook" class="btn btn-ridge" @click="proceedToCheckout">
                <i class="bi bi-bag-check me-1"></i>Book now · {{ inr(trek.price) }}
              </button>
              <button v-else class="btn btn-ridge" disabled>{{ blockReason }}</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    diffCls()  { return util.difficultyClass(this.trek?.difficulty); },
    stCls()    { return util.statusClass(this.trek?.status); },
    isTrekker(){ return store.state.user?.role === "trekker"; },
    canBook() {
      if (!this.trek) return false;
      const u = store.state.user;
      if (!u || u.role !== "trekker") return false;
      return this.trek.status === "Open" && this.trek.available_slots > 0;
    },
    blockReason() {
      const u = store.state.user;
      if (!u) return "Login to book";
      if (u.role !== "trekker") return "Trekkers only";
      if (!this.trek) return "—";
      if (this.trek.status !== "Open") return "Not open for booking";
      return "Sold out";
    },
    verdictColor() {
      if (!this.fitResult) return "";
      return this.fitResult.verdict === "Go" ? "text-success" : this.fitResult.verdict === "Caution" ? "text-warning" : "text-danger";
    },
    verdictBg() {
      if (!this.fitResult) return "";
      return this.fitResult.verdict === "Go" ? "alert-success" : this.fitResult.verdict === "Caution" ? "alert-warning" : "alert-danger";
    },
  },
  methods: {
    inr: util.inr,
    fmtDate: util.fmtDate,
    onImgError(e) { e.target.style.display = "none"; },
    proceedToCheckout() {
      const inst = bootstrap.Modal.getInstance(this.$refs.root);
      if (inst) inst.hide();
      this.$emit("checkout", this.trek);
    },
    starStr(r) {
      const n = Math.round(r);
      return "★".repeat(n) + "☆".repeat(5 - n);
    },
    starCount(star) {
      return this.reviews.filter(r => r.rating === star).length;
    },
    barPct(star) {
      return this.reviewCount ? Math.round((this.starCount(star) / this.reviewCount) * 100) : 0;
    },
    async switchTab(t) {
      this.tab = t;
      if (t === "reviews" && this.trek) await this.loadReviews();
    },
    async loadReviews() {
      try {
        const data = await api.getTrekReviews(this.trek.id);
        this.reviews = data.reviews;
        this.avgRating = data.avg_rating;
        this.reviewCount = data.count;
        if (data.count >= 3) {
          this.reviewSummaryLoading = true;
          try {
            const s = await api.aiReviewSummary(this.trek.id);
            this.reviewSummary = s.summary;
          } catch (_) {}
          finally { this.reviewSummaryLoading = false; }
        }
      } catch (_) {}
    },
    async loadWaitlistStatus() {
      if (!this.isTrekker || !this.trek || this.trek.available_slots > 0) return;
      try {
        const data = await api.checkWaitlist(this.trek.id);
        this.onWaitlist = data.on_waitlist;
        this.waitlistPosition = data.position;
      } catch (_) {}
    },
    async joinWaitlist() {
      this.waitlistLoading = true;
      try {
        const data = await api.joinWaitlist(this.trek.id);
        this.onWaitlist = true;
        this.waitlistPosition = data.position;
        store.toast({ title: "Added to waitlist", body: `You are #${data.position} in line for ${this.trek.name}.`, variant: "success" });
      } catch (e) {
        store.toast({ title: "Could not join", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.waitlistLoading = false; }
    },
    async leaveWaitlist() {
      this.waitlistLoading = true;
      try {
        await api.leaveWaitlist(this.trek.id);
        this.onWaitlist = false;
        this.waitlistPosition = null;
        store.toast({ title: "Removed from waitlist", body: this.trek.name, variant: "secondary" });
      } catch (e) {
        store.toast({ title: "Error", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.waitlistLoading = false; }
    },
    async runFitnessCheck() {
      if (!this.trek) return;
      this.fitLoading = true;
      this.fitError = "";
      try {
        this.fitResult = await api.aiFitnessCheck({ trek_id: this.trek.id, ...this.fitForm });
      } catch (e) {
        this.fitError = e?.response?.data?.detail || "AI unavailable. Try again.";
      } finally { this.fitLoading = false; }
    },
  },
  watch: {
    trek(val) {
      if (val) {
        this.tab = "details";
        this.fitResult = null;
        this.fitError = "";
        this.reviews = [];
        this.avgRating = 0;
        this.reviewCount = 0;
        this.reviewSummary = null;
        this.onWaitlist = false;
        this.waitlistPosition = null;
        // Load review count for the badge + star snippet in Details tab
        api.getTrekReviews(val.id).then(d => {
          this.reviews = d.reviews;
          this.avgRating = d.avg_rating;
          this.reviewCount = d.count;
        }).catch(() => {});
        this.loadWaitlistStatus();
      }
    },
  },
};
