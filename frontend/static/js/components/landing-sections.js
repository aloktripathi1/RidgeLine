/* Landing marketing sections shown beneath the trek grid on the catalog page.
   Self-contained: How it works, Why Ridgeline, Destinations, Safety, Testimonials,
   Stats band, FAQ (Bootstrap accordion), and a closing CTA.
   Real imagery via Unsplash with graceful @error fallback. */
window.LandingSections = {
  emits: ["register"],
  data() {
    return {
      steps: [
        { icon: "bi-search", title: "Browse & filter", text: "Search 8+ curated Himalayan routes by difficulty, region, duration and dates." },
        { icon: "bi-card-checklist", title: "Book in minutes", text: "Pick a departure, confirm your slot, and get instant confirmation — no back-and-forth." },
        { icon: "bi-person-badge", title: "Meet your lead", text: "Every trek is run by a vetted, in-house trek leader assigned to your batch." },
        { icon: "bi-trophy", title: "Summit & share", text: "Walk the ridge, then download your trail history and certificate from your dashboard." },
      ],
      features: [
        { icon: "bi-shield-check", title: "Certified leaders", text: "Wilderness-first-aid trained leads, capped batch sizes, and a 1:6 guide ratio on every high-altitude route." },
        { icon: "bi-graph-up-arrow", title: "Acclimatisation built-in", text: "Itineraries are paced by altitude science — buffer days and gradual gains, not rushed summits." },
        { icon: "bi-cup-hot", title: "Full-board camps", text: "Twin-share tents, hot meals, and porter-supported logistics so you carry only a daypack." },
        { icon: "bi-arrow-repeat", title: "Flexible reschedules", text: "Free date changes up to 14 days out, and transparent slot availability in real time." },
        { icon: "bi-geo", title: "Permits handled", text: "Forest, ILP and wildlife permits arranged for you — turn up with your boots and we do the paperwork." },
        { icon: "bi-broadcast", title: "Live trail tracking", text: "Emergency comms on every expedition with satellite messengers above the treeline." },
      ],
      destinations: [
        { name: "Uttarakhand", treks: "3 treks", img: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=900&q=70" },
        { name: "Himachal Pradesh", treks: "1 trek", img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=70" },
        { name: "Sikkim", treks: "2 treks", img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=70" },
        { name: "Ladakh", treks: "1 trek", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=70" },
      ],
      testimonials: [
        { quote: "The acclimatisation pacing on Goecha La was spot on — I summited feeling strong, not wrecked. Best-run trek I've joined.", name: "Riya Sharma", role: "Goecha La, 2025", img: "https://i.pravatar.cc/120?img=47" },
        { quote: "Booking took two minutes and the permits were sorted before I'd even packed. The leader knew every bend of the trail.", name: "Vikram Iyer", role: "Rupin Pass, 2025", img: "https://i.pravatar.cc/120?img=12" },
        { quote: "As a first-timer I felt safe the whole way. Small batch, hot food at camp, and a guide who genuinely cared.", name: "Nora Tashi", role: "Kedarkantha, 2026", img: "https://i.pravatar.cc/120?img=32" },
      ],
      faqs: [
        { q: "Do I need prior trekking experience?", a: "Not for our Easy and most Moderate routes — they're designed for fit first-timers. Hard-graded treks like Rupin Pass and Goecha La assume some high-altitude or multi-day experience, which is noted on each trek's detail page." },
        { q: "What's included in the price?", a: "All treks are full-board from the basecamp: twin-share tented accommodation, all meals on the trail, forest and wildlife permits, a certified trek leader and support staff, and safety equipment. Travel to the basecamp is arranged separately." },
        { q: "Can I cancel or reschedule?", a: "Yes. You can reschedule to another departure free of charge up to 14 days before the start date, and cancellations follow a tiered refund policy shown at checkout. Manage everything from your My Bookings dashboard." },
        { q: "How fit do I need to be?", a: "You should be able to walk 5–6 hours a day with a light daypack. We send a graded fitness-prep plan after booking, and our pacing is built around safe, gradual altitude gain." },
        { q: "Is it safe for solo travellers?", a: "Absolutely — most of our trekkers join solo. Batches are capped, leaders are wilderness-first-aid certified, and every high-altitude expedition carries satellite communication for emergencies." },
      ],
    };
  },
  template: /*html*/`
    <div>
      <!-- How it works -->
      <section class="py-5 py-lg-6 bg-white border-top">
        <div class="container-xxl py-lg-4">
          <div class="text-center mb-5">
            <span class="badge bg-ridge-soft text-ridge fw-semibold mb-2">How it works</span>
            <h2 class="display-serif display-5 mb-2">From browse to basecamp in four steps</h2>
            <p class="text-muted mb-0" style="max-width:52ch; margin-inline:auto;">
              No phone calls, no hidden steps. The whole journey lives in your account.
            </p>
          </div>
          <div class="row g-4">
            <div v-for="(s, i) in steps" :key="s.title" class="col-md-6 col-lg-3">
              <div class="h-100 position-relative">
                <div class="d-inline-flex align-items-center justify-content-center rounded-3 bg-ridge text-white mb-3"
                     style="width:52px;height:52px;">
                  <i class="bi" :class="s.icon" style="font-size:1.3rem;"></i>
                </div>
                <div class="display-serif text-ridge fw-semibold mb-1" style="font-size:.9rem; opacity:.5;">0{{ i + 1 }}</div>
                <h3 class="h5 mb-2">{{ s.title }}</h3>
                <p class="text-body-secondary mb-0" style="text-wrap:pretty;">{{ s.text }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Why Ridgeline (features) -->
      <section class="py-5 py-lg-6 bg-ridge-soft">
        <div class="container-xxl py-lg-4">
          <div class="row align-items-end mb-5">
            <div class="col-lg-7">
              <span class="badge bg-white text-ridge fw-semibold mb-2">Why Ridgeline</span>
              <h2 class="display-serif display-5 mb-0">Run like an expedition company, not a booking site.</h2>
            </div>
            <div class="col-lg-5 mt-3 mt-lg-0">
              <p class="text-body-secondary mb-0 lead">
                Everything is built around two things: getting you to the top safely, and getting you there without the admin headache.
              </p>
            </div>
          </div>
          <div class="row g-4">
            <div v-for="f in features" :key="f.title" class="col-md-6 col-lg-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body p-4">
                  <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-ridge-soft text-ridge mb-3"
                       style="width:48px;height:48px;">
                    <i class="bi" :class="f.icon" style="font-size:1.2rem;"></i>
                  </div>
                  <h3 class="h5 mb-2">{{ f.title }}</h3>
                  <p class="text-body-secondary mb-0" style="text-wrap:pretty;">{{ f.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Destinations -->
      <section class="py-5 py-lg-6 bg-white">
        <div class="container-xxl py-lg-4">
          <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
            <div>
              <span class="badge bg-ridge-soft text-ridge fw-semibold mb-2">Where we go</span>
              <h2 class="display-serif display-5 mb-0">Four states, one mighty range</h2>
            </div>
            <a href="#trek-grid" class="btn btn-outline-ridge">See all treks <i class="bi bi-arrow-right ms-1"></i></a>
          </div>
          <div class="row g-3">
            <div v-for="d in destinations" :key="d.name" class="col-6 col-lg-3">
              <a href="#trek-grid" class="text-decoration-none">
                <div class="position-relative rounded-3 overflow-hidden trek-card shadow-sm" style="aspect-ratio:3/4;">
                  <img :src="d.img" :alt="d.name" class="w-100 h-100" style="object-fit:cover;"
                       loading="lazy" @error="$event.target.style.display='none'" />
                  <div class="position-absolute top-0 start-0 w-100 h-100"
                       style="background:linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.7) 100%);"></div>
                  <div class="position-absolute bottom-0 start-0 p-3 text-white">
                    <div class="display-serif fs-4 lh-1">{{ d.name }}</div>
                    <div class="small opacity-75">{{ d.treks }}</div>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats band -->
      <section class="py-5 bg-ridge text-white">
        <div class="container-xxl">
          <div class="row text-center g-4">
            <div class="col-6 col-lg-3">
              <div class="stat-num text-white">2,400+</div>
              <div class="small opacity-75 text-uppercase mt-1">Trekkers led</div>
            </div>
            <div class="col-6 col-lg-3">
              <div class="stat-num text-white">98%</div>
              <div class="small opacity-75 text-uppercase mt-1">Summit success</div>
            </div>
            <div class="col-6 col-lg-3">
              <div class="stat-num text-white">12</div>
              <div class="small opacity-75 text-uppercase mt-1">Certified leaders</div>
            </div>
            <div class="col-6 col-lg-3">
              <div class="stat-num text-white">4.9<span style="font-size:1.2rem;">/5</span></div>
              <div class="small opacity-75 text-uppercase mt-1">Avg rating</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials -->
      <section class="py-5 py-lg-6 bg-white">
        <div class="container-xxl py-lg-4">
          <div class="text-center mb-5">
            <span class="badge bg-ridge-soft text-ridge fw-semibold mb-2">Trail notes</span>
            <h2 class="display-serif display-5 mb-0">What our trekkers say</h2>
          </div>
          <div class="row g-4">
            <div v-for="t in testimonials" :key="t.name" class="col-md-4">
              <figure class="card border-0 shadow-sm h-100 mb-0">
                <div class="card-body p-4 d-flex flex-column">
                  <div class="text-ridge mb-3" aria-hidden="true">
                    <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
                  </div>
                  <blockquote class="blockquote fs-6 flex-grow-1 mb-4" style="text-wrap:pretty;">
                    "{{ t.quote }}"
                  </blockquote>
                  <figcaption class="d-flex align-items-center gap-3">
                    <img :src="t.img" :alt="t.name" class="rounded-circle" width="44" height="44"
                         style="object-fit:cover;" @error="$event.target.style.display='none'" />
                    <div>
                      <div class="fw-semibold">{{ t.name }}</div>
                      <div class="small text-muted">{{ t.role }}</div>
                    </div>
                  </figcaption>
                </div>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section class="py-5 py-lg-6 bg-ridge-soft">
        <div class="container-xxl py-lg-4">
          <div class="row g-4 g-lg-5">
            <div class="col-lg-4">
              <span class="badge bg-white text-ridge fw-semibold mb-2">FAQ</span>
              <h2 class="display-serif display-5 mb-3">Good to know before you go</h2>
              <p class="text-body-secondary">Still curious? Reach our team at
                <a href="#" class="text-ridge fw-semibold" @click.prevent>hello@ridgeline.app</a>
                and we'll get back within a day.</p>
            </div>
            <div class="col-lg-8">
              <div class="accordion accordion-flush" id="faqAccordion">
                <div v-for="(f, i) in faqs" :key="i" class="accordion-item border-0 shadow-sm mb-2 rounded-3 overflow-hidden">
                  <h3 class="accordion-header">
                    <button class="accordion-button collapsed fw-semibold" type="button"
                            data-bs-toggle="collapse" :data-bs-target="'#faq-' + i">
                      {{ f.q }}
                    </button>
                  </h3>
                  <div :id="'faq-' + i" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                    <div class="accordion-body text-body-secondary" style="text-wrap:pretty;">{{ f.a }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Closing CTA -->
      <section class="position-relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=2000&q=70"
             alt="Trekkers on a high ridge"
             class="position-absolute top-0 start-0 w-100 h-100" style="object-fit:cover;"
             loading="lazy" @error="$event.target.style.display='none'" />
        <div class="position-absolute top-0 start-0 w-100 h-100"
             style="background:linear-gradient(120deg, rgba(28,31,26,.88) 0%, rgba(47,74,58,.7) 100%);"></div>
        <div class="container-xxl position-relative text-white text-center py-5 py-lg-6" style="z-index:1;">
          <h2 class="display-serif display-4 mb-3">The mountains are calling.</h2>
          <p class="lead opacity-90 mb-4 mx-auto" style="max-width:50ch;">
            Create a free account, pick your ridge, and we'll handle the rest. Your next summit is a few clicks away.
          </p>
          <div class="d-flex flex-wrap gap-2 justify-content-center">
            <a href="#trek-grid" class="btn btn-light btn-lg fw-semibold">Browse treks</a>
            <button v-if="!isAuthed" class="btn btn-outline-light btn-lg" @click="$emit('register')">
              Create free account
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  computed: {
    isAuthed() { return !!store.state.user; }
  }
};
