
/* =====================================================
   ICSE MasterClass — Student Study Tools
   Free, browser-based, GitHub Pages compatible
   ===================================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "icseMasterClassStudyToolsV1";

  const defaults = {
    tasks: [],
    focusMinutes: 25,
    breakMinutes: 5,
    remainingSeconds: 25 * 60,
    mode: "focus"
  };

  let state;

  try {
    state = {
      ...defaults,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    };
  } catch {
    state = { ...defaults };
  }

  let timerId = null;
  let running = false;

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save study progress.", error);
    }
  };

  const escapeHTML = value =>
    String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  const formatTime = seconds => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  function addStyles() {
    if (document.getElementById("icse-study-tools-css")) return;

    const style = document.createElement("style");
    style.id = "icse-study-tools-css";

    style.textContent = `
      #icseStudyTools {
        --study-accent: var(--site-accent, #f59e0b);
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 90;
        font-family: inherit;
      }

      #icseStudyTools button,
      #icseStudyTools input {
        font: inherit;
      }

      #icseStudyToggle {
        background: var(--study-accent);
        color: #111827;
        border: 0;
        border-radius: 999px;
        padding: 13px 18px;
        font-weight: 800;
        box-shadow: 0 8px 28px #0005;
        cursor: pointer;
      }

      #icseStudyPanel {
        width: min(370px, calc(100vw - 24px));
        max-height: min(75vh, 650px);
        overflow-y: auto;
        margin-bottom: 12px;
        padding: 18px;
        border: 1px solid #334155;
        border-radius: 20px;
        background: #0b1220;
        color: #f8fafc;
        box-shadow: 0 18px 55px #0008;
      }

      #icseStudyPanel[hidden] {
        display: none;
      }

      #icseStudyPanel h2 {
        font-size: 18px;
        font-weight: 900;
        margin: 0;
      }

      #icseStudyPanel h3 {
        font-size: 13px;
        font-weight: 800;
        margin: 18px 0 10px;
      }

      #icseStudyPanel .study-muted {
        color: #94a3b8;
        font-size: 12px;
      }

      #icseStudyPanel .study-time {
        font-size: 42px;
        font-weight: 900;
        text-align: center;
        font-variant-numeric: tabular-nums;
        margin: 14px 0;
      }

      #icseStudyPanel .study-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      #icseStudyPanel .study-btn {
        padding: 9px 12px;
        border: 1px solid #334155;
        border-radius: 10px;
        color: #f8fafc;
        background: #172033;
        cursor: pointer;
      }

      #icseStudyPanel .study-btn.primary {
        background: var(--study-accent);
        color: #111827;
        border-color: var(--study-accent);
        font-weight: 800;
      }

      #icseStudyPanel .study-input {
        min-width: 0;
        width: 100%;
        padding: 10px;
        border: 1px solid #334155;
        border-radius: 10px;
        background: #111827;
        color: #f8fafc;
      }

      #icseStudyPanel .study-task {
        display: flex;
        align-items: start;
        gap: 8px;
        padding: 9px 0;
        border-bottom: 1px solid #263244;
        overflow-wrap: anywhere;
      }

      #icseStudyPanel .study-task input {
        margin-top: 4px;
        accent-color: var(--study-accent);
      }

      #icseStudyPanel .study-task label {
        flex: 1;
        font-size: 13px;
      }

      #icseStudyPanel .study-task.done label {
        text-decoration: line-through;
        color: #94a3b8;
      }

      #icseStudyPanel button:focus-visible,
      #icseStudyPanel input:focus-visible,
      #icseStudyToggle:focus-visible {
        outline: 2px solid var(--study-accent);
        outline-offset: 3px;
      }

      @media (max-width: 480px) {
        #icseStudyTools {
          right: 12px;
          bottom: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function renderTasks() {
    const list = document.getElementById("icseStudyTasks");
    const count = document.getElementById("icseStudyCount");

    if (!list || !count) return;

    const completed = state.tasks.filter(task => task.done).length;
    count.textContent = `${completed}/${state.tasks.length} completed`;

    list.innerHTML = state.tasks.map(task => `
      <div class="study-task ${task.done ? "done" : ""}">
        <input
          type="checkbox"
          data-task-check="${escapeHTML(task.id)}"
          ${task.done ? "checked" : ""}
          aria-label="Mark task complete"
        >
        <label>${escapeHTML(task.text)}</label>
        <button
          class="study-btn"
          data-task-delete="${escapeHTML(task.id)}"
          aria-label="Delete task"
        >×</button>
      </div>
    `).join("") || `
      <p class="study-muted">Your revision checklist is empty.</p>
    `;
  }

  function renderTimer() {
    const display = document.getElementById("icseStudyTime");
    const modeLabel = document.getElementById("icseStudyMode");
    const startButton = document.getElementById("icseStudyStart");

    if (!display || !modeLabel || !startButton) return;

    display.textContent = formatTime(state.remainingSeconds);

    modeLabel.textContent =
      state.mode === "focus" ? "Focus session" : "Break time";

    startButton.textContent = running ? "Pause" : "Start";
  }

  function setMode(mode) {
    pauseTimer();

    state.mode = mode;
    state.remainingSeconds =
      (mode === "focus" ? state.focusMinutes : state.breakMinutes) * 60;

    save();
    renderTimer();
  }

  function pauseTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }

    running = false;
  }

  function startTimer() {
    if (running) {
      pauseTimer();
      renderTimer();
      return;
    }

    running = true;
    renderTimer();

    timerId = setInterval(() => {
      if (state.remainingSeconds > 0) {
        state.remainingSeconds--;
        save();
        renderTimer();
      }

      if (state.remainingSeconds <= 0) {
        pauseTimer();
        renderTimer();

        if ("Notification" in window &&
            Notification.permission === "granted") {
          new Notification("ICSE MasterClass", {
            body: state.mode === "focus"
              ? "Focus session complete. Take a break!"
              : "Break complete. Ready to study?"
          });
        }

        // Do not automatically switch modes or start another session.
      }
    }, 1000);
  }

  function mount() {
    if (document.getElementById("icseStudyTools")) return;

    addStyles();

    const root = document.createElement("div");
    root.id = "icseStudyTools";

    root.innerHTML = `
      <section id="icseStudyPanel" hidden
        aria-label="Student study tools">

        <div class="study-row" style="justify-content:space-between">
          <div>
            <h2>Study Tools 📚</h2>
            <p class="study-muted">Your personal study space</p>
          </div>
          <button id="icseStudyClose" class="study-btn"
            aria-label="Close study tools">✕</button>
        </div>

        <h3>⏱️ Pomodoro Timer</h3>
        <p id="icseStudyMode" class="study-muted"
          style="text-align:center">Focus session</p>

        <div id="icseStudyTime" class="study-time"
          role="timer" aria-live="off">25:00</div>

        <div class="study-row">
          <button id="icseStudyStart"
            class="study-btn primary" style="flex:1">Start</button>
          <button id="icseStudyReset"
            class="study-btn">Reset</button>
        </div>

        <div class="study-row" style="margin-top:10px">
          <label class="study-muted" style="flex:1">
            Focus minutes
            <input id="icseFocusMinutes" class="study-input"
              type="number" min="1" max="180" value="25">
          </label>
          <label class="study-muted" style="flex:1">
            Break minutes
            <input id="icseBreakMinutes" class="study-input"
              type="number" min="1" max="60" value="5">
          </label>
        </div>

        <button id="icseStudyApply" class="study-btn"
          style="width:100%;margin-top:8px">
          Apply timer settings
        </button>

        <h3>📋 Revision Checklist</h3>
        <p id="icseStudyCount" class="study-muted">0/0 completed</p>

        <form id="icseStudyForm" class="study-row">
          <input id="icseStudyTaskInput" class="study-input"
            maxlength="160" placeholder="Add a chapter or task..."
            aria-label="New revision task" required>
          <button class="study-btn primary" type="submit">Add</button>
        </form>

        <div id="icseStudyTasks"></div>

        <p class="study-muted" style="margin-top:14px">
          Progress is saved in this browser on this device.
        </p>
      </section>

      <button id="icseStudyToggle"
        aria-expanded="false" aria-controls="icseStudyPanel">
        📚 Study Tools
      </button>
    `;

    document.body.appendChild(root);

    const panel = root.querySelector("#icseStudyPanel");
    const toggle = root.querySelector("#icseStudyToggle");

    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });

    root.querySelector("#icseStudyClose").addEventListener("click", () => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    });

    root.querySelector("#icseStudyStart")
      .addEventListener("click", startTimer);

    root.querySelector("#icseStudyReset").addEventListener("click", () => {
      pauseTimer();
      state.remainingSeconds =
        (state.mode === "focus" ? state.focusMinutes : state.breakMinutes) * 60;
      save();
      renderTimer();
    });

    root.querySelector("#icseStudyApply")
      .addEventListener("click", () => {
        const focus = Number(root.querySelector("#icseFocusMinutes").value);
        const rest = Number(root.querySelector("#icseBreakMinutes").value);

        if (!Number.isInteger(focus) || focus < 1 || focus > 180 ||
            !Number.isInteger(rest) || rest < 1 || rest > 60) {
          alert("Enter focus minutes from 1–180 and break minutes from 1–60.");
          return;
        }

        state.focusMinutes = focus;
        state.breakMinutes = rest;
        setMode(state.mode);
      });

    root.querySelector("#icseStudyMode")
      .insertAdjacentHTML("afterend", `
        <div class="study-row" style="justify-content:center;margin-top:8px">
          <button id="icseFocusMode" class="study-btn">Focus</button>
          <button id="icseBreakMode" class="study-btn">Break</button>
        </div>
      `);

    root.querySelector("#icseFocusMode")
      .addEventListener("click", () => setMode("focus"));

    root.querySelector("#icseBreakMode")
      .addEventListener("click", () => setMode("break"));

    root.querySelector("#icseStudyForm")
      .addEventListener("submit", event => {
        event.preventDefault();

        const input = root.querySelector("#icseStudyTaskInput");
        const text = input.value.trim();

        if (!text) return;

        state.tasks.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text,
          done: false
        });

        input.value = "";
        save();
        renderTasks();
      });

    root.querySelector("#icseStudyTasks")
      .addEventListener("change", event => {
        const id = event.target.dataset.taskCheck;
        if (!id) return;

        const task = state.tasks.find(item => item.id === id);
        if (!task) return;

        task.done = event.target.checked;
        save();
        renderTasks();
      });

    root.querySelector("#icseStudyTasks")
      .addEventListener("click", event => {
        const id = event.target.dataset.taskDelete;
        if (!id) return;

        state.tasks = state.tasks.filter(task => task.id !== id);
        save();
        renderTasks();
      });

    root.querySelector("#icseFocusMinutes").value = state.focusMinutes;
    root.querySelector("#icseBreakMinutes").value = state.breakMinutes;

    renderTasks();
    renderTimer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
