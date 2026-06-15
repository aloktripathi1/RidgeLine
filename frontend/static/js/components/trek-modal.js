/* Bootstrap modal showing full trek details with Book Now CTA. */
window.TrekModal = {
  props: ["trek"],
  emits: ["booked", "checkout"],
  data() { return {}; },
  template: /*html*/`
    <div class="modal fade" id="trekModal" tabindex="-1" aria-hidden="true" ref="root">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg" v-if="trek">
          <div class="card-trek-img" style="aspect-ratio: 24/9;">
            <img v-if="trek.image_url" :src="trek.image_url" :alt="trek.name"
                 class="w-100 h-100" style="object-fit:cover;" @error="onImgError" />
            <span v-else class="placeholder-label">cover · {{ trek.location.toLowerCase() }}</span>
            <div class="position-absolute top-0 start-0 end-0 bottom-0"
                 style="background:linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%);pointer-events:none;"></div>
            <button type="button" class="btn btn-sm btn-light position-absolute top-0 end-0 m-3 rounded-circle"
                    data-bs-dismiss="modal" aria-label="Close">
              <i class="bi bi-x-lg"></i>
            </button>
            <div class="position-absolute bottom-0 start-0 m-3 d-flex gap-2 align-items-center">
              <span class="badge" :class="diffCls">{{ trek.difficulty }}</span>
              <span class="badge" :class="stCls">{{ trek.status }}</span>
              <span class="text-white small fw-semibold ms-1"
                    style="text-shadow:0 1px 3px rgba(0,0,0,.6);">
                <i class="bi bi-geo-alt-fill"></i> {{ trek.location }}
              </span>
            </div>
          </div>
          <div class="modal-body p-4">
            <h2 class="display-serif h3 mb-1">{{ trek.name }}</h2>
            <div class="text-muted mb-3">
              <i class="bi bi-geo-alt"></i> {{ trek.location }}
            </div>

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
                <div class="fw-semibold">{{ trek.available_slots }} / {{ trek.max_slots }}</div>
              </div>
              <div class="col-6 col-md-3">
                <div class="small text-muted">Price</div>
                <div class="fw-semibold text-ridge">{{ inr(trek.price) }}</div>
              </div>
            </div>

            <h6 class="text-uppercase small text-muted mb-2">About this trek</h6>
            <p style="text-wrap:pretty;">{{ trek.description }}</p>
          </div>
          <div class="modal-footer bg-light border-0">
            <button class="btn btn-link text-muted" data-bs-dismiss="modal">Maybe later</button>
            <button v-if="canBook"
                    class="btn btn-ridge"
                    @click="proceedToCheckout">
              <i class="bi bi-bag-check me-1"></i>
              Book now · {{ inr(trek.price) }}
            </button>
            <button v-else class="btn btn-ridge" disabled>
              {{ blockReason }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    diffCls() { return util.difficultyClass(this.trek?.difficulty); },
    stCls()   { return util.statusClass(this.trek?.status); },
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
    }
  },
  methods: {
    inr: util.inr,
    fmtDate: util.fmtDate,
    onImgError(e) { e.target.style.display = "none"; },
    proceedToCheckout() {
      // Hand off to the checkout flow: hide this modal, ask the parent to open checkout.
      const inst = bootstrap.Modal.getInstance(this.$refs.root);
      if (inst) inst.hide();
      this.$emit("checkout", this.trek);
    }
  }
};
