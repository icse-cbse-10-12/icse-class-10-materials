(() => {
  "use strict";
  const form = document.getElementById("icseAiForm");
  if (!form) return;
  const question = document.getElementById("icseAiInput");
  const subject = document.getElementById("icseAiSubject");
  const status = document.getElementById("icseAiStatus");
  const copyButton = document.getElementById("icseAiSend");
  const botLink = document.getElementById("icseAiLaunch");

  // Questions stay in the browser until a student chooses to paste them in Telegram.
  // Do not add a secret AI API key or Telegram bot token to a public GitHub Pages site.
  function setStatus(text, successful) {
    status.textContent = text;
    status.classList.toggle("icse-ai-copied", !!successful);
  }
  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) { /* fall back for restricted clipboard permissions */ }
    }
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
    helper.remove();
    return copied;
  }
  document.querySelectorAll("#icseAiTutor [data-ai-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      question.value = button.dataset.aiPrompt || "";
      question.focus();
      question.setSelectionRange(question.value.length, question.value.length);
      setStatus("Finish your question, then copy it and open the tutor.", false);
    });
  });
  question.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const value = question.value.trim();
    if (!value) { question.focus(); return; }
    const prompt = "ICSE Class 10 | " + subject.value + "\n" + value;
    copyButton.disabled = true;
    try {
      if (await copyToClipboard(prompt)) {
        setStatus("✓ Question copied! Tap Open AI Tutor on Telegram, press Start if asked, and paste your question into the chat.", true);
        botLink.focus({ preventScroll: true });
      } else {
        setStatus("Clipboard permission is unavailable. Select and copy your question manually, then open the Telegram bot.", false);
        question.focus();
        question.select();
      }
    } finally { copyButton.disabled = false; }
  });
})();