/* Admin dashboard — metrics cards + 2 Chart.js charts. */
window.AdminDashboardView = {
  data() {
    return { metrics: null, loading: true, _charts: [] };
  },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <div>
          <h1 class="display-serif display-6 mb-1">Operations</h1>
          <p class="text-muted mb-0">A quick read on the season.</p>
        </div>
        <div class="d-flex align-items-center gap-2 small text-muted">
          <span class="badge text-bg-light border">
            <i class="bi bi-circle-fill text-success me-1" style="font-size:.5rem;"></i>
            Live
          </span>
          <span>Updated just now</span>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-ridge"></div></div>

      <div v-else>
        <!-- Metric cards -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="small text-uppercase text-muted">Total treks</div>
                  <i class="bi bi-map text-muted"></i>
                </div>
                <div class="stat-num text-ridge mt-2">{{ metrics.total_treks }}</div>
                <div class="small text-success mt-1"><i class="bi bi-arrow-up-short"></i> {{ metrics.open_treks }} open now</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="small text-uppercase text-muted">Active users</div>
                  <i class="bi bi-people text-muted"></i>
                </div>
                <div class="stat-num text-ridge mt-2">{{ metrics.active_users }}</div>
                <div class="small text-muted mt-1">trekkers + staff + admins</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="small text-uppercase text-muted">Total bookings</div>
                  <i class="bi bi-suitcase2 text-muted"></i>
                </div>
                <div class="stat-num text-ridge mt-2">{{ metrics.total_bookings }}</div>
                <div class="small text-muted mt-1">across all treks</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="small text-uppercase text-muted">Avg load</div>
                  <i class="bi bi-bar-chart text-muted"></i>
                </div>
                <div class="stat-num text-ridge mt-2">{{ avgLoad }}%</div>
                <div class="small text-muted mt-1">slots filled per trek</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="row g-3">
          <div class="col-lg-7">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 class="text-uppercase small fw-bold mb-1">Popular treks</h6>
                    <div class="small text-muted">By non-cancelled bookings</div>
                  </div>
                </div>
                <div class="chart-box"><canvas ref="popular"></canvas></div>
              </div>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 class="text-uppercase small fw-bold mb-1">Participation trend</h6>
                    <div class="small text-muted">Bookings, last 6 months</div>
                  </div>
                </div>
                <div class="chart-box"><canvas ref="trend"></canvas></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick links -->
        <div class="row g-3 mt-1">
          <div class="col-md-6">
            <router-link to="/admin/treks" class="card border-0 shadow-sm text-decoration-none h-100 trek-card">
              <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="display-serif mb-1 text-ridge">Manage treks</h5>
                  <div class="text-muted small">Create, edit, assign staff, set status.</div>
                </div>
                <i class="bi bi-arrow-right fs-4 text-ridge"></i>
              </div>
            </router-link>
          </div>
          <div class="col-md-6">
            <router-link to="/admin/users" class="card border-0 shadow-sm text-decoration-none h-100 trek-card">
              <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="display-serif mb-1 text-ridge">Users &amp; staff</h5>
                  <div class="text-muted small">Add staff, block accounts, manage roles.</div>
                </div>
                <i class="bi bi-arrow-right fs-4 text-ridge"></i>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    avgLoad() {
      if (!this.metrics) return 0;
      // computed on-the-fly from trek list - re-fetch lightly
      return this._avg || 0;
    }
  },
  methods: {
    async reload() {
      this.loading = true;
      try {
        const [m, treks] = await Promise.all([api.adminMetrics(), api.listTreks()]);
        this.metrics = m;
        const total = treks.reduce((s, t) => s + t.max_slots, 0);
        const taken = treks.reduce((s, t) => s + (t.max_slots - t.available_slots), 0);
        this._avg = total ? Math.round((taken / total) * 100) : 0;
      } finally { this.loading = false; }
      this.$nextTick(this.renderCharts);
    },
    destroyCharts() {
      for (const c of this._charts) c.destroy();
      this._charts = [];
    },
    renderCharts() {
      this.destroyCharts();
      const RIDGE = "#2f4a3a";
      const ACCENT = "#c9913a";
      Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
      Chart.defaults.color = "#5c6155";

      // Popular
      const p = this.$refs.popular?.getContext("2d");
      if (p) {
        this._charts.push(new Chart(p, {
          type: "bar",
          data: {
            labels: this.metrics.popular.map(x => x.trek),
            datasets: [{
              label: "Bookings",
              data: this.metrics.popular.map(x => x.booked),
              backgroundColor: RIDGE,
              borderRadius: 6,
              maxBarThickness: 28,
            }],
          },
          options: {
            indexAxis: "y",
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { precision: 0 } },
              y: { grid: { display: false } }
            },
          }
        }));
      }
      // Trend
      const t = this.$refs.trend?.getContext("2d");
      if (t) {
        const grad = t.createLinearGradient(0, 0, 0, 260);
        grad.addColorStop(0, "rgba(47,74,58,.28)");
        grad.addColorStop(1, "rgba(47,74,58,0)");
        this._charts.push(new Chart(t, {
          type: "line",
          data: {
            labels: this.metrics.trend.map(x => x.month),
            datasets: [{
              label: "Bookings",
              data: this.metrics.trend.map(x => x.bookings),
              borderColor: RIDGE,
              backgroundColor: grad,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: ACCENT,
              pointRadius: 4,
              pointHoverRadius: 6,
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { precision: 0 } },
            }
          }
        }));
      }
    }
  },
  created() { this.reload(); },
  beforeUnmount() { this.destroyCharts(); }
};
