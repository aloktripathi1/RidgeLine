/* Mock backend that simulates the FastAPI endpoints.
   In production this file is unused — api.js can point axios at the real backend.
   We keep it here so the SPA is demoable without a live server.

   Assumptions documented:
   - JWT is faked (base64 payload only) so the frontend can decode role/email locally.
   - All persistence lives in localStorage under the 'tma:' prefix.
   - Latency is simulated at 250–450ms to make loading states visible.
*/
(function (global) {
  const LS = "tma:db:v3";  // bump key to refresh seed with profile fields
  // Best-effort cleanup of older seeds
  try { localStorage.removeItem("tma:db"); localStorage.removeItem("tma:db:v2"); } catch {}
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = () => 250 + Math.floor(Math.random() * 200);

  function seed() {
    const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
    const treks = [
      { id: 1, name: "Hampta Pass Crossing",    location: "Himachal Pradesh", difficulty: "Moderate", duration_days: 5, price: 9500,  max_slots: 20, available_slots: 6,  status: "Open",      start_date: "2026-06-12", description: "A classic crossover trek from lush Kullu valley to the moonscapes of Lahaul. Snow patches, alpine meadows, and the dramatic pass at 14,000 ft.", staff_id: 2, image_url: img("1464822759023-fed622ff2c3b") },
      { id: 2, name: "Sandakphu Ridge",         location: "West Bengal",      difficulty: "Easy",     duration_days: 6, price: 11000, max_slots: 18, available_slots: 12, status: "Open",      start_date: "2026-06-20", description: "Walk the spine of the Singalila range with four of the world's five tallest peaks on the horizon — Everest, Kanchenjunga, Lhotse, Makalu.", staff_id: 3, image_url: img("1486870591958-9b9d0d1dde9b") },
      { id: 3, name: "Kedarkantha Summit",      location: "Uttarakhand",      difficulty: "Easy",     duration_days: 5, price: 8500,  max_slots: 25, available_slots: 0,  status: "Open",      start_date: "2026-07-02", description: "A winter favourite turned summer wildflower walk. Clear summit views of Bandarpoonch, Swargarohini, and the Gangotri range.", staff_id: 2, image_url: img("1483728642387-6c3bdd6c93e5") },
      { id: 4, name: "Rupin Pass",              location: "Uttarakhand",      difficulty: "Hard",     duration_days: 8, price: 14500, max_slots: 16, available_slots: 4,  status: "Open",      start_date: "2026-07-15", description: "Hanging villages, a three-stage waterfall, and a knife-edge snow pass at 15,250 ft. Eight days of varied terrain.", staff_id: 3, image_url: img("1454496522488-7a8e488e8606") },
      { id: 5, name: "Goecha La",               location: "Sikkim",           difficulty: "Hard",     duration_days: 10, price: 22000, max_slots: 14, available_slots: 9, status: "Approved",  start_date: "2026-09-05", description: "Sunrise on Kanchenjunga from the viewpoint at 15,100 ft. Long days, rhododendron forests, and a true high-altitude push.", staff_id: 3, image_url: img("1519681393784-d120267933ba") },
      { id: 6, name: "Dzongri Loop",            location: "Sikkim",           difficulty: "Moderate", duration_days: 6, price: 13500, max_slots: 18, available_slots: 18, status: "Pending", start_date: "2026-10-10", description: "Shorter Kanchenjunga base trek with panoramic Dzongri top sunrise. Gentle gradient, dense forests of dwarf rhododendron.", staff_id: null, image_url: img("1551632811-561732d1e306") },
      { id: 7, name: "Brahmatal Winter",        location: "Uttarakhand",      difficulty: "Moderate", duration_days: 6, price: 10500, max_slots: 22, available_slots: 14, status: "Open",     start_date: "2026-12-22", description: "Frozen lake, ridge walks with Mt. Trishul looming, and powder snow camping. The classic Indian winter trek.", staff_id: 2, image_url: img("1517822487758-08c5e1b3d2db") },
      { id: 8, name: "Markha Valley",           location: "Ladakh",           difficulty: "Hard",     duration_days: 9, price: 19500, max_slots: 14, available_slots: 7,  status: "Open",      start_date: "2026-08-08", description: "Buddhist villages, river crossings, and the Kongmaru La at 17,060 ft. A true Trans-Himalayan experience.", staff_id: 3, image_url: img("1506905925346-21bda4d32df4") },
    ];
    const users = [
      { id: 1, name: "Asha Menon",     email: "admin@ridgeline.app",   role: "admin",    active: true,  blacklisted: false, password: "admin123", phone: "+91 98200 11223", bio: "Founder & operations lead. Ten Himalayan seasons and counting.", avatar: "https://i.pravatar.cc/200?img=5",  joined: "2022-01-10" },
      { id: 2, name: "Devraj Pawar",   email: "devraj@ridgeline.app",  role: "staff",    active: true,  blacklisted: false, password: "staff123", phone: "+91 99300 44556", bio: "Trek leader · wilderness first responder. Specialises in Uttarakhand winter routes.", avatar: "https://i.pravatar.cc/200?img=15", joined: "2023-03-02" },
      { id: 3, name: "Karma Lhamo",    email: "karma@ridgeline.app",   role: "staff",    active: true,  blacklisted: false, password: "staff123", phone: "+91 97400 66778", bio: "Sikkim & Ladakh specialist. High-altitude expedition lead since 2019.", avatar: "https://i.pravatar.cc/200?img=45", joined: "2023-05-21" },
      { id: 4, name: "Riya Sharma",    email: "riya@trekker.app",      role: "trekker",  active: true,  blacklisted: false, password: "trek123",  phone: "+91 90000 12345", bio: "Weekend wanderer chasing ridgelines.", avatar: "https://i.pravatar.cc/200?img=47", joined: "2025-02-14" },
      { id: 5, name: "Vikram Iyer",    email: "vikram@trekker.app",    role: "trekker",  active: true,  blacklisted: false, password: "trek123",  phone: "+91 90000 54321", bio: "Software by day, summits by season.", avatar: "https://i.pravatar.cc/200?img=12", joined: "2024-11-30" },
      { id: 6, name: "Nora Tashi",     email: "nora@trekker.app",      role: "trekker",  active: false, blacklisted: false, password: "trek123",  phone: "", bio: "", avatar: "https://i.pravatar.cc/200?img=32", joined: "2026-01-08" },
      { id: 7, name: "Mahesh Rao",     email: "mahesh@trekker.app",    role: "trekker",  active: true,  blacklisted: true,  password: "trek123",  phone: "", bio: "", avatar: "", joined: "2025-09-19" },
    ];
    const bookings = [
      { id: 1001, user_id: 4, trek_id: 1, status: "Booked",    booked_on: "2026-05-02" },
      { id: 1002, user_id: 4, trek_id: 7, status: "Booked",    booked_on: "2026-05-11" },
      { id: 1003, user_id: 4, trek_id: 3, status: "Cancelled", booked_on: "2026-04-18" },
      { id: 1004, user_id: 5, trek_id: 2, status: "Booked",    booked_on: "2026-05-09" },
      { id: 1005, user_id: 5, trek_id: 4, status: "Completed", booked_on: "2026-02-21" },
      { id: 1006, user_id: 6, trek_id: 8, status: "Booked",    booked_on: "2026-05-14" },
    ];
    // Participation trend — last 6 months bookings
    const trend = [
      { month: "Dec",  bookings: 18 },
      { month: "Jan",  bookings: 22 },
      { month: "Feb",  bookings: 27 },
      { month: "Mar",  bookings: 31 },
      { month: "Apr",  bookings: 40 },
      { month: "May",  bookings: 52 },
    ];
    return { treks, users, bookings, trend, _nextId: { trek: 9, user: 8, booking: 1007 } };
  }

  function load() {
    let raw = localStorage.getItem(LS);
    if (!raw) {
      const s = seed();
      localStorage.setItem(LS, JSON.stringify(s));
      return s;
    }
    try { return JSON.parse(raw); }
    catch { const s = seed(); localStorage.setItem(LS, JSON.stringify(s)); return s; }
  }
  function save(db) { localStorage.setItem(LS, JSON.stringify(db)); }

  function fakeJwt(user) {
    // header.payload.signature — payload is real base64 JSON; signature is fake.
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      sub: user.id, email: user.email, name: user.name, role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
    }));
    return `${header}.${payload}.demo`;
  }

  async function call(method, url, body) {
    await wait(jitter());
    const db = load();

    // ---- auth ----
    if (method === "POST" && url === "/auth/login") {
      const u = db.users.find(u => u.email === body.email && u.password === body.password);
      if (!u) throw { response: { status: 401, data: { detail: "Invalid email or password" } } };
      if (u.blacklisted) throw { response: { status: 403, data: { detail: "Account blacklisted" } } };
      if (!u.active) throw { response: { status: 403, data: { detail: "Account inactive" } } };
      return { token: fakeJwt(u), user: stripPw(u) };
    }
    if (method === "POST" && url === "/auth/register") {
      if (db.users.some(u => u.email === body.email))
        throw { response: { status: 409, data: { detail: "Email already registered" } } };
      const u = { id: db._nextId.user++, name: body.name, email: body.email, role: "trekker", active: true, blacklisted: false, password: body.password };
      db.users.push(u); save(db);
      return { token: fakeJwt(u), user: stripPw(u) };
    }

    // ---- treks ----
    if (method === "GET" && url === "/treks") return db.treks.slice();
    if (method === "GET" && url.startsWith("/treks/")) {
      const id = +url.split("/")[2];
      const t = db.treks.find(t => t.id === id);
      if (!t) throw notFound();
      return t;
    }
    if (method === "POST" && url === "/treks") {
      const t = { id: db._nextId.trek++, available_slots: body.max_slots, status: "Pending", staff_id: null, ...body };
      db.treks.push(t); save(db); return t;
    }
    if (method === "PATCH" && url.startsWith("/treks/")) {
      const id = +url.split("/")[2];
      const t = db.treks.find(t => t.id === id); if (!t) throw notFound();
      Object.assign(t, body); save(db); return t;
    }
    if (method === "DELETE" && url.startsWith("/treks/")) {
      const id = +url.split("/")[2];
      db.treks = db.treks.filter(t => t.id !== id); save(db); return { ok: true };
    }

    // ---- users / staff ----
    if (method === "GET" && url === "/users") return db.users.map(stripPw);
    if (method === "GET" && url.startsWith("/users/")) {
      const id = +url.split("/")[2];
      const u = db.users.find(u => u.id === id);
      if (!u) throw notFound();
      return stripPw(u);
    }
    if (method === "POST" && url === "/users/staff") {
      const u = { id: db._nextId.user++, role: "staff", active: true, blacklisted: false, password: body.password || "staff123", ...body };
      u.role = "staff";
      db.users.push(u); save(db); return stripPw(u);
    }
    if (method === "PATCH" && url.startsWith("/users/")) {
      const id = +url.split("/")[2];
      const u = db.users.find(u => u.id === id); if (!u) throw notFound();
      Object.assign(u, body); save(db); return stripPw(u);
    }

    // ---- bookings ----
    if (method === "GET" && url === "/bookings/me") {
      const userId = body.userId;
      return db.bookings.filter(b => b.user_id === userId).map(b => ({ ...b, trek: db.treks.find(t => t.id === b.trek_id) }));
    }
    if (method === "GET" && url.startsWith("/bookings/trek/")) {
      const trekId = +url.split("/")[3];
      return db.bookings.filter(b => b.trek_id === trekId).map(b => ({ ...b, user: stripPw(db.users.find(u => u.id === b.user_id)) }));
    }
    if (method === "POST" && url === "/bookings") {
      const t = db.treks.find(t => t.id === body.trek_id); if (!t) throw notFound();
      if (t.status !== "Open") throw bad("Trek is not open for booking");
      if (t.available_slots <= 0) throw bad("No slots available");
      const existing = db.bookings.find(b => b.user_id === body.user_id && b.trek_id === body.trek_id && b.status === "Booked");
      if (existing) throw bad("You already have an active booking for this trek");
      const b = { id: db._nextId.booking++, user_id: body.user_id, trek_id: body.trek_id, status: "Booked", booked_on: new Date().toISOString().slice(0, 10) };
      t.available_slots -= 1;
      db.bookings.push(b); save(db); return b;
    }
    if (method === "PATCH" && url.startsWith("/bookings/")) {
      const id = +url.split("/")[2];
      const b = db.bookings.find(b => b.id === id); if (!b) throw notFound();
      const prev = b.status;
      Object.assign(b, body);
      // restore slot if cancelling a previously-booked one
      if (prev === "Booked" && body.status === "Cancelled") {
        const t = db.treks.find(t => t.id === b.trek_id); if (t) t.available_slots += 1;
      }
      save(db); return b;
    }
    if (method === "POST" && url === "/bookings/export") {
      // simulates the async export job (returns 202 + a fake job id)
      return { job_id: "exp_" + Math.random().toString(36).slice(2, 8), status: "queued" };
    }

    // ---- admin metrics ----
    if (method === "GET" && url === "/metrics/admin") {
      const popular = db.treks.map(t => {
        const booked = db.bookings.filter(b => b.trek_id === t.id && b.status !== "Cancelled").length;
        return { trek: t.name, booked };
      }).sort((a, b) => b.booked - a.booked).slice(0, 6);
      return {
        total_treks: db.treks.length,
        active_users: db.users.filter(u => u.active && !u.blacklisted).length,
        total_bookings: db.bookings.length,
        open_treks: db.treks.filter(t => t.status === "Open").length,
        popular,
        trend: db.trend,
      };
    }

    throw { response: { status: 404, data: { detail: "Unknown route " + method + " " + url } } };
  }

  function stripPw(u) { if (!u) return u; const { password, ...rest } = u; return rest; }
  function notFound() { return { response: { status: 404, data: { detail: "Not found" } } }; }
  function bad(msg) { return { response: { status: 400, data: { detail: msg } } }; }

  global.MockAPI = { call };
})(window);
