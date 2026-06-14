/* Reusable trek card for catalog/staff dashboard. */
window.TrekCard = {
  props: ["trek", "ctaLabel", "showStatus"],
  emits: ["open"],
  template: /*html*/`
    <article class="card trek-card h-100 border-0 shadow-sm overflow-hidden">
      <div class="card-trek-img">
        <img v-if="trek.image_url" :src="trek.image_url" :alt="trek.name"
             class="w-100 h-100" style="object-fit:cover;"
             loading="lazy" @error="onImgError" />
        <span v-else class="placeholder-label">photo · {{ trek.location.toLowerCase() }}</span>
        <div class="position-absolute top-0 start-0 end-0 bottom-0"
             style="background:linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,.35) 100%);pointer-events:none;"></div>
        <div class="position-absolute top-0 start-0 m-2 d-flex gap-1">
          <span class="badge" :class="diffCls">{{ trek.difficulty }}</span>
          <span v-if="showStatus" class="badge" :class="stCls">{{ trek.status }}</span>
        </div>
        <div class="position-absolute top-0 end-0 m-2">
          <span class="badge text-bg-light border">
            <i class="bi bi-clock"></i> {{ trek.duration_days }}d
          </span>
        </div>
        <div class="position-absolute bottom-0 start-0 m-2 small fw-semibold text-white"
             style="text-shadow:0 1px 3px rgba(0,0,0,.6);">
          <i class="bi bi-geo-alt-fill"></i> {{ trek.location }}
        </div>
      </div>
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <h3 class="h5 mb-1 display-serif">{{ trek.name }}</h3>
        </div>
        <div class="small text-muted mb-2">
          <i class="bi bi-geo-alt"></i> {{ trek.location }} · departs {{ fmtDate(trek.start_date) }}
        </div>
        <p class="small text-body-secondary mb-3" style="text-wrap:pretty;">
          {{ trunc(trek.description) }}
        </p>
        <div class="d-flex justify-content-between align-items-end mt-auto">
          <div>
            <div class="fw-bold text-ridge fs-5">{{ inr(trek.price) }}</div>
            <div class="small text-muted">{{ trek.available_slots }} / {{ trek.max_slots }} slots left</div>
          </div>
          <button class="btn btn-sm btn-ridge" @click="$emit('open', trek)">
            {{ ctaLabel || 'View details' }}
            <i class="bi bi-arrow-right"></i>
          </button>
        </div>
      </div>
    </article>
  `,
  computed: {
    diffCls() { return util.difficultyClass(this.trek.difficulty); },
    stCls()   { return util.statusClass(this.trek.status); },
  },
  methods: {
    formattedPrice() {
      if (!this.trek.price) return 'Contact us';
      return '₹' + this.trek.price.toLocaleString('en-IN');
    },
    inr: util.inr,
    fmtDate: util.fmtDate,
    trunc(s) { return s.length > 120 ? s.slice(0, 118) + "…" : s; },
    onImgError(e) { e.target.style.display = "none"; }
  }
};
