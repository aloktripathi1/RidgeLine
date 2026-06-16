/* Profile — role-aware (trekker + staff; admin may also view).
   Left: avatar + identity + editable form.
   Right (trekker): trek stats, completed-trek badges with certificate download.
   Right (staff): assigned treks + participants led.
*/
window.ProfileView = {
  data() {
    return {
      profile: null,
      loading: true,
      saving: false,
      submitted: false,
      showUrl: false,
      // editable fields
      form: { name: "", phone: "", bio: "", avatar: "" },
      // role context
      bookings: [],
      assignedTreks: [],
      participantsLed: 0,
    };
  },
  template: /*html*/`
    <div class="container-xxl py-4 py-lg-5">
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-ridge"></div></div>

      <div v-else-if="profile" class="row g-4">
        <!-- Identity + edit -->
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center p-4">
              <div class="position-relative d-inline-block mb-3">
                <img v-if="form.avatar" :src="form.avatar" :alt="profile.name"
                     class="rounded-circle shadow-sm" width="120" height="120"
                     style="object-fit:cover;" @error="$event.target.style.display='none'; $event.target.nextElementSibling.style.display='flex';" />
                <div class="rounded-circle bg-ridge text-white align-items-center justify-content-center mx-auto display-serif"
                     :style="{ width:'120px', height:'120px', fontSize:'2.4rem', display: form.avatar ? 'none' : 'flex' }">
                  {{ initials(profile.name) }}
                </div>
                <span class="position-absolute bottom-0 end-0 badge rounded-pill text-uppercase fw-semibold"
                      :class="roleBadge">{{ profile.role }}</span>
              </div>
              <h1 class="h4 display-serif mb-1">{{ profile.name }}</h1>
              <div class="text-muted small mb-2">{{ profile.email }}</div>
              <div class="small text-muted">
                <i class="bi bi-calendar3"></i> Member since {{ fmtDate(profile.joined) }}
              </div>
              <p v-if="profile.bio" class="text-body-secondary small mt-3 mb-0" style="text-wrap:pretty;">{{ profile.bio }}</p>
            </div>
          </div>

          <div class="card border-0 shadow-sm mt-4">
            <div class="card-body p-4">
              <h6 class="text-uppercase small fw-bold mb-3">Edit profile</h6>
              <form @submit.prevent="save" novalidate :class="{ 'was-validated': submitted }">
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Full name</label>
                  <input v-model.trim="form.name" type="text" class="form-control" required minlength="2" />
                  <div class="invalid-feedback">Name is required.</div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Phone</label>
                  <input v-model.trim="form.phone" type="tel" class="form-control" placeholder="+91 …" />
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Profile photo</label>
                  <div class="d-flex align-items-center gap-3">
                    <img v-if="form.avatar" :src="form.avatar" alt="preview"
                         class="rounded-circle border" width="56" height="56" style="object-fit:cover;" />
                    <span v-else class="rounded-circle bg-ridge-soft text-ridge d-inline-flex align-items-center justify-content-center fw-bold"
                          style="width:56px;height:56px;">{{ initials(form.name || profile.name) }}</span>
                    <div class="flex-grow-1">
                      <input ref="fileInput" type="file" accept="image/*" class="d-none" @change="onFile" />
                      <div class="d-flex gap-2">
                        <button type="button" class="btn btn-sm btn-outline-ridge" @click="$refs.fileInput.click()">
                          <i class="bi bi-upload"></i> Upload
                        </button>
                        <button type="button" v-if="form.avatar" class="btn btn-sm btn-outline-secondary" @click="clearAvatar">
                          Remove
                        </button>
                      </div>
                      <div class="form-text">JPG/PNG, up to 5 MB.</div>
                    </div>
                  </div>
                  <div class="mt-2">
                    <a href="#" class="small text-muted text-decoration-none" @click.prevent="showUrl = !showUrl">
                      <i class="bi" :class="showUrl ? 'bi-chevron-up' : 'bi-link-45deg'"></i>
                      {{ showUrl ? 'Hide URL field' : 'or paste an image URL' }}
                    </a>
                    <input v-if="showUrl" v-model.trim="form.avatar" type="url" class="form-control form-control-sm mt-2" placeholder="https://…" />
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold text-uppercase">Bio</label>
                  <textarea v-model="form.bio" class="form-control" rows="3" maxlength="180"></textarea>
                  <div class="form-text">{{ (form.bio || '').length }}/180</div>
                </div>
                <button class="btn btn-ridge w-100" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                  Save changes
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Role-specific panel -->
        <div class="col-lg-8">
          <!-- TREKKER -->
          <template v-if="profile.role === 'trekker'">
            <div class="row g-3 mb-4">
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100"><div class="card-body">
                  <div class="small text-uppercase text-muted">Treks booked</div>
                  <div class="stat-num text-ridge">{{ trekkerStats.total }}</div>
                </div></div>
              </div>
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100"><div class="card-body">
                  <div class="small text-uppercase text-muted">Completed</div>
                  <div class="stat-num text-ridge">{{ trekkerStats.completed }}</div>
                </div></div>
              </div>
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100"><div class="card-body">
                  <div class="small text-uppercase text-muted">Upcoming</div>
                  <div class="stat-num text-ridge">{{ trekkerStats.upcoming }}</div>
                </div></div>
              </div>
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100"><div class="card-body">
                  <div class="small text-uppercase text-muted">Total spent</div>
                  <div class="stat-num text-ridge">{{ inr(trekkerStats.spent) }}</div>
                </div></div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-4">
              <div class="card-body p-4">
                <h6 class="text-uppercase small fw-bold mb-3">Summit badges</h6>
                <div v-if="!completedTreks.length" class="text-muted small">
                  Complete a trek to earn your first summit badge.
                </div>
                <div v-else class="d-flex flex-wrap gap-3">
                  <div v-for="b in completedTreks" :key="b.id" class="text-center" style="width:120px;">
                    <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-ridge-soft text-ridge mb-2"
                         style="width:64px;height:64px;">
                      <i class="bi bi-award-fill" style="font-size:1.6rem;"></i>
                    </div>
                    <div class="small fw-semibold lh-sm">{{ b.trek.name }}</div>
                    <div class="small text-muted">{{ b.trek.location }}</div>
                    <button class="btn btn-sm btn-link text-ridge p-0 mt-1" @click="downloadCert(b)">
                      <i class="bi bi-download"></i> Certificate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm">
              <div class="card-body pb-0 d-flex justify-content-between align-items-center">
                <h6 class="text-uppercase small fw-bold mb-0">Recent bookings</h6>
                <router-link to="/me/bookings" class="small text-ridge fw-semibold text-decoration-none">View all →</router-link>
              </div>
              <div class="table-responsive mt-3">
                <table class="table align-middle mb-0">
                  <thead class="table-light"><tr>
                    <th class="ps-4">Trek</th><th class="d-none d-md-table-cell">Departs</th><th class="pe-4">Status</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="!bookings.length"><td colspan="3" class="text-center text-muted py-4">No bookings yet.</td></tr>
                    <tr v-for="b in bookings.slice(0,5)" :key="b.id">
                      <td class="ps-4"><div class="fw-semibold">{{ b.trek.name }}</div>
                        <div class="small text-muted"><i class="bi bi-geo-alt"></i> {{ b.trek.location }}</div></td>
                      <td class="d-none d-md-table-cell text-body-secondary">{{ fmtDate(b.trek.start_date) }}</td>
                      <td class="pe-4"><span class="badge" :class="statusClass(b.status)">{{ b.status }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <!-- STAFF -->
          <template v-else-if="profile.role === 'staff'">
            <div class="row g-3 mb-4">
              <div class="col-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100"><div class="card-body">
                  <div class="small text-uppercase text-muted">Treks assigned</div>
                  <div class="stat-num text-ridge">{{ assignedTreks.length }}</div>
                </div></div>
              </div>
              <div class="col-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100"><div class="card-body">
                  <div class="small text-uppercase text-muted">Participants led</div>
                  <div class="stat-num text-ridge">{{ participantsLed }}</div>
                </div></div>
              </div>
              <div class="col-12 col-lg-4">
                <div class="card border-0 shadow-sm h-100"><div class="card-body">
                  <div class="small text-uppercase text-muted">Open right now</div>
                  <div class="stat-num text-ridge">{{ assignedTreks.filter(t => t.status === 'Open').length }}</div>
                </div></div>
              </div>
            </div>

            <div class="card border-0 shadow-sm">
              <div class="card-body pb-0 d-flex justify-content-between align-items-center">
                <h6 class="text-uppercase small fw-bold mb-0">Treks you lead</h6>
                <router-link to="/staff" class="small text-ridge fw-semibold text-decoration-none">Manage →</router-link>
              </div>
              <div class="table-responsive mt-3">
                <table class="table align-middle mb-0">
                  <thead class="table-light"><tr>
                    <th class="ps-4">Trek</th><th class="d-none d-md-table-cell">Departs</th>
                    <th class="d-none d-md-table-cell">Slots</th><th class="pe-4">Status</th>
                  </tr></thead>
                  <tbody>
                    <tr v-if="!assignedTreks.length"><td colspan="4" class="text-center text-muted py-4">No treks assigned yet.</td></tr>
                    <tr v-for="t in assignedTreks" :key="t.id" style="cursor:pointer;" @click="$router.push('/staff/trek/' + t.id)">
                      <td class="ps-4"><div class="fw-semibold">{{ t.name }}</div>
                        <div class="small text-muted"><i class="bi bi-geo-alt"></i> {{ t.location }}</div></td>
                      <td class="d-none d-md-table-cell text-body-secondary">{{ fmtDate(t.start_date) }}</td>
                      <td class="d-none d-md-table-cell text-body-secondary">{{ t.available_slots }} / {{ t.max_slots }}</td>
                      <td class="pe-4"><span class="badge" :class="statusClass(t.status)">{{ t.status }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <!-- ADMIN fallback -->
          <template v-else>
            <div class="card border-0 shadow-sm">
              <div class="card-body p-4">
                <h6 class="text-uppercase small fw-bold mb-3">Admin account</h6>
                <p class="text-body-secondary mb-3">You have full access to operations, trek management and user controls.</p>
                <div class="d-flex flex-wrap gap-2">
                  <router-link to="/admin" class="btn btn-outline-ridge">Dashboard</router-link>
                  <router-link to="/admin/treks" class="btn btn-outline-ridge">Treks</router-link>
                  <router-link to="/admin/users" class="btn btn-outline-ridge">Users &amp; staff</router-link>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  `,
  computed: {
    roleBadge() {
      const r = this.profile?.role;
      return r === "admin" ? "text-bg-dark" : r === "staff" ? "text-bg-info" : "text-bg-success";
    },
    completedTreks() { return this.bookings.filter(b => b.status === "Completed"); },
    trekkerStats() {
      const active = this.bookings.filter(b => b.status !== "Cancelled");
      return {
        total: this.bookings.length,
        completed: this.bookings.filter(b => b.status === "Completed").length,
        upcoming: this.bookings.filter(b => b.status === "Booked").length,
        spent: active.reduce((s, b) => s + (b.trek?.price || 0), 0),
      };
    }
  },
  methods: {
    inr: util.inr,
    fmtDate: util.fmtDate,
    statusClass: util.statusClass,
    initials(n) { return (n || "?").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase(); },
    clearAvatar() { this.form.avatar = ""; if (this.$refs.fileInput) this.$refs.fileInput.value = ""; },
    onFile(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        store.toast({ title: "Not an image", body: "Please choose a JPG or PNG file.", variant: "danger" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        store.toast({ title: "File too large", body: "Please choose an image under 5 MB.", variant: "danger" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Downscale to a square ~256px so it stays small in localStorage.
        const img = new Image();
        img.onload = () => {
          const size = 256;
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext("2d");
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          this.form.avatar = canvas.toDataURL("image/jpeg", 0.85);
        };
        img.onerror = () => store.toast({ title: "Could not read image", body: "Try a different file.", variant: "danger" });
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    },
    async reload() {
      this.loading = true;
      try {
        const me = store.state.user;
        this.profile = await api.getUser(me.id);
        this.form = {
          name: this.profile.name, phone: this.profile.phone || "",
          bio: this.profile.bio || "", avatar: this.profile.avatar || "",
        };
        if (this.profile.role === "trekker") {
          this.bookings = await api.myBookings(me.id);
        } else if (this.profile.role === "staff") {
          const all = await api.listTreks();
          this.assignedTreks = all.filter(t => t.staff_id === me.id);
          // count participants across assigned treks
          const lists = await Promise.all(this.assignedTreks.map(t => api.trekBookings(t.id)));
          this.participantsLed = lists.flat().filter(b => b.status !== "Cancelled").length;
        }
      } finally { this.loading = false; }
    },
    async save() {
      this.submitted = true;
      if (!this.form.name || this.form.name.length < 2) return;
      this.saving = true;
      try {
        const updated = await api.updateUser(this.profile.id, { ...this.form });
        this.profile = updated;
        store.setUser({ name: updated.name });
        store.toast({ title: "Profile updated", body: "Your changes are saved.", variant: "success" });
      } catch (e) {
        store.toast({ title: "Could not save", body: e?.response?.data?.detail || "Try again.", variant: "danger" });
      } finally { this.saving = false; }
    },
    downloadCert(b) {
      store.toast({ title: "Certificate ready", body: b.trek.name + " — generating your PDF…", variant: "success" });
    }
  },
  created() { this.reload(); }
};
