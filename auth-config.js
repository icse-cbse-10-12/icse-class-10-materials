/*
 * ICSE MasterClass — Supabase public client configuration
 * Fill in the values from Supabase Dashboard → Project Settings → API.
 * Use the Project URL and the publishable key (or legacy anon public key).
 * NEVER paste a service_role/secret key into this public GitHub Pages site.
 */
window.ICSE_AUTH_CONFIG = {
  supabaseUrl: "PASTE_SUPABASE_PROJECT_URL_HERE",
  supabaseAnonKey: "PASTE_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE"
};

window.icseAuthIsConfigured = function () {
  const config = window.ICSE_AUTH_CONFIG || {};
  return /^https:\/\/[^\s]+\.supabase\.co\/?$/.test(String(config.supabaseUrl || "")) &&
    Boolean(config.supabaseAnonKey) &&
    !String(config.supabaseAnonKey).includes("PASTE_SUPABASE_");
};
