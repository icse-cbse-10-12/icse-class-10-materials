// Shared EduBot client for the Study Vault embed.
// AI provider credentials and model calls stay on the EduBot Vercel server.
const API_URL = "https://edubot-nu-wheat.vercel.app/api/chat";
const form = document.getElementById("edubotChatForm");

if (form) {
  const messages = document.getElementById("edubotChatMessages");
  const input = document.getElementById("edubotChatInput");
  const send = document.getElementById("edubotSendButton");
  const status = document.getElementById("edubotChatStatus");
  const clear = document.getElementById("edubotClearChat");
  let history = [];
  let requestTimes = [];
  const MAX_HISTORY_MESSAGES = 10;
  const MAX_PER_MINUTE = 8;

  function addMessage(role, text) {
    const item = document.createElement("div");
    item.className = "edubot-message " + (role === "user" ? "edubot-message-user" : "edubot-message-assistant");
    const label = document.createElement("strong");
    label.textContent = role === "user" ? "You" : "EduBot";
    const body = document.createElement("p");
    body.textContent = text;
    item.append(label, body);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt || send.disabled) return;

    const now = Date.now();
    requestTimes = requestTimes.filter(timestamp => now - timestamp < 60_000);
    if (requestTimes.length >= MAX_PER_MINUTE) {
      status.textContent = "Please wait a minute before sending more questions.";
      return;
    }
    if (prompt.length > 1500) {
      status.textContent = "Please keep each question under 1,500 characters.";
      return;
    }

    requestTimes.push(now);
    const previousHistory = history.slice(-MAX_HISTORY_MESSAGES);
    addMessage("user", prompt);
    input.value = "";
    input.disabled = true;
    send.disabled = true;
    send.querySelector("span").textContent = "Thinking…";
    status.textContent = "EduBot is preparing an answer…";
    const pending = addMessage("assistant", "Thinking…");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          targetExam: "ICSE Class 10",
          subject: "General",
          history: previousHistory
        }),
        signal: AbortSignal.timeout(30_000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) throw new Error(data.error || "Too many requests. Please wait a minute.");
        throw new Error(data.error || "EduBot is temporarily unavailable. Please try again.");
      }
      const answer = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!answer) throw new Error("EduBot returned an empty response. Please try again.");

      pending.querySelector("p").textContent = answer;
      history = [
        ...previousHistory,
        { role: "user", content: prompt },
        { role: "assistant", content: answer }
      ].slice(-MAX_HISTORY_MESSAGES);
      status.textContent = "Answer generated · Verify important facts with your textbook.";
    } catch (error) {
      pending.querySelector("p").textContent = "I couldn't answer just now. Please try again in a moment.";
      status.textContent = error?.name === "TimeoutError"
        ? "The request took too long. Please try again."
        : (error?.message || "AI request failed. Check your connection and try again.");
      console.error("[EduBot API]", error);
    } finally {
      input.disabled = false;
      send.disabled = false;
      send.querySelector("span").textContent = "Send";
      input.focus({ preventScroll: true });
    }
  });

  clear?.addEventListener("click", () => {
    history = [];
    messages.replaceChildren();
    addMessage("assistant", "Chat cleared. What would you like to study?");
    status.textContent = "New conversation started.";
    input.focus();
  });
}
