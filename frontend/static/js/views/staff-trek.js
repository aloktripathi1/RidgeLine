/* Staff — single trek management.
   Update available slots, change status (Pending→Approved→Open→Closed→Completed),
   view participant list.
*/
window.StaffTrekView = {
  props: ["id"],
  data() {
    return {
      trek: null, participants: [], loading: true, saving: false, saveError: "",
      // Announcement
      announceForm: { message_type: "general", notes: "" },
      announceDraft: null, announceDraftLoading: false,
      announceSending: false,
    };
  },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <router-link to="/staff" class="text-muted small text-decoration-none">
        <i class="bi bi-arrow-left"></i> Back to my treks
      </router-link>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-ridge"></div></div>

      <div v-else-if="trek">
        <!-- Header -->
        <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mt-3 mb-4">
          <div>
            <h1 class="display-serif display-6 mb-1">{{ trek.name }}</h1>
            <div class="text-muted">
              <i class="bi bi-geo-alt"></i> {{ trek.location }} ·
              <i class="bi bi-calendar3"></i> Departs {{ fmtDate(trek.start_date) }} ·
              <i class="bi bi-clock"></i> {{ trek.duration_days }} days
            </div>
          </div>
          <span class="badge fs-6 py-2 px-3" :class="stCls(trek.status)">{{ trek.status }}</span>
        </div>

        <div class="row g-4">
          <!-- Status & slots -->
          <div class="col-lg-5">
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-body">
                <h6 class="text-uppercase small fw-bold mb-3">Status pipeline</h6>
                <div class="position-relative mb-3">
                  <div class="d-flex justify-content-between align-items-center">
                    <div v-for="(s, i) in pipeline" :key="s"
                         class="d-flex flex-column align-items-center text-center flex-grow-1">
                      <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                           :class="i <= currentStep ? 'bg-ridge text-white' : 'bg-light text-muted'"
                           style="width:36px;height:36px;">
                        <i v-if="i < currentStep" class="bi bi-check-lg"></i>
                        <span v-else>{{ i + 1 }}</span>
                      </div>
                      <div class="small mt-1" :class="i === currentStep ? 'fw-semibold text-ridge' : 'text-muted'">
                        {{ s }}
                      </div>
                    </div>
                  </div>
                </div>

                <label class="form-label small fw-semibold text-uppercase">Change status</label>
                <select v-model="trek.status" class="form-select" @change="saveStatus">
                  <option v-for="s in pipeline" :key="s">{{ s }}</option>
                </select>
              </div>
            </div>

            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <h6 class="text-uppercase small fw-bold mb-3">Slot management</h6>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="text-muted small">Capacity</span>
                  <span class="fw-semibold">{{ trek.max_slots }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="text-muted small">Booked</span>
                  <span class="fw-semibold text-ridge">{{ trek.max_slots - trek.available_slots }}</span>
                </div>
                <div class="progress mb-3" style="height:10px;">
                  <div class="progress-bar bg-ridge" :style="{ width: filledPct + '%' }"></div>
                </div>

                <label class="form-label small fw-semibold text-uppercase">Available slots</label>
                <div class="input-group">
                  <button class="btn btn-outline-secondary" @click="bumpSlots(-1)" :disabled="trek.available_slots <= 0">
                    <i class="bi bi-dash"></i>
                  </button>
                  <input v-model.number="trek.available_slots" type="number" class="form-control text-center"
                         min="0" :max="trek.max_slots" />
                  <button class="btn btn-outline-secondary" @click="bumpSlots(1)" :disabled="trek.available_slots >= trek.max_slots">
                    <i class="bi bi-plus"></i>
                  </button>
                </div>
                <button class="btn btn-ridge w-100 mt-3" @click="saveSlots" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                  Save changes
                </button>
              </div>
            </div>
          </div>

          <!-- Right column: announce card + participants -->
          <div class="col-lg-7">
          <!-- Announce card -->
          <div class="mb-4">
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="text-uppercase small fw-bold mb-0">Announce to trekkers</h6>
                  <span class="badge text-bg-light border">{{ activeParticipants.length }} recipients</span>
                </div>
                <div class="row g-2">
                  <div class="col-12">
                    <label class="form-label small fw-semibold text-uppercase">Type</label>
                    <select v-model="announceForm.message_type" class="form-select form-select-sm">
                      <option value="general">General update</option>
                      <option value="gear_reminder">Gear reminder</option>
                      <option value="meetup_info">Meetup info</option>
                      <option value="weather_delay">Weather / delay</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-semibold text-uppercase">Notes for AI <span class="fw-normal text-muted">(optional)</span></label>
                    <input v-model="announceForm.notes" class="form-control form-control-sm"
                           placeholder="e.g. meetup at 5am at Kasol bus stand" />
                  </div>
                </div>

                <!-- AI draft button -->
                <button class="btn btn-sm btn-outline-ridge w-100 mt-2" @click="draftAnnounce" :disabled="announceDraftLoading">
                  <span v-if="announceDraftLoading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-stars me-1"></i>
                  {{ announceDraftLoading ? 'Drafting…' : 'AI Draft' }}
                </button>

                <!-- Editable draft -->
                <div v-if="announceDraft" class="mt-3">
                  <label class="form-label small fw-semibold text-uppercase">Title</label>
                  <input v-model="announceDraft.title" class="form-control form-control-sm mb-2" />
                  <label class="form-label small fw-semibold text-uppercase">Message</label>
                  <textarea v-model="announceDraft.body" class="form-control form-control-sm" rows="3"></textarea>
                  <button class="btn btn-ridge btn-sm w-100 mt-2" @click="sendAnnounce" :disabled="announceSending">
                    <span v-if="announceSending" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="bi bi-send me-1"></i>
                    {{ announceSending ? 'Sending…' : 'Send to ' + activeParticipants.length + ' trekkers' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Participants -->
          <div>
            <div class="card border-0 shadow-sm">
              <div class="card-body pb-0">
                <div class="d-flex justify-content-between align-items-center">
                  <h6 class="text-uppercase small fw-bold mb-0">Participants</h6>
                  <span class="badge text-bg-light border">{{ activeParticipants.length }} confirmed</span>
                </div>
              </div>
              <div class="table-responsive mt-3">
                <table class="table align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th class="ps-4">Trekker</th>
                      <th class="d-none d-md-table-cell">Booked on</th>
                      <th class="pe-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!participants.length">
                      <td colspan="3" class="text-center text-muted py-4">No bookings yet.</td>
                    </tr>
                    <tr v-for="p in participants" :key="p.id">
                      <td class="ps-4">
                        <div class="d-flex align-items-center gap-2">
                          <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-ridge-soft text-ridge fw-bold"
                                style="width:34px;height:34px;font-size:.8rem;">{{ initials(p.user?.name) }}</span>
                          <div>
                            <div class="fw-semibold">{{ p.user?.name || '—' }}</div>
                            <div class="small text-muted">{{ p.user?.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="d-none d-md-table-cell text-body-secondary">{{ fmtDate(p.booked_on) }}</td>
                      <td class="pe-4">
                        <span class="badge" :class="stCls(p.status)">{{ p.status }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div><!-- /right col -->
        </div>
      </div>
    </div>
  `,
  computed: {
    pipeline() { return ["Pending", "Approved", "Open", "Closed", "Completed"]; },
    currentStep() { return Math.max(0, this.pipeline.indexOf(this.trek?.status)); },
    filledPct() {
      if (!this.trek) return 0;
      const booked = this.trek.max_slots - this.trek.available_slots;
      return Math.round((booked / this.trek.max_slots) * 100);
    },
    activeParticipants() {
      return this.participants.filter(p => p.status === "Booked" || p.status === "Completed");
    }
  },
  methods: {
    fmtDate: util.fmtDate,
    stCls: util.statusClass,
    initials(n) { return (n || "?").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase(); },
    async reload() {
      this.loading = true;
      try {
        const [trek, parts] = await Promise.all([
          api.getTrek(+this.id),
          api.trekBookings(+this.id),
        ]);
        this.trek = trek;
        this.participants = parts;
      } finally { this.loading = false; }
    },
    bumpSlots(by) {
      const v = (this.trek.available_slots || 0) + by;
      this.trek.available_slots = Math.max(0, Math.min(this.trek.max_slots, v));
    },
    async saveStatus() {
      try {
        await api.updateTrek(this.trek.id, { status: this.trek.status });
        store.toast({ title: "Status updated", body: this.trek.status, variant: "success" });
      } catch (e) {
        store.toast({ title: "Failed", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      }
    },
    async saveSlots() {
      this.saving = true;
      try {
        await api.updateTrek(this.trek.id, { available_slots: this.trek.available_slots });
        store.toast({ title: "Slots saved", body: this.trek.available_slots + " available", variant: "success" });
      } catch (e) {
        store.toast({ title: "Failed", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.saving = false; }
    },
    async draftAnnounce() {
      if (!this.trek) return;
      this.announceDraftLoading = true;
      try {
        this.announceDraft = await api.aiDraftAnnouncement({
          trek_name: this.trek.name,
          trek_location: this.trek.location,
          trek_date: this.trek.start_date || "TBD",
          message_type: this.announceForm.message_type,
          notes: this.announceForm.notes,
        });
      } catch (e) {
        store.toast({ title: "AI unavailable", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.announceDraftLoading = false; }
    },
    async sendAnnounce() {
      if (!this.announceDraft || !this.trek) return;
      this.announceSending = true;
      try {
        const res = await api.broadcastNotif({
          trek_id: this.trek.id,
          title: this.announceDraft.title,
          body: this.announceDraft.body,
          type: this.announceForm.message_type === "weather_delay" ? "warning" : "info",
        });
        store.toast({ title: "Announcement sent!", body: `Notified ${res.sent} trekkers.`, variant: "success" });
        this.announceDraft = null;
        this.announceForm.notes = "";
      } catch (e) {
        store.toast({ title: "Failed to send", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.announceSending = false; }
    },
  },
  created() { this.reload(); }
};
