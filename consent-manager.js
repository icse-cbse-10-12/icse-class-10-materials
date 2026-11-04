/* ICSE MasterClass privacy preferences. No analytics SDK is loaded here. */
(() => {
  "use strict";
  const KEY = "icseMasterClassConsentV1";
  const VERSION = 1;
  const defaults = { necessary: true, analytics: false, externalServices: false };
  const REGION_PROFILES = Object.freeze({ unknown: "Not sure / prefer not to say", india: "India", eea_uk: "EEA / UK", california_us: "California / United States", other: "Other region" });
  let consent = null;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.version === VERSION && saved.categories) consent = {
      version: VERSION,
      updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : "",
      region: Object.prototype.hasOwnProperty.call(REGION_PROFILES, saved.region) ? saved.region : "unknown",
      categories: { ...defaults, analytics: saved.categories.analytics === true, externalServices: saved.categories.externalServices === true }
    };
  } catch (_) {}

  const has = category => category === "necessary" || !!(consent && consent.categories[category] === true);
  const style = document.createElement("style");
  style.textContent = ".icse-consent-select{width:100%;min-height:42px;padding:8px 10px;border:1px solid #60718a;border-radius:9px;background:#17263a;color:#fff;font:inherit;margin-top:6px}#icseConsentBanner,#icseConsentDialog,#icsePrivacySettings{font:14px/1.5 system-ui,sans-serif}#icseConsentBanner{position:fixed;z-index:10000;inset:auto 16px 16px;margin:auto;max-width:760px;padding:18px;background:#101b2b;color:#f8fafc;border:1px solid #40516a;border-radius:16px;box-shadow:0 18px 60px #0008}#icseConsentBanner p,#icseConsentDialog p{margin:6px 0;color:#d1d9e5}#icseConsentBanner a,#icseConsentDialog a{color:#f7ca76;text-underline-offset:3px}.icse-consent-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.icse-consent-btn{min-height:42px;padding:9px 14px;border:1px solid #60718a;border-radius:10px;background:#17263a;color:#fff;font-weight:700;cursor:pointer}.icse-consent-btn.primary{background:#f2bd58;color:#172033;border-color:#f2bd58}.icse-consent-btn:focus-visible,#icsePrivacySettings:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}#icseConsentDialog[hidden],#icseConsentBanner[hidden],#icsePrivacySettings[hidden]{display:none!important}#icseConsentDialog{position:fixed;z-index:10002;inset:0;display:grid;place-items:center;padding:16px;background:#020617c9}.icse-consent-panel{width:min(100%,560px);max-height:88vh;overflow:auto;padding:22px;background:#101b2b;color:#f8fafc;border:1px solid #40516a;border-radius:18px}.icse-consent-panel h2{margin:0 0 8px;font-size:1.35rem}.icse-consent-option{display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-top:1px solid #34445a}.icse-consent-option input{width:20px;height:20px;flex:0 0 20px;margin-top:2px;accent-color:#f2bd58}.icse-consent-option strong{display:block;color:#fff}.icse-consent-option small{display:block;color:#c1ccda;margin-top:3px}#icsePrivacySettings{position:fixed;z-index:9998;left:12px;bottom:12px;min-height:38px;padding:8px 11px;border:1px solid #60718a;border-radius:999px;background:#101b2b;color:#f8fafc;font-size:12px;font-weight:700;box-shadow:0 4px 18px #0005;cursor:pointer}#icseConsentStatus{min-height:1.3em;color:#f7ca76;font-size:12px}@media(max-width:520px){#icseConsentBanner{inset:auto 8px 8px;padding:14px}.icse-consent-actions>*{flex:1 1 100%}.icse-consent-panel{padding:18px}}@media(prefers-reduced-motion:reduce){#icseConsentDialog *{scroll-behavior:auto!important;transition:none!important}}";
  document.head.append(style);

  const banner = document.createElement("section");
  banner.id = "icseConsentBanner";
  banner.hidden = true;
  banner.setAttribute("aria-label", "Privacy choices");
  banner.innerHTML = '<strong>Privacy choices</strong><p>Necessary storage keeps sign-in, saved preferences and offline features working. Optional analytics are currently not enabled. EduBot sends the question you submit to Google Gemini; enable optional services only if you want to use it. You can change your choices later.</p><p><a href="cookie-policy.html">Cookie Policy</a> · <a href="privacy-policy.html">Privacy Policy</a></p><div class="icse-consent-actions"><button class="icse-consent-btn primary" type="button" data-consent-action="accept">Accept all</button><button class="icse-consent-btn" type="button" data-consent-action="reject">Reject optional</button><button class="icse-consent-btn" type="button" data-consent-action="customise">Customise</button></div>';

  const dialog = document.createElement("div");
  dialog.id = "icseConsentDialog";
  dialog.hidden = true;
  dialog.innerHTML = '<section class="icse-consent-panel" role="dialog" aria-modal="true" aria-labelledby="icseConsentTitle" aria-describedby="icseConsentDescription"><h2 id="icseConsentTitle">Privacy preferences</h2><p id="icseConsentDescription">Choose which optional categories you allow. Necessary storage is always on because the site cannot provide core functions without it.</p><label class="icse-consent-option"><span><strong>Privacy region (optional)</strong><select id="icseConsentRegion" class="icse-consent-select"><option value="unknown">Not sure / prefer not to say</option><option value="india">India</option><option value="eea_uk">EEA / UK</option><option value="california_us">California / United States</option><option value="other">Other region</option></select><small>This is self-selected, not inferred from your location. It does not determine which laws apply; optional categories remain off by default for every profile.</small></span></label><div class="icse-consent-option"><input type="checkbox" checked disabled aria-label="Necessary storage always active"><div><strong>Necessary storage <small>(always active)</small></strong><small>Authentication persistence, this preference record, local study data you choose to save, and offline application cache.</small></div></div><label class="icse-consent-option"><input id="icseConsentAnalytics" type="checkbox"><span><strong>Analytics</strong><small>Optional audience measurement. No analytics SDK is currently activated by this website.</small></span></label><label class="icse-consent-option"><input id="icseConsentExternal" type="checkbox"><span><strong>Optional external services</strong><small>Enables EduBot to load Google Firebase AI Logic and send the question and recent chat context you submit to Google Gemini. It also permits the administrator-only Supabase connection when an administrator manually starts it.</small></span></label><p id="icseConsentStatus" role="status" aria-live="polite"></p><div class="icse-consent-actions"><button class="icse-consent-btn primary" type="button" data-consent-action="save">Save choices</button><button class="icse-consent-btn" type="button" data-consent-action="reject">Reject optional</button><button class="icse-consent-btn" type="button" data-consent-action="close">Cancel</button></div><p><a href="cookie-policy.html">Read the Cookie Policy</a></p></section>';

  const settings = document.createElement("button");
  settings.id = "icsePrivacySettings";
  settings.type = "button";
  settings.textContent = "Privacy settings";
  settings.setAttribute("aria-haspopup", "dialog");

  function render() {
    banner.hidden = !!consent;
    document.getElementById("icseConsentAnalytics").checked = has("analytics");
    document.getElementById("icseConsentExternal").checked = has("externalServices");
    document.getElementById("icseConsentRegion").value = consent?.region || "unknown";
  }
  function openDialog() {
    document.getElementById("icseConsentAnalytics").checked = has("analytics");
    document.getElementById("icseConsentExternal").checked = has("externalServices");
    document.getElementById("icseConsentRegion").value = consent?.region || "unknown";
    dialog.hidden = false;
    document.getElementById("icseConsentRegion").focus();
  }
  function closeDialog() { dialog.hidden = true; settings.focus(); }
  function save(analytics, externalServices, region = document.getElementById("icseConsentRegion")?.value || consent?.region || "unknown") {
    const next = { version: VERSION, updatedAt: new Date().toISOString(), region: Object.prototype.hasOwnProperty.call(REGION_PROFILES, region) ? region : "unknown", categories: { ...defaults, analytics: !!analytics, externalServices: !!externalServices } };
    try { localStorage.setItem(KEY, JSON.stringify(next)); consent = next; }
    catch (_) {
      consent = null;
      document.getElementById("icseConsentStatus").textContent = "Your browser could not save this choice. Optional services remain disabled in this page.";
    }
    render();
    closeDialog();
  }
  function action(name) {
    if (name === "accept") save(true, true, consent?.region || "unknown");
    else if (name === "reject") save(false, false, consent?.region || "unknown");
    else if (name === "customise") openDialog();
    else if (name === "save") save(document.getElementById("icseConsentAnalytics").checked, document.getElementById("icseConsentExternal").checked, document.getElementById("icseConsentRegion").value);
    else if (name === "close") closeDialog();
  }
  banner.addEventListener("click", event => { const button = event.target.closest("[data-consent-action]"); if (button) action(button.dataset.consentAction); });
  dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); const button = event.target.closest("[data-consent-action]"); if (button) action(button.dataset.consentAction); });
  settings.addEventListener("click", openDialog);
  document.addEventListener("keydown", event => {
    if (dialog.hidden) return;
    if (event.key === "Escape") { closeDialog(); return; }
    if (event.key === "Tab") {
      const focusable = [...dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), select, a[href]")];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.body.append(banner, dialog, settings);
  window.ICSEConsent = Object.freeze({ has, open: openDialog, get: () => consent ? JSON.parse(JSON.stringify(consent)) : null, version: VERSION });
  render();
})();