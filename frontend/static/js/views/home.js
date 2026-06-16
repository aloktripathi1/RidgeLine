/* Home: routes to role-appropriate landing.
   - Trekker / anonymous → Catalog
   - Staff → Staff dashboard
   - Admin → Admin dashboard
*/
window.HomeView = {
  template: `<div></div>`,
  created() {
    const u = store.state.user;
    if (!u)                       this.$router.replace("/catalog");
    else if (u.role === "admin")  this.$router.replace("/admin");
    else if (u.role === "staff")  this.$router.replace("/staff");
    else                          this.$router.replace("/catalog");
  }
};
