/* EduBot boot loader: Firebase AI is downloaded only when a student uses the assistant. */
(() => {
  const form = document.getElementById("edubotChatForm");
  const input = document.getElementById("edubotChatInput");
  const status = document.getElementById("edubotChatStatus");
  if (!form) return;

  let modulePromise = null;
  let ready = false;
  let submissionPending = false;

  function hasExternalConsent() {
    return !!(window.ICSEConsent && window.ICSEConsent.has("externalServices") === true);
  }

  function requestConsent() {
    if (status) status.textContent = "EduBot sends your question and recent chat context to Google Gemini. Enable Optional external services in Privacy settings to continue.";
    window.ICSEConsent?.open();
  }

  function loadEduBot() {
    if (!modulePromise) {
      modulePromise = import("./gemini-ai.js?v=2")
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
