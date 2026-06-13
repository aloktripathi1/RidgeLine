/* API wrapper. Routes through MockAPI for the demo.
   To wire to a real FastAPI backend later, replace `MockAPI.call(...)` with axios calls
   against window.API_BASE.
*/
(function (global) {
  async function call(method, url, body) {
    try {
      return await MockAPI.call(method, url, body);
    } catch (e) {
      throw e;
    }
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

    // bookings
    myBookings:    (userId) => call("GET", "/bookings/me", { userId }),
    trekBookings:  (trekId) => call("GET", "/bookings/trek/" + trekId),
    book:          (user_id, trek_id) => call("POST", "/bookings", { user_id, trek_id }),
    updateBooking: (id, body) => call("PATCH", "/bookings/" + id, body),
    exportBookings:(userId) => call("POST", "/bookings/export", { userId }),

    // metrics
    adminMetrics:  () => call("GET", "/metrics/admin"),
  };
})(window);
