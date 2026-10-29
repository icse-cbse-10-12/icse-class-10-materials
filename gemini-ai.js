import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-ai.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.getElementById("edubotChatForm");
if (form) {
  const messages = document.getElementById("edubotChatMessages");
  const input = document.getElementById("edubotChatInput");
  const send = document.getElementById("edubotSendButton");
  const status = document.getElementById("edubotChatStatus");
  const clear = document.getElementById("edubotClearChat");
  let model;
  let history = [];
  let requestTimes = [];
  const MAX_HISTORY = 12;
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

  function getModel() {
    if (model) return model;
    const app = initializeApp(firebaseConfig);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      model: "gemini-2.5-flash",
      systemInstruction: "You are EduBot, a helpful, age-appropriate study assistant for ICSE Class 10 students. Explain concepts clearly and step by step, give examples and practice questions when useful, and be honest when unsure. Do not claim you have accessed the user's private study materials unless they are supplied in this conversation. Encourage students to verify important exam answers against their prescribed textbook. Never ask for passwords, phone numbers, or other private information."
    });
    return model;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt || send.disabled) return;
    const now = Date.now();
    requestTimes = requestTimes.filter(t => now - t < 60000);
    if (requestTimes.length >= MAX_PER_MINUTE) {
      status.textContent = "Please wait a minute before sending more questions.";
      return;
    }
    if (prompt.length > 1500) {
      status.textContent = "Please keep each question under 1,500 characters.";
      return;
    }
    requestTimes.push(now);
    addMessage("user", prompt);
    input.value = "";
    input.disabled = true;
    send.disabled = true;
    send.querySelector("span").textContent = "Thinking…";
    status.textContent = "EduBot is preparing an answer…";
    const pending = addMessage("assistant", "Thinking…");
    try {
      const chatModel = getModel();
      const chat = chatModel.startChat({ history: history.slice(-MAX_HISTORY) });
      const result = await chat.sendMessage(prompt);
      const answer = result.response.text();
      if (!answer) throw new Error("The model returned an empty response.");
      pending.querySelector("p").textContent = answer;
      history = [...history, { role: "user", parts: [{ text: prompt }] }, { role: "model", parts: [{ text: answer }] }].slice(-MAX_HISTORY);
      status.textContent = "Answer generated · Verify important facts with your textbook.";
    } catch (error) {
      pending.querySelector("p").textContent = "I couldn't answer just now. Please try again in a moment.";
      status.textContent = error?.message?.toLowerCase().includes("app check") ? "AI protection needs to be configured in Firebase AI Logic / App Check." : "AI request failed. Check Firebase AI Logic setup and try again.";
      console.error("[EduBot Gemini]", error);
    } finally {
      input.disabled = false;
      send.disabled = false;
      send.querySelector("span").textContent = "Send";
      input.focus({ preventScroll: true });
    }
  });

  clear.addEventListener("click", () => {
    history = [];
    messages.replaceChildren();
    addMessage("assistant", "Chat cleared. What would you like to study?");
    status.textContent = "New conversation started.";
    input.focus();
  });
}
