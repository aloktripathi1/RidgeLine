/* Trekker catalog — main landing.
   Sidebar filters (Difficulty, Location, Duration) + debounced search.
*/
window.CatalogView = {
  components: { TrekCard: window.TrekCard, TrekModal: window.TrekModal, LandingSections: window.LandingSections, CheckoutModal: window.CheckoutModal },
  data() {
    return {
      treks: [],
      loading: true,
      query: "",
      qDebounced: "",
      difficulty: new Set(),
      location: "",
      durationMax: 12,
      selected: null,
      modalInst: null,
      checkoutTrek: null,
    };
  },
  template: /*html*/`
    <div>
      <!-- Hero -->
      <section class="position-relative overflow-hidden border-bottom"
               style="background:#1c1f1a;">
        <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=70"
             alt="Himalayan ridge at dusk"
             class="position-absolute top-0 start-0 w-100 h-100"
             style="object-fit:cover; opacity:.55;"
             @error="$event.target.style.display='none'" />
        <div class="position-absolute top-0 start-0 w-100 h-100"
             style="background:linear-gradient(180deg, rgba(20,25,20,.45) 0%, rgba(20,25,20,.15) 35%, rgba(20,25,20,.75) 100%);"></div>
        <div class="container-xxl py-5 py-lg-6 position-relative text-white d-flex flex-column justify-content-end" style="z-index:1; min-height:88vh;">
          <div class="row align-items-end" style="min-height:340px;">
            <div class="col-lg-8 py-4">
              <span class="badge bg-white text-ridge fw-semibold mb-3">
                <i class="bi bi-circle-fill text-success me-1" style="font-size:.5rem;"></i>
                2026 Season · Now booking
              </span>
              <h1 class="display-serif display-2 mb-3" style="line-height:1; letter-spacing:-0.02em;">
                Find your<br/>next ridge.
              </h1>
              <p class="lead mb-4 opacity-90" style="max-width:52ch;">
                Guided treks across the Indian Himalaya — from gentle weekend ridges to
                high-altitude crossings. Browse, filter, and book in minutes.
              </p>
              <div class="d-flex flex-wrap gap-2">
                <a href="#trek-grid" class="btn btn-light btn-lg fw-semibold">
                  Browse treks <i class="bi bi-arrow-down ms-1"></i>
                </a>
                <router-link v-if="!isAuthed" to="/register" class="btn btn-outline-light btn-lg">
                  Create account
                </router-link>
              </div>
            </div>
            <div class="col-lg-4 py-4">
              <div class="d-flex gap-4 justify-content-lg-end">
                <div class="text-lg-end">
                  <div class="stat-num text-white">{{ treks.length }}</div>
                  <div class="small opacity-75 text-uppercase">Treks live</div>
                </div>
                <div class="vr opacity-50"></div>
                <div class="text-lg-end">
                  <div class="stat-num text-white">{{ openCount }}</div>
                  <div class="small opacity-75 text-uppercase">Open now</div>
                </div>
                <div class="vr opacity-50"></div>
                <div class="text-lg-end">
                  <div class="stat-num text-white">4</div>
                  <div class="small opacity-75 text-uppercase">States</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured next departure -->
      <section v-if="nextDeparture" class="bg-white border-bottom">
        <div class="container-xxl py-4">
          <div class="row align-items-center g-3">
            <div class="col-md-auto">
              <span class="badge text-bg-light border fw-semibold">
                <i class="bi bi-stars text-ridge"></i> Next departure
              </span>
            </div>
            <div class="col-md d-flex align-items-center gap-3">
              <img :src="nextDeparture.image_url"
                   :alt="nextDeparture.name"
                   class="rounded shadow-sm flex-shrink-0"
                   style="width:72px;height:72px;object-fit:cover;"
                   @error="$event.target.style.display='none'" />
              <div>
                <div class="fw-semibold display-serif fs-5">{{ nextDeparture.name }}</div>
                <div class="small text-muted">
                  <i class="bi bi-geo-alt"></i> {{ nextDeparture.location }} ·
                  <i class="bi bi-calendar3"></i> Departs {{ fmtDate(nextDeparture.start_date) }} ·
                  <span class="text-ridge fw-semibold">{{ nextDeparture.available_slots }} slots left</span>
                </div>
              </div>
            </div>
            <div class="col-md-auto">
              <button class="btn btn-ridge" @click="openTrek(nextDeparture)">
                View details <i class="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="container-xxl py-4 py-lg-5">
        <div class="row g-4">
          <!-- Filter sidebar -->
          <aside class="col-lg-3">
            <div class="filter-sticky">
              <div class="card border-0 shadow-sm">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="text-uppercase small fw-bold mb-0">Filters</h6>
                    <button class="btn btn-sm btn-link text-muted p-0" @click="resetFilters">Reset</button>
                  </div>

                  <!-- Search -->
                  <label class="form-label small fw-semibold text-uppercase">Search</label>
                  <div class="input-group input-group-sm mb-4">
                    <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                    <input v-model="query" @input="onSearch" type="text" class="form-control" placeholder="e.g. Sandakphu" />
                  </div>

                  <!-- Difficulty -->
                  <label class="form-label small fw-semibold text-uppercase">Difficulty</label>
                  <div class="mb-4">
                    <div v-for="d in ['Easy','Moderate','Hard']" :key="d" class="form-check">
                      <input class="form-check-input" type="checkbox"
                             :id="'diff-'+d"
                             :checked="difficulty.has(d)"
                             @change="toggleDiff(d)" />
                      <label class="form-check-label d-flex justify-content-between" :for="'diff-'+d">
                        <span>{{ d }}</span>
                        <span class="text-muted small">{{ countByDifficulty(d) }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Location -->
                  <label class="form-label small fw-semibold text-uppercase">Location</label>
                  <select v-model="location" class="form-select form-select-sm mb-4">
                    <option value="">All states</option>
                    <option v-for="loc in locations" :key="loc">{{ loc }}</option>
                  </select>

                  <!-- Duration -->
                  <label class="form-label small fw-semibold text-uppercase d-flex justify-content-between">
                    <span>Max duration</span>
                    <span class="text-muted">{{ durationMax }} days</span>
                  </label>
                  <input v-model.number="durationMax" type="range" class="form-range" min="3" max="14" step="1" />
                </div>
              </div>
            </div>
          </aside>

          <!-- Trek grid -->
          <div class="col-lg-9" id="trek-grid">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 class="h4 display-serif mb-0">Available treks</h2>
                <div class="small text-muted">{{ filtered.length }} match{{ filtered.length === 1 ? '' : 'es' }}</div>
              </div>
              <div v-if="qDebounced" class="small">
                <span class="text-muted">Searching for</span>
                <span class="badge text-bg-light border ms-1">"{{ qDebounced }}"</span>
              </div>
            </div>

            <div v-if="loading" class="row g-4">
              <div v-for="i in 6" :key="i" class="col-sm-6 col-xl-4">
                <div class="card border-0 shadow-sm">
                  <div class="card-trek-img placeholder-glow"></div>
                  <div class="card-body">
                    <div class="placeholder col-7 mb-2"></div>
                    <div class="placeholder col-10"></div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="filtered.length === 0" class="text-center py-5 my-4">
              <i class="bi bi-binoculars display-4 text-muted"></i>
              <h3 class="display-serif h5 mt-3">No treks match those filters</h3>
              <p class="text-muted">Try loosening the difficulty or duration.</p>
              <button class="btn btn-outline-ridge" @click="resetFilters">Clear filters</button>
            </div>

            <div v-else class="row g-4">
              <div v-for="t in filtered" :key="t.id" class="col-sm-6 col-xl-4">
                <trek-card :trek="t" @open="openTrek" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <landing-sections @register="$router.push('/register')" />

      <trek-modal :trek="selected" @checkout="openCheckout" @booked="reload" />
      <checkout-modal :trek="checkoutTrek" @booked="reload" ref="checkout" />
    </div>
  `,
  computed: {
    locations() { return [...new Set(this.treks.map(t => t.location))].sort(); },
    openCount() { return this.treks.filter(t => t.status === "Open").length; },
    isAuthed() { return !!store.state.user; },
    nextDeparture() {
      const open = this.treks.filter(t => t.status === "Open" && t.available_slots > 0);
      if (!open.length) return null;
      return open.slice().sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
    },
    filtered() {
      const q = this.qDebounced.toLowerCase();
      return this.treks.filter(t => {
        if (this.difficulty.size && !this.difficulty.has(t.difficulty)) return false;
        if (this.location && t.location !== this.location) return false;
        if (t.duration_days > this.durationMax) return false;
        if (q && !(t.name + " " + t.location + " " + t.description).toLowerCase().includes(q)) return false;
        return true;
      });
    }
  },
  methods: {
    fmtDate: util.fmtDate,
    async reload() {
      this.loading = true;
      try { this.treks = await api.listTreks(); }
      finally { this.loading = false; }
    },
    countByDifficulty(d) { return this.treks.filter(t => t.difficulty === d).length; },
    toggleDiff(d) {
      // Mutate the Set then force reactivity by reassigning
      const s = new Set(this.difficulty);
      s.has(d) ? s.delete(d) : s.add(d);
      this.difficulty = s;
    },
    resetFilters() {
      this.query = ""; this.qDebounced = "";
      this.difficulty = new Set();
      this.location = "";
      this.durationMax = 12;
    },
    openTrek(t) {
      this.selected = t;
      this.$nextTick(() => {
        const el = document.getElementById("trekModal");
        if (!el) return;
        this.modalInst = bootstrap.Modal.getOrCreateInstance(el);
        this.modalInst.show();
      });
    },
    openCheckout(t) {
      this.checkoutTrek = t;
      this.$nextTick(() => {
        if (this.$refs.checkout && this.$refs.checkout.reset) this.$refs.checkout.reset();
        const el = document.getElementById("checkoutModal");
        if (!el) return;
        // small delay so the trek modal finishes hiding before checkout opens
        setTimeout(() => bootstrap.Modal.getOrCreateInstance(el).show(), 250);
      });
    }
  },
  created() {
    this.onSearch = util.debounce(() => { this.qDebounced = this.query; }, 350);
    this.reload();
  }
};
