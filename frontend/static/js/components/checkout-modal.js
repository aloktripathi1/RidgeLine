/* Multi-step checkout / payment flow (demo — no real charge).
   Steps: 1 Review → 2 Traveller details → 3 Payment → 4 Confirmation.
   Emits "booked" after the simulated payment + booking succeed. */
window.CheckoutModal = {
  props: ["trek"],
  emits: ["booked"],
  data() {
    return {
      step: 1,
      processing: false,
      submittedDetails: false,
      submittedPay: false,
      bookingId: null,
      details: { phone: "", emergency_name: "", emergency_phone: "" },
      pay: { name: "", number: "", expiry: "", cvv: "" },
    };
  },
  template: /*html*/`
    <div class="modal fade" id="checkoutModal" tabindex="-1" aria-hidden="true" ref="root" data-bs-backdrop="static">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg" v-if="trek">
          <div class="modal-header border-0 pb-0">
            <div class="w-100">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="modal-title display-serif mb-0">
                  {{ step === 4 ? 'You\\'re booked!' : 'Checkout' }}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <!-- Stepper -->
              <div v-if="step < 4" class="d-flex align-items-center gap-2 mt-3">
                <template v-for="(label, i) in stepLabels" :key="label">
                  <div class="d-flex align-items-center gap-2">
                    <span class="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold"
                          :class="step > i+1 ? 'bg-ridge text-white' : step === i+1 ? 'bg-ridge text-white' : 'bg-light text-muted'"
                          style="width:28px;height:28px;font-size:.8rem;">
                      <i v-if="step > i+1" class="bi bi-check-lg"></i><span v-else>{{ i+1 }}</span>
                    </span>
                    <span class="small d-none d-sm-inline" :class="step === i+1 ? 'fw-semibold text-ridge' : 'text-muted'">{{ label }}</span>
                  </div>
                  <div v-if="i < stepLabels.length-1" class="flex-grow-1 ridge-divider mx-1" style="min-width:16px;"></div>
                </template>
              </div>
            </div>
          </div>

          <div class="modal-body p-4">
            <!-- STEP 1 — review -->
            <div v-if="step === 1">
              <div class="d-flex gap-3 align-items-center mb-4">
                <img v-if="trek.image_url" :src="trek.image_url" :alt="trek.name"
                     class="rounded shadow-sm flex-shrink-0" style="width:88px;height:88px;object-fit:cover;"
                     @error="$event.target.style.display='none'" />
                <div>
                  <h4 class="display-serif h5 mb-1">{{ trek.name }}</h4>
                  <div class="small text-muted">
                    <i class="bi bi-geo-alt"></i> {{ trek.location }} ·
                    <i class="bi bi-calendar3"></i> {{ fmtDate(trek.start_date) }} ·
                    <i class="bi bi-clock"></i> {{ trek.duration_days }}d
                  </div>
                  <span class="badge mt-2" :class="diffCls">{{ trek.difficulty }}</span>
                </div>
              </div>

              <h6 class="text-uppercase small fw-bold mb-2">Price breakdown</h6>
              <div class="d-flex justify-content-between py-1"><span class="text-muted">Base fare</span><span>{{ inr(trek.price) }}</span></div>
              <div class="d-flex justify-content-between py-1"><span class="text-muted">GST (5%)</span><span>{{ inr(gst) }}</span></div>
              <div class="d-flex justify-content-between py-1"><span class="text-muted">Booking fee</span><span>{{ inr(fee) }}</span></div>
              <hr class="my-2" />
              <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span class="text-ridge">{{ inr(total) }}</span></div>
            </div>

            <!-- STEP 2 — traveller details -->
            <form v-else-if="step === 2" novalidate :class="{ 'was-validated': submittedDetails }" id="detailsForm" @submit.prevent="next">
              <h6 class="text-uppercase small fw-bold mb-3">Traveller details</h6>
              <div class="row g-3">
                <div class="col-md-12">
                  <label class="form-label small fw-semibold text-uppercase">Contact phone</label>
                  <input v-model.trim="details.phone" type="tel" class="form-control" required minlength="6" placeholder="+91 …" />
                  <div class="invalid-feedback">A contact number is required.</div>
                </div>
                <div class="col-md-7">
                  <label class="form-label small fw-semibold text-uppercase">Emergency contact name</label>
                  <input v-model.trim="details.emergency_name" type="text" class="form-control" required minlength="2" />
                  <div class="invalid-feedback">Who should we call in an emergency?</div>
                </div>
                <div class="col-md-5">
                  <label class="form-label small fw-semibold text-uppercase">Emergency phone</label>
                  <input v-model.trim="details.emergency_phone" type="tel" class="form-control" required minlength="6" />
                  <div class="invalid-feedback">Required.</div>
                </div>
              </div>
              <div class="alert alert-light border mt-3 small mb-0">
                <i class="bi bi-info-circle text-ridge"></i>
                We share these only with your assigned trek leader for safety on the trail.
              </div>
            </form>

            <!-- STEP 3 — payment -->
            <form v-else-if="step === 3" novalidate :class="{ 'was-validated': submittedPay }" id="payForm" @submit.prevent="pay_now">
              <h6 class="text-uppercase small fw-bold mb-3">Payment <span class="badge text-bg-light border ms-1">Demo — no real charge</span></h6>
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label small fw-semibold text-uppercase">Name on card</label>
                  <input v-model.trim="pay.name" type="text" class="form-control" required minlength="2" />
                  <div class="invalid-feedback">Required.</div>
                </div>
                <div class="col-12">
                  <label class="form-label small fw-semibold text-uppercase">Card number</label>
                  <div class="input-group">
                    <span class="input-group-text bg-white"><i class="bi bi-credit-card-2-front"></i></span>
                    <input v-model="pay.number" @input="formatCard" type="text" inputmode="numeric"
                           class="form-control" required placeholder="4242 4242 4242 4242" maxlength="19"
                           pattern="[0-9 ]{19}" />
                    <div class="invalid-feedback">Enter a 16-digit card number.</div>
                  </div>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-semibold text-uppercase">Expiry</label>
                  <input v-model="pay.expiry" @input="formatExpiry" type="text" class="form-control"
                         required placeholder="MM/YY" maxlength="5" pattern="[0-9]{2}/[0-9]{2}" />
                  <div class="invalid-feedback">MM/YY</div>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-semibold text-uppercase">CVV</label>
                  <input v-model="pay.cvv" type="password" inputmode="numeric" class="form-control"
                         required pattern="[0-9]{3,4}" maxlength="4" placeholder="123" />
                  <div class="invalid-feedback">3–4 digits.</div>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-4 p-3 bg-light rounded">
                <span class="text-muted">Amount payable</span>
                <span class="fw-bold fs-5 text-ridge">{{ inr(total) }}</span>
              </div>
              <div class="small text-muted mt-2"><i class="bi bi-lock-fill"></i> Tip: use 4242 4242 4242 4242 for this demo.</div>
            </form>

            <!-- STEP 4 — confirmation -->
            <div v-else-if="step === 4" class="text-center py-3">
              <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3"
                   style="width:80px;height:80px;">
                <i class="bi bi-check-lg" style="font-size:2.5rem;"></i>
              </div>
              <h4 class="display-serif mb-2">Booking confirmed</h4>
              <p class="text-muted mb-3">
                You're on <strong>{{ trek.name }}</strong>, departing {{ fmtDate(trek.start_date) }}.
                A confirmation has been sent to your email.
              </p>
              <div class="d-inline-flex flex-column gap-1 bg-light rounded p-3 mb-1 text-start">
                <div class="d-flex justify-content-between gap-4"><span class="text-muted small">Booking ID</span><span class="fw-semibold">#{{ bookingId }}</span></div>
                <div class="d-flex justify-content-between gap-4"><span class="text-muted small">Amount paid</span><span class="fw-semibold text-ridge">{{ inr(total) }}</span></div>
              </div>
            </div>
          </div>

          <div class="modal-footer bg-light border-0">
            <template v-if="step === 1">
              <button class="btn btn-link text-muted" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-ridge" @click="step = 2">Continue <i class="bi bi-arrow-right"></i></button>
            </template>
            <template v-else-if="step === 2">
              <button class="btn btn-link text-muted" @click="step = 1"><i class="bi bi-arrow-left"></i> Back</button>
              <button class="btn btn-ridge" type="submit" form="detailsForm">Continue to payment <i class="bi bi-arrow-right"></i></button>
            </template>
            <template v-else-if="step === 3">
              <button class="btn btn-link text-muted" @click="step = 2" :disabled="processing"><i class="bi bi-arrow-left"></i> Back</button>
              <button class="btn btn-ridge" type="submit" form="payForm" :disabled="processing">
                <span v-if="processing" class="spinner-border spinner-border-sm me-2"></span>
                {{ processing ? 'Processing…' : 'Pay ' + inr(total) }}
              </button>
            </template>
            <template v-else>
              <router-link to="/me/bookings" class="btn btn-outline-ridge" data-bs-dismiss="modal">View my bookings</router-link>
              <button class="btn btn-ridge" data-bs-dismiss="modal">Done</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  `,
  computed: {
    stepLabels() { return ["Review", "Details", "Payment"]; },
    diffCls() { return util.difficultyClass(this.trek?.difficulty); },
    gst() { return this.trek ? Math.round(this.trek.price * 0.05) : 0; },
    fee() { return 299; },
    total() { return this.trek ? this.trek.price + this.gst + this.fee : 0; },
  },
  methods: {
    inr: util.inr,
    fmtDate: util.fmtDate,
    reset() {
      this.step = 1; this.processing = false;
      this.submittedDetails = false; this.submittedPay = false; this.bookingId = null;
      this.pay = { name: "", number: "", expiry: "", cvv: "" };
      // prefill phone from profile if present
      this.details = { phone: store.state.user?.phone || "", emergency_name: "", emergency_phone: "" };
    },
    next(e) {
      this.submittedDetails = true;
      if (!e.target.checkValidity()) return;
      this.step = 3;
    },
    formatCard() {
      let v = this.pay.number.replace(/\D/g, "").slice(0, 16);
      this.pay.number = v.replace(/(.{4})/g, "$1 ").trim();
    },
    formatExpiry() {
      let v = this.pay.expiry.replace(/\D/g, "").slice(0, 4);
      this.pay.expiry = v.length >= 3 ? v.slice(0, 2) + "/" + v.slice(2) : v;
    },
    async pay_now(e) {
      this.submittedPay = true;
      if (!e.target.checkValidity()) return;
      this.processing = true;
      try {
        // Simulate gateway latency, then create the booking.
        await new Promise(r => setTimeout(r, 1200));
        const booking = await api.book(store.state.user.id, this.trek.id);
        this.bookingId = booking.id;
        this.step = 4;
        store.toast({ title: "Payment successful", body: this.trek.name + " is booked.", variant: "success" });
        this.$emit("booked");
      } catch (err) {
        store.toast({ title: "Payment failed", body: err?.response?.data?.detail || "Please try again.", variant: "danger" });
      } finally { this.processing = false; }
    }
  }
};
