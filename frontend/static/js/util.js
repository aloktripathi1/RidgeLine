/* Shared utilities: debounce, currency formatter, difficulty -> badge mapping. */
(function (global) {
  function debounce(fn, wait = 350) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  function inr(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }
  function difficultyClass(d) {
    return d === "Easy" ? "text-bg-success"
         : d === "Moderate" ? "text-bg-warning"
         : "text-bg-danger";
  }
  function statusClass(s) {
    return ({
      "Pending":   "text-bg-secondary",
      "Approved":  "text-bg-info",
      "Open":      "text-bg-success",
      "Closed":    "text-bg-dark",
      "Completed": "text-bg-primary",
      "Booked":    "text-bg-success",
      "Cancelled": "text-bg-secondary",
    })[s] || "text-bg-light";
  }
  function fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  global.util = { debounce, inr, difficultyClass, statusClass, fmtDate };
})(window);
