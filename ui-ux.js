
/* ==================================================
   ICSE MASTERCLASS — UI/UX INTERACTIONS
   Works alongside the existing script.js
   ================================================== */

(() => {
  "use strict";

  function initUX() {
    // Avoid duplicate initialisation.
    if (document.documentElement.dataset.uxReady === "true") {
      return;
    }

    document.documentElement.dataset.uxReady = "true";

    const globalSearch = document.getElementById("globalSearchInput");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const settingsToggle = document.getElementById("settingsToggle");

    // Keyboard shortcuts:
    // / = focus global search
    // Escape = close settings or clear focused search
    document.addEventListener("keydown", event => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        );

      if (
        event.key === "/" &&
        !isTyping &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();

        if (globalSearch) {
          globalSearch.focus();
          globalSearch.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      }

      if (event.key === "Escape") {
        if (
          settingsOverlay &&
          !settingsOverlay.classList.contains("hidden") &&
          typeof window.toggleSettings === "function"
        ) {
          window.toggleSettings(false);
          settingsToggle?.focus();
          return;
        }

        if (
          target === globalSearch &&
          globalSearch.value.trim() !== ""
        ) {
          globalSearch.value = "";

          if (typeof window.searchAllMaterials === "function") {
            window.searchAllMaterials();
          }
        }
      }
    });

    // Add a visible keyboard hint without replacing the input placeholder.
    const searchLabel = document.querySelector(
      'label[for="globalSearchInput"]'
    );

    if (searchLabel && !searchLabel.querySelector(".ux-shortcut")) {
      const hint = document.createElement("span");
      hint.className = "ux-shortcut";
      hint.textContent = " / to search";
      hint.setAttribute("aria-hidden", "true");

      hint.style.cssText = [
        "display:inline-block",
        "margin-left:8px",
        "padding:2px 6px",
        "border:1px solid rgba(148,163,184,.25)",
        "border-radius:6px",
        "color:#9ca3af",
        "font-size:10px",
        "font-weight:500"
      ].join(";");

      searchLabel.appendChild(hint);
    }

    // Prevent accidental double submission when opening resources.
    // All existing resource links remain unchanged.
    document.querySelectorAll("#resourceGrid a").forEach(link => {
      if (link.target === "_blank") {
        link.rel = "noopener noreferrer";
      }
    });

    // Keep search usable when the browser restores the page from history.
    window.addEventListener("pageshow", () => {
      document.documentElement.dataset.uxReady = "true";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUX, { once: true });
  } else {
    initUX();
     
    // Improve accessibility announcements for database status.
    const statusMessage = document.getElementById("statusMessage");

    if (statusMessage) {
      statusMessage.setAttribute("role", "status");
      statusMessage.setAttribute("aria-live", "polite");
    }

    // Ensure external resource links opened in new tabs are safer.
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const relValues = new Set(
        (link.getAttribute("rel") || "").split(/\s+/).filter(Boolean)
      );

      relValues.add("noopener");
      relValues.add("noreferrer");

      link.setAttribute("rel", [...relValues].join(" "));
    });

  }
})();
