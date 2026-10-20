/* Optional Supabase session gate for the student dashboard.
   Public Study Vault materials remain public. The dashboard is gated once auth-config.js is configured. */
(function () {
  "use strict";
  const root = document.documentElement;
  const configured = typeof window.icseAuthIsConfigured === "function" && window.icseAuthIsConfigured();
  function reveal() { root.classList.remove("auth-check-pending"); }
  function addBanner(message, linkText, linkHref, email) {
    const banner = document.createElement("div");
    banner.className = "mx-auto my-3 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm";
    const text = document.createElement("p");
    text.className = "text-amber-100";
    text.textContent = email ? "Signed in as " + email : message;
    const actions = document.createElement("div");
    actions.className = "flex flex-wrap items-center gap-3";
    const link = document.createElement("a");
    link.href = linkHref;
    link.className = "font-bold text-amber-300 hover:text-amber-200";
    link.textContent = linkText;
    actions.appendChild(link);
    if (email) {
      const logout = document.createElement("button");
      logout.type = "button";
      logout.className = "rounded-lg border border-gray-700 px-3 py-2 font-bold text-gray-200 hover:border-amber-500";
      logout.textContent = "Sign out";
      logout.addEventListener("click", async () => {
        logout.disabled = true;
        const { error } = await window.icseSupabase.auth.signOut();
        if (error) { logout.disabled = false; alert("Sign out failed. Please try again."); }
        else location.replace("./login.html");
      });
      actions.appendChild(logout);
    }
    banner.append(text, actions);
    const header = document.querySelector("body > header");
    if (header) header.insertAdjacentElement("afterend", banner);
    else document.body.prepend(banner);
  }

  if (!configured || !window.supabase || typeof window.supabase.createClient !== "function") {
    addBanner("Student sign-in is not configured yet. Dashboard data stays in this browser.", "Set up / sign in", "./login.html");
    reveal();
    return;
  }
  window.icseSupabase = window.supabase.createClient(window.ICSE_AUTH_CONFIG.supabaseUrl, window.ICSE_AUTH_CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.icseSupabase.auth.getSession().then(({ data, error }) => {
    if (error || !data || !data.session) {
      const next = encodeURIComponent("dashboard.html");
      location.replace("./login.html?next=" + next);
      return;
    }
    addBanner("", "Account", "./login.html", data.session.user.email || "Student");
    reveal();
  }).catch(() => {
    location.replace("./login.html?next=dashboard.html");
  });
})();