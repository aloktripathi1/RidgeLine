/* Admin — trek management. Table + create/edit/delete via Bootstrap modals. */
window.AdminTreksView = {
  data() {
    return {
      treks: [], staff: [], loading: true,
      // edit form
      form: this.blank(),
      mode: "create", // create | edit
      submitted: false, saving: false,
      pendingDelete: null,
      deleteLoading: false,
      _modal: null, _confirm: null,
      // AI description enhancer
      aiDescLoading: false,
    };
  },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <div>
          <h1 class="display-serif display-6 mb-1">Trek management</h1>
          <p class="text-muted mb-0">Curate the catalog and assign trek staff.</p>
        </div>
        <button class="btn btn-ridge" @click="openCreate"><i class="bi bi-plus-lg"></i> New trek</button>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-ridge"></div></div>

      <div v-else class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-4">Trek</th>
                <th class="d-none d-md-table-cell">Difficulty</th>
                <th class="d-none d-md-table-cell">Status</th>
                <th class="d-none d-lg-table-cell">Slots</th>
                <th class="d-none d-lg-table-cell">Staff</th>
                <th class="d-none d-md-table-cell">Price</th>
                <th class="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in treks" :key="t.id">
                <td class="ps-4">
                  <div class="fw-semibold">{{ t.name }}</div>
                  <div class="small text-muted">
                    <i class="bi bi-geo-alt"></i> {{ t.location }} · {{ fmtDate(t.start_date) }}
                  </div>
                </td>
                <td class="d-none d-md-table-cell">
                  <span class="badge" :class="diffCls(t.difficulty)">{{ t.difficulty }}</span>
                </td>
                <td class="d-none d-md-table-cell">
                  <span class="badge" :class="stCls(t.status)">{{ t.status }}</span>
                </td>
                <td class="d-none d-lg-table-cell text-body-secondary">{{ t.available_slots }} / {{ t.max_slots }}</td>
                <td class="d-none d-lg-table-cell text-body-secondary">{{ staffName(t.staff_id) }}</td>
                <td class="d-none d-md-table-cell fw-semibold">{{ inr(t.price) }}</td>
                <td class="text-end pe-4">
                  <button class="btn btn-sm btn-outline-secondary me-1" @click="openEdit(t)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="askDelete(t)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Edit / create modal -->
      <div class="modal fade" id="trekFormModal" tabindex="-1" aria-hidden="true" ref="formModal">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header">
              <h5 class="modal-title display-serif">{{ mode === 'create' ? 'New trek' : 'Edit trek' }}</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="save" novalidate :class="{ 'was-validated': submitted }" id="trekForm">
                <div class="row g-3">
                  <div class="col-md-8">
                    <label class="form-label small fw-semibold text-uppercase">Name</label>
                    <input v-model="form.name" type="text" class="form-control" required minlength="3" />
                    <div class="invalid-feedback">Name is required.</div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-semibold text-uppercase">Difficulty</label>
                    <select v-model="form.difficulty" class="form-select" required>
                      <option>Easy</option><option>Moderate</option><option>Hard</option>
                    </select>
                  </div>

                  <div class="col-md-6">
                    <label class="form-label small fw-semibold text-uppercase">Location</label>
                    <input v-model="form.location" type="text" class="form-control" required />
                    <div class="invalid-feedback">Location is required.</div>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-semibold text-uppercase">Start date</label>
                    <input v-model="form.start_date" type="date" class="form-control" required />
                    <div class="invalid-feedback">Pick a start date.</div>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-semibold text-uppercase">Duration</label>
                    <div class="input-group">
                      <input v-model.number="form.duration_days" type="number" class="form-control" min="1" max="30" required />
                      <span class="input-group-text">days</span>
                    </div>
                  </div>

                  <div class="col-md-4">
                    <label class="form-label small fw-semibold text-uppercase">Price (₹)</label>
                    <input v-model.number="form.price" type="number" class="form-control" min="0" step="500" required />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-semibold text-uppercase">Max slots</label>
                    <input v-model.number="form.max_slots" type="number" class="form-control" min="1" max="100" required />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-semibold text-uppercase">Status</label>
                    <select v-model="form.status" class="form-select">
                      <option>Pending</option><option>Approved</option><option>Open</option>
                      <option>Closed</option><option>Completed</option>
                    </select>
                  </div>

                  <div class="col-md-12">
                    <label class="form-label small fw-semibold text-uppercase">Assigned staff</label>
                    <select v-model.number="form.staff_id" class="form-select">
                      <option :value="null">— Unassigned —</option>
                      <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.name }} · {{ s.email }}</option>
                    </select>
                  </div>

                  <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="form-label small fw-semibold text-uppercase mb-0">Description</label>
                      <button type="button" class="btn btn-sm btn-outline-ridge py-0 px-2"
                              style="font-size:0.72rem;"
                              :disabled="aiDescLoading || !form.name || !form.location"
                              @click="aiEnhanceDesc">
                        <span v-if="aiDescLoading" class="spinner-border spinner-border-sm me-1" style="width:.65rem;height:.65rem;"></span>
                        <i v-else class="bi bi-stars me-1"></i>
                        {{ aiDescLoading ? 'Generating…' : 'AI Enhance' }}
                      </button>
                    </div>
                    <textarea v-model="form.description" class="form-control" rows="3" required minlength="20"></textarea>
                    <div class="invalid-feedback">A short description helps trekkers decide (min 20 chars).</div>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-link text-muted" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-ridge" type="submit" form="trekForm" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                {{ mode === 'create' ? 'Create trek' : 'Save changes' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div class="modal fade" id="trekDelModal" tabindex="-1" aria-hidden="true" ref="delModal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title display-serif">Delete this trek?</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body pt-2">
              <p class="mb-0 text-body-secondary">
                <strong>{{ pendingDelete?.name }}</strong> will be removed permanently along with its associations.
                Existing bookings will be retained as historical records.
              </p>
            </div>
            <div class="modal-footer border-0">
              <button class="btn btn-link text-muted" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-danger" data-bs-dismiss="modal" @click="confirmDelete">Delete trek</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  methods: {
    inr: util.inr,
    fmtDate: util.fmtDate,
    diffCls: util.difficultyClass,
    stCls: util.statusClass,
    staffName(id) {
      const s = this.staff.find(s => s.id === id);
      return s ? s.name : "—";
    },
    blank() {
      return {
        id: null, name: "", location: "", difficulty: "Moderate",
        duration_days: 5, price: 9500, max_slots: 20, status: "Pending",
        staff_id: null, description: "",
        start_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10),
      };
    },
    async reload() {
      this.loading = true;
      try {
        const [treks, users] = await Promise.all([api.listTreks(), api.listUsers()]);
        this.treks = treks;
        this.staff = users.filter(u => u.role === "staff");
      } finally { this.loading = false; }
    },
    openCreate() {
      this.mode = "create"; this.form = this.blank(); this.submitted = false; this.aiDescLoading = false;
      bootstrap.Modal.getOrCreateInstance(this.$refs.formModal).show();
    },
    openEdit(t) {
      this.mode = "edit"; this.form = { ...t }; this.submitted = false; this.aiDescLoading = false;
      bootstrap.Modal.getOrCreateInstance(this.$refs.formModal).show();
    },
    askDelete(t) {
      this.pendingDelete = t;
      bootstrap.Modal.getOrCreateInstance(this.$refs.delModal).show();
    },
    async confirmDelete() {
      const t = this.pendingDelete; if (!t) return;
      try {
        await api.deleteTrek(t.id);
        store.toast({ title: "Trek deleted", body: t.name, variant: "secondary" });
        await this.reload();
      } catch (e) {
        store.toast({ title: "Could not delete", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.pendingDelete = null; }
    },
    async aiEnhanceDesc() {
      if (!this.form.name || !this.form.location) return;
      this.aiDescLoading = true;
      try {
        const res = await api.aiDescribe({
          name: this.form.name,
          location: this.form.location,
          difficulty: this.form.difficulty || "Moderate",
          duration_days: this.form.duration_days || 5,
          price: this.form.price || 0,
          highlights: "",
        });
        this.form.description = res.description;
        store.toast({ title: "Description generated", body: "Review and edit as needed.", variant: "success" });
      } catch (e) {
        store.toast({ title: "AI unavailable", body: e?.response?.data?.detail || "Check ANTHROPIC_API_KEY is set.", variant: "danger" });
      } finally {
        this.aiDescLoading = false;
      }
    },
    async save(e) {
      this.submitted = true;
      if (!e.target.checkValidity()) return;
      this.saving = true;
      try {
        if (this.mode === "create") {
          await api.createTrek(this.form);
          store.toast({ title: "Trek created", body: this.form.name, variant: "success" });
        } else {
          await api.updateTrek(this.form.id, this.form);
          store.toast({ title: "Trek updated", body: this.form.name, variant: "success" });
        }
        bootstrap.Modal.getInstance(this.$refs.formModal).hide();
        await this.reload();
      } catch (e) {
        store.toast({ title: "Save failed", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.saving = false; }
    }
  },
  created() { this.reload(); }
};
