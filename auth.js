/* ICSE MasterClass login, sign-up and password recovery. Uses only Supabase's public client key. */
(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  const notice = byId("authNotice");
  let mode = "login";
  let client = null;

  function showNotice(message, kind) {
    if (!notice) return;
    notice.textContent = message;
    notice.className = "mb-4 rounded-xl border p-3 text-sm leading-5 " +
      (kind === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" :
       kind === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" :
       "border-sky-500/40 bg-sky-500/10 text-sky-200");
    notice.classList.remove("hidden");
  }
  function setBusy(busy, label) {
    const button = byId("authSubmit");
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? "Please wait…" : label;
  }
  function redirectAfterLogin() {
    const requested = new URLSearchParams(location.search).get("next");
    const allowed = ["dashboard.html", "index.html", ""];
    const target = allowed.includes(requested) ? (requested || "dashboard.html") : "dashboard.html";
    location.replace(new URL("./" + target, location.href).href);
  }
  function switchMode(nextMode) {
    mode = nextMode === "signup" ? "signup" : "login";
    byId("formTitle").textContent = mode === "signup" ? "Create your account" : "Welcome back";
    byId("formSubtitle").textContent = mode === "signup" ? "Join the ICSE MasterClass student space." : "Sign in to your student account.";
    byId("authSubmit").innerHTML = mode === "signup" ? 'Create account <i class="fa-solid fa-arrow-right ml-2"></i>' : 'Sign in securely <i class="fa-solid fa-arrow-right ml-2"></i>';
    byId("authPassword").autocomplete = mode === "signup" ? "new-password" : "current-password";
    byId("forgotPassword").classList.toggle("hidden", mode !== "login");
    document.querySelectorAll("[data-mode]").forEach(button => {
      const active = button.dataset.mode === mode;
      button.className = active
        ? "rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-extrabold text-gray-950"
        : "rounded-xl border border-gray-700 px-3 py-2.5 text-sm font-bold text-gray-300 hover:border-amber-500";
    });
    notice.classList.add("hidden");
  }

  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => switchMode(button.dataset.mode)));

  const configReady = typeof window.icseAuthIsConfigured === "function" && window.icseAuthIsConfigured();
  if (!configReady || !window.supabase || typeof window.supabase.createClient !== "function") {
    byId("authSetupNotice").classList.remove("hidden");
    byId("authSubmit").disabled = true;
    byId("forgotPassword").disabled = true;
    byId("authSubmit").classList.add("opacity-50");
    return;
  }

  client = window.supabase.createClient(window.ICSE_AUTH_CONFIG.supabaseUrl, window.ICSE_AUTH_CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const params = new URLSearchParams(location.search);
  const recoveryMode = params.get("mode") === "recovery";
  if (recoveryMode) {
    byId("authForm").classList.add("hidden");
    byId("authModeTabs").classList.add("hidden");
    byId("forgotPassword").classList.add("hidden");
    byId("recoveryForm").classList.remove("hidden");
    byId("formTitle").textContent = "Choose a new password";
    byId("formSubtitle").textContent = "Set a new password for your account.";
  } else {
    client.auth.getSession().then(({ data }) => { if (data && data.session) redirectAfterLogin(); });
  }

  byId("authForm").addEventListener("submit", async event => {
    event.preventDefault();
    const email = byId("authEmail").value.trim();
    const password = byId("authPassword").value;
    if (password.length < 8) return showNotice("Use a password with at least 8 characters.", "error");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email, password,
          options: { emailRedirectTo: new URL("./login.html", location.href).href }
        });
        if (error) throw error;
        if (data.session) {
          showNotice("Account created. Opening your dashboard…", "success");
          redirectAfterLogin();
        } else {
          showNotice("Account created. Check your email for the confirmation link, then return here to sign in.", "success");
        }
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showNotice("Signed in successfully. Opening your dashboard…", "success");
        redirectAfterLogin();
      }
    } catch (error) {
      showNotice(error && error.message ? error.message : "Authentication failed. Please try again.", "error");
    } finally {
      setBusy(false, mode === "signup" ? "Create account" : "Sign in securely");
    }
  });

  byId("forgotPassword").addEventListener("click", async () => {
    const email = byId("authEmail").value.trim();
    if (!email) return showNotice("Enter your email address first, then select Forgot password.", "error");
    byId("forgotPassword").disabled = true;
    try {
      const redirectTo = new URL("./login.html?mode=recovery", location.href).href;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showNotice("If an account exists for that email, a password-reset link will arrive shortly.", "success");
    } catch (error) {
      showNotice(error && error.message ? error.message : "Could not send the reset email. Please try again.", "error");
    } finally {
      byId("forgotPassword").disabled = false;
    }
  });

  byId("recoveryForm").addEventListener("submit", async event => {
    event.preventDefault();
    const password = byId("newPassword").value;
    if (password.length < 8) return showNotice("Use a password with at least 8 characters.", "error");
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      showNotice("Password updated. You can now sign in.", "success");
      byId("recoveryForm").classList.add("hidden");
      byId("authForm").classList.remove("hidden");
      byId("authModeTabs").classList.remove("hidden");
      byId("formTitle").textContent = "Password updated";
      byId("formSubtitle").textContent = "Sign in with your new password.";
      history.replaceState({}, document.title, new URL("./login.html", location.href).pathname);
    } catch (error) {
      showNotice(error && error.message ? error.message : "Could not update password. Open the reset link again.", "error");
    }
  });
})();