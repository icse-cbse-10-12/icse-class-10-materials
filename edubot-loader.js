/* EduBot boot loader: the shared API client loads only after optional-service consent and first use. */
(() => {
  const form = document.getElementById("edubotChatForm");
  const input = document.getElementById("edubotChatInput");
  const status = document.getElementById("edubotChatStatus");
  const drawer = document.getElementById("edubotDrawer");
  const drawerPanel = drawer?.querySelector(".edubot-drawer-panel");
  const closeButton = drawer?.querySelector(".edubot-drawer-close");
  let previousFocus = null;
  if (!form) return;

  function toggleEduBot(open) {
    if (!drawer) return;
    const shouldOpen = Boolean(open);
    if (shouldOpen && drawer.hidden) previousFocus = document.activeElement;
    drawer.hidden = !shouldOpen;
    drawer.setAttribute("aria-hidden", String(!shouldOpen));
    document.body.classList.toggle("edubot-drawer-open", shouldOpen);
    if (shouldOpen) closeButton?.focus({ preventScroll: true });
    else previousFocus?.focus?.({ preventScroll: true });
  }
  window.toggleEduBot = toggleEduBot;
  drawer?.querySelector("[data-edubot-close]")?.addEventListener("click", () => toggleEduBot(false));
  drawer?.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); toggleEduBot(false); return; }
    if (event.key !== "Tab" || !drawerPanel) return;
    const focusable = [...drawerPanel.querySelectorAll('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  let modulePromise = null;
  let ready = false;
  let submissionPending = false;

  function hasExternalConsent() {
    return !!(window.ICSEConsent && window.ICSEConsent.has("externalServices") === true);
  }

  function requestConsent() {
    if (status) status.textContent = "EduBot sends your question and recent conversation context to the Vercel-hosted EduBot API, which may use Google Gemini or Groq. Enable Optional external services in Privacy settings to continue.";
    window.ICSEConsent?.open();
  }

  function loadEduBot() {
    if (!modulePromise) {
      modulePromise = import("./gemini-ai.js?v=3")
        .then(() => { ready = true; })
        .catch(error => {
          modulePromise = null;
          throw error;
        });
    }
    return modulePromise;
  }

  function reportLoadError() {
    if (status) status.textContent = "EduBot could not load. Check your connection and try again.";
  }

  input?.addEventListener("focus", () => {
    if (!hasExternalConsent()) { requestConsent(); return; }
    if (ready) return;
    loadEduBot().catch(error => {
      console.error("[EduBot loader]", error);
      reportLoadError();
    });
  });

  form.addEventListener("submit", async event => {
    if (!hasExternalConsent()) { event.preventDefault(); requestConsent(); return; }
    if (ready) return;
    event.preventDefault();
    if (submissionPending) return;
    submissionPending = true;
    const submitter = event.submitter;
    try {
      await loadEduBot();
      if (submitter) form.requestSubmit(submitter);
      else form.requestSubmit();
    } catch (error) {
      console.error("[EduBot loader]", error);
      reportLoadError();
    } finally {
      submissionPending = false;
    }
  });
})();
