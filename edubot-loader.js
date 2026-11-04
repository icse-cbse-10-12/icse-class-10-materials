/* EduBot boot loader: Firebase AI is downloaded only when a student uses the assistant. */
(() => {
  const form = document.getElementById("edubotChatForm");
  const input = document.getElementById("edubotChatInput");
  const status = document.getElementById("edubotChatStatus");
  if (!form) return;

  let modulePromise = null;
  let ready = false;

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
    loadEduBot().catch(error => {
      console.error("[EduBot loader]", error);
      reportLoadError();
    });
  }, { once: true });

  form.addEventListener("submit", async event => {
    if (ready) return;
    event.preventDefault();
    const submitter = event.submitter;
    try {
      await loadEduBot();
      if (submitter) form.requestSubmit(submitter);
      else form.requestSubmit();
    } catch (error) {
      console.error("[EduBot loader]", error);
      reportLoadError();
    }
  });
})();
