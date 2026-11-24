(() => {
  "use strict";

  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("mainNavigation");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    nav.addEventListener("click", event => {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
    });
  }

  const frame = document.querySelector("[data-existing-app]");
  if (!frame) return;

  const status = document.getElementById("frameStatus");
  const requestedQuery = new URLSearchParams(window.location.search).get("q") || "";
  let resizeObserver;
  let mutationObserver;

  function installEmbeddedPresentation(doc) {
    if (doc.getElementById("mcEmbeddedCatalogStyles")) return;
    const style = doc.createElement("style");
    style.id = "mcEmbeddedCatalogStyles";
    style.textContent = `
      html,body{height:auto!important;min-height:0!important;background:#ede9df!important;color:#282a27!important}
      body{padding-bottom:0!important}
      body>header,body>footer,#siteNavOverlay,.mobile-bottom-nav,#icseStudyTools,#icseStudyToggle,#icsePrivacySettings{display:none!important}
      #mainContent{width:100%!important;max-width:none!important;margin:0!important;padding:16px 0 38px!important;color:#282a27!important}
      body.mc-home[data-site-mode="light"]{--vault-paper:#ede9df;--vault-ink:#282a27;--vault-green:#243d32;--vault-line:rgba(36,61,50,.2)}
      body.mc-home[data-site-mode="light"] .library-discovery{background:#f7f4ec!important;border-color:#d8d4c9!important;box-shadow:none!important}
      body.mc-home[data-site-mode="light"] .library-discovery:after{border-color:rgba(36,61,50,.12)!important;box-shadow:0 0 0 24px rgba(36,61,50,.025),0 0 0 48px rgba(36,61,50,.018)!important}
      body.mc-home[data-site-mode="light"] .library-search-wrap{background:#fffdf8!important;border-color:#d8d4c9!important;box-shadow:none!important}
      body.mc-home[data-site-mode="light"] .library-search-field{background:#fff!important;border-color:#c9c7bb!important}
      body.mc-home[data-site-mode="light"] .library-search-field:focus-within{border-color:#243d32!important;box-shadow:0 0 0 3px rgba(36,61,50,.12)!important}
      body.mc-home[data-site-mode="light"] .subject-group-tab.active{background:#243d32!important;border-color:#243d32!important}
      body.mc-home[data-site-mode="light"] #mainSubjectGrid>*{background:#fffdf8!important;border-color:#d8d4c9!important;box-shadow:none!important}
      body.mc-home[data-site-mode="light"] #mainSubjectGrid>*:hover{border-color:#9aa99a!important;box-shadow:0 7px 16px rgba(40,42,39,.06)!important}
      body.mc-home[data-site-mode="light"] .library-section-label h2{color:#243d32!important}
      body.mc-home[data-site-mode="light"] .library-heading h1{color:#282a27!important}
      body.mc-home[data-site-mode="light"] .library-eyebrow{color:#243d32!important}
      body.mc-home[data-site-mode="light"] .study-desk-quick-search button{background:#f7f4ec!important;color:#243d32!important;border-color:#d8d4c9!important}
      body.mc-home[data-site-mode="light"] .library-status{color:#5f685f!important}
      @media(max-width:760px){#mainContent{padding:10px 0 30px!important}}
    `;
    doc.head.appendChild(style);
  }

  function syncFrameHeight(doc) {
    const body = doc.body;
    const root = doc.documentElement;
    if (!body || !root) return;
    const height = Math.max(root.scrollHeight, body.scrollHeight, body.offsetHeight, 900);
    frame.style.height = Math.min(Math.ceil(height + 12), 60000) + "px";
  }

  function activateEmbeddedCatalogue() {
    try {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc || !doc.body) throw new Error("Catalogue document unavailable");
      installEmbeddedPresentation(doc);

      if (requestedQuery) {
        const input = doc.getElementById("globalSearchInput");
        if (input) {
          input.value = requestedQuery;
          if (typeof win.scheduleMaterialSearch === "function") win.scheduleMaterialSearch("global");
        }
      }

      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      if (typeof win.ResizeObserver === "function") {
        resizeObserver = new win.ResizeObserver(() => syncFrameHeight(doc));
        resizeObserver.observe(doc.documentElement);
        resizeObserver.observe(doc.body);
      }
      if (typeof win.MutationObserver === "function") {
        mutationObserver = new win.MutationObserver(() => syncFrameHeight(doc));
        mutationObserver.observe(doc.body, {subtree:true,childList:true,attributes:true,characterData:true});
      }
      syncFrameHeight(doc);
      if (status) status.textContent = "Catalogue ready. Search, filter and open resources below.";
    } catch (_) {
      if (status) status.textContent = "The embedded catalogue could not be prepared. Open the full Study Vault in a separate tab.";
    }
  }

  frame.addEventListener("load", activateEmbeddedCatalogue);
  window.addEventListener("resize", () => {
    try { syncFrameHeight(frame.contentDocument); } catch (_) {}
  }, {passive:true});
})();