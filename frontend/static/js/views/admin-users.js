/* Admin — Users & Staff management.
   - Create new staff
   - Toggle active/blacklisted on any user
   - Assign staff to treks (handled via the trek edit form; surfaced here as a summary)
*/
window.AdminUsersView = {
  data() {
    return {
      users: [], treks: [], loading: true,
      tab: "trekkers", // trekkers | staff
      staffForm: { name: "", email: "", password: "staff123" },
      submitted: false, creating: false,
    };
  },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <div>
          <h1 class="display-serif display-6 mb-1">Users &amp; staff</h1>
          <p class="text-muted mb-0">Manage accounts, invite trek leaders, gate access.</p>
        </div>
      </div>

      <ul class="nav nav-pills mb-4 gap-2">
        <li class="nav-item">
          <button class="nav-link" :class="tab==='trekkers' ? 'bg-ridge text-white' : 'text-body'"
                  @click="tab='trekkers'">
            <i class="bi bi-compass"></i> Trekkers
            <span class="badge text-bg-light ms-1">{{ trekkers.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="tab==='staff' ? 'bg-ridge text-white' : 'text-body'"
                  @click="tab='staff'">
            <i class="bi bi-person-badge-fill"></i> Staff
            <span class="badge text-bg-light ms-1">{{ staff.length }}</span>
          </button>
        </li>
      </ul>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-ridge"></div></div>

      <!-- Trekkers -->
      <div v-else-if="tab === 'trekkers'" class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-4">Trekker</th>
                <th class="d-none d-md-table-cell">Email</th>
                <th>Status</th>
                <th class="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in trekkers" :key="u.id">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-2">
                    <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-ridge-soft text-ridge fw-bold"
                          style="width:36px;height:36px;font-size:.85rem;">{{ initials(u.name) }}</span>
                    <div>
                      <div class="fw-semibold">{{ u.name }}</div>
                      <div class="small text-muted d-md-none">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="d-none d-md-table-cell text-body-secondary">{{ u.email }}</td>
                <td>
                  <span v-if="u.blacklisted" class="badge text-bg-danger">Blacklisted</span>
                  <span v-else-if="!u.active" class="badge text-bg-secondary">Inactive</span>
                  <span v-else class="badge text-bg-success">Active</span>
                </td>
                <td class="text-end pe-4">
                  <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary" @click="setActive(u, !u.active)">
                      <i class="bi" :class="u.active ? 'bi-pause-circle' : 'bi-play-circle'"></i>
                      {{ u.active ? 'Deactivate' : 'Reactivate' }}
                    </button>
                    <button class="btn btn-sm" :class="u.blacklisted ? 'btn-outline-success' : 'btn-outline-danger'"
                            @click="setBlacklisted(u, !u.blacklisted)">
                      <i class="bi" :class="u.blacklisted ? 'bi-shield-check' : 'bi-slash-circle'"></i>
                      {{ u.blacklisted ? 'Unblock' : 'Blacklist' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Staff -->
      <div v-else class="row g-4">
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm">
            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-4">Staff</th>
                    <th>Assigned treks</th>
                    <th class="text-end pe-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in staff" :key="s.id">
                    <td class="ps-4">
                      <div class="fw-semibold">{{ s.name }}</div>
                      <div class="small text-muted">{{ s.email }}</div>
                    </td>
                    <td>
                      <div v-if="!assignedTreks(s.id).length" class="text-muted small">No treks yet</div>
                      <div v-else class="d-flex flex-wrap gap-1">
                        <span v-for="t in assignedTreks(s.id)" :key="t.id" class="badge text-bg-light border">
                          {{ t.name }}
                        </span>
                      </div>
                    </td>
                    <td class="text-end pe-4">
                      <button class="btn btn-sm btn-outline-secondary" @click="setActive(s, !s.active)">
                        {{ s.active ? 'Active' : 'Inactive' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p class="small text-muted mt-3 mb-0">
            <i class="bi bi-info-circle"></i> Assign staff to a specific trek from the
            <router-link to="/admin/treks" class="text-ridge fw-semibold">Trek management</router-link> screen.
          </p>
        </div>

        <div class="col-lg-5">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <h6 class="text-uppercase small fw-bold mb-3">Invite a new staff member</h6>
              <form @submit.prevent="createStaff" novalidate :class="{ 'was-validated': submitted }">
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Full name</label>
                  <input v-model.trim="staffForm.name" type="text" class="form-control" required minlength="2" />
                  <div class="invalid-feedback">Required.</div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Email</label>
                  <input v-model.trim="staffForm.email" type="email" class="form-control" required />
                  <div class="invalid-feedback">Enter a valid email.</div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Temporary password</label>
                  <input v-model="staffForm.password" type="text" class="form-control" required minlength="6" />
                  <div class="form-text">They'll be asked to reset on first login.</div>
                </div>
                <button class="btn btn-ridge w-100" :disabled="creating">
                  <span v-if="creating" class="spinner-border spinner-border-sm me-2"></span>
                  Create staff account
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    trekkers() { return this.users.filter(u => u.role === "trekker"); },
    staff()    { return this.users.filter(u => u.role === "staff"); },
  },
  methods: {
    initials(n) { return n.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase(); },
    assignedTreks(staffId) { return this.treks.filter(t => t.staff_id === staffId); },
    async reload() {
      this.loading = true;
      try {
        const [u, t] = await Promise.all([api.listUsers(), api.listTreks()]);
        this.users = u; this.treks = t;
      } finally { this.loading = false; }
    },
    async setActive(u, val) {
      try {
        await api.updateUser(u.id, { active: val });
        u.active = val;
        store.toast({ title: val ? "Reactivated" : "Deactivated", body: u.name, variant: val ? "success" : "secondary" });
      } catch (e) {
        store.toast({ title: "Could not update", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      }
    },
    async setBlacklisted(u, val) {
      try {
        await api.updateUser(u.id, { blacklisted: val });
        u.blacklisted = val;
        store.toast({ title: val ? "Blacklisted" : "Removed from blacklist", body: u.name, variant: val ? "danger" : "success" });
      } catch (e) {
        store.toast({ title: "Could not update", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      }
    },
    async createStaff(e) {
      this.submitted = true;
      if (!e.target.checkValidity()) return;
      this.creating = true;
      try {
        await api.createStaff({ ...this.staffForm });
        store.toast({ title: "Staff added", body: this.staffForm.name, variant: "success" });
        this.staffForm = { name: "", email: "", password: "staff123" };
        this.submitted = false;
        await this.reload();
      } catch (e) {
        store.toast({ title: "Could not create", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.creating = false; }
    }
  },
  created() { this.reload(); }
};
