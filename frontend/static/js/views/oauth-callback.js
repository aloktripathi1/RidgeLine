/* OAuth callback — reads ?token= from the URL after Google redirects back. */
window.OAuthCallbackView = {
  template: /*html*/`
    <div class="container-xxl py-5 text-center">
      <div class="spinner-border text-ridge mb-3" role="status"></div>
      <p class="text-muted">Signing you in…</p>
    </div>
  `,
  created() {
    const token = this.$route.query.token;
    const error = this.$route.query.error;

    if (error) {
      store.toast({ title: "Sign-in failed", body: this.errMsg(error), variant: "danger", delay: 6000 });
      this.$router.replace("/login");
      return;
    }

    if (!token) {
      this.$router.replace("/login");
      return;
    }

    try {
      const [, payload] = token.split(".");
      const claims = JSON.parse(atob(payload));
      store.setAuth(token, {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        role: claims.role,
      });
      store.toast({
        title: "Welcome, " + claims.name.split(" ")[0] + "!",
        body: "Signed in with Google.",
        variant: "success",
      });
      const dest = claims.role === "admin" ? "/admin"
                 : claims.role === "staff"  ? "/staff"
                 : "/catalog";
      this.$router.replace(dest);
    } catch {
      store.toast({ title: "Sign-in failed", body: "Could not verify credentials.", variant: "danger" });
      this.$router.replace("/login");
    }
  },
  methods: {
    errMsg(code) {
      return {
        google_not_configured: "Google sign-in is not set up on this server.",
        oauth_cancelled:       "Sign-in was cancelled.",
        state_mismatch:        "Security check failed — please try again.",
        token_failed:          "Could not exchange Google token. Please try again.",
        userinfo_failed:       "Could not fetch your Google profile. Please try again.",
        account_disabled:      "Your account has been disabled.",
        no_email:              "Google did not share an email address.",
      }[code] || "Sign-in failed. Please try again.";
    },
  },
};
