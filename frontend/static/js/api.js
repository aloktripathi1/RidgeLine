/* API wrapper — calls the real FastAPI backend via axios.
   All responses are unwrapped from the {success, data, message} envelope.
   Errors throw as { response: { data: { detail } } } to match the error
   handling pattern already used across views.
*/
(function (global) {
  const BASE = window.__API_BASE__ || "/api";

  async function call(method, url, body) {
    const headers = { "Content-Type": "application/json" };
    if (store.state.token) {
      headers["Authorization"] = "Bearer " + store.state.token;
    }

    const config = { method, url: BASE + url, headers };
    if (body !== undefined && body !== null) {
      if (method === "GET" || method === "DELETE") {
        config.params = body;
      } else {
        config.data = body;
      }
    }

    const res = await axios(config);
    // Unwrap FastAPI success envelope
    if (res.data && res.data.data !== undefined) return res.data.data;
    return res.data;
  }

  global.api = {
    // auth
    login:    (email, password) => call("POST", "/auth/login",    { email, password }),
    register: (name, email, password) => call("POST", "/auth/register", { name, email, password }),

    // treks
    listTreks:   () => call("GET",   "/treks"),
    getTrek:     (id) => call("GET", "/treks/" + id),
    createTrek:  (body) => call("POST",   "/treks", body),
    updateTrek:  (id, body) => call("PATCH", "/treks/" + id, body),
    deleteTrek:  (id) => call("DELETE", "/treks/" + id),

    // users / staff
    listUsers:   () => call("GET", "/users"),
    getUser:     (id) => call("GET", "/users/" + id),
    createStaff: (body) => call("POST", "/users/staff", body),
    updateUser:  (id, body) => call("PATCH", "/users/" + id, body),
    updateMyProfile: (body) => call("PATCH", "/users/me", body),

    // bookings — user identity comes from the JWT, no userId parameter needed
    myBookings:    () => call("GET", "/bookings/me"),
    trekBookings:  (trekId) => call("GET", "/bookings/trek/" + trekId),
    book:          (_user_id, trek_id) => call("POST", "/bookings", { trek_id }),
    updateBooking: (id, body) => call("PATCH", "/bookings/" + id, body),
    exportBookings: () => call("POST", "/bookings/export", {}),

    // metrics
    adminMetrics: () => call("GET", "/metrics/admin"),

    // AI
    aiRecommend: (prefs) => call("POST", "/ai/recommend", prefs),
    aiItinerary: (trekId, opts) => call("POST", "/ai/itinerary/" + trekId, opts || {}),
    aiDescribe:  (body) => call("POST", "/ai/describe", body),
    aiChat:      (messages, trekId) => call("POST", "/ai/chat", { messages, trek_id: trekId || null }),
  };
})(window);
