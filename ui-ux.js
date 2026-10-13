
/* ==================================================
   ICSE MASTERCLASS — UI/UX INTERACTIONS
   Keyboard shortcuts, accessibility and safe links
   ================================================== */

(() => {
  "use strict";

  function secureExternalLinks(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") {
      return;
    }

    root.querySelectorAll('a[target="_blank"]').forEach(link => {
      const relValues = new Set(
        (link.getAttribute("rel") || "")
          .split(/\s+/)
          .filter(Boolean)
      );

      relValues.add("noopener");
      relValues.add("noreferrer");

      link.setAttribute("rel", [...relValues].join(" "));
    });
  }

  function initUX() {
    // Prevent duplicate initialization.
    if (document.documentElement.dataset.uxReady === "true") {
      return;
    }

    document.documentElement.dataset.uxReady = "true";

    const globalSearch =
      document.getElementById("globalSearchInput");

    const settingsOverlay =
      document.getElementById("settingsOverlay");

    const settingsToggle =
      document.getElementById("settingsToggle");

    const statusMessage =
      document.getElementById("statusMessage");

    // Announce database status to assistive technologies.
    if (statusMessage) {
      statusMessage.setAttribute("role", "status");
      statusMessage.setAttribute("aria-live", "polite");
      statusMessage.setAttribute("aria-atomic", "true");
    }

    // Secure links that already exist.
    secureExternalLinks();

    // Keyboard shortcuts.
    document.addEventListener("keydown", event => {
      const target = event.target;

      const isTyping =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            target.tagName
          )
        );

      // Press "/" to focus global search.
      if (
        event.key === "/" &&
        !isTyping &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        globalSearch
      ) {
        event.preventDefault();

        globalSearch.focus();

        globalSearch.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

      // Escape closes settings or clears the active search.
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
          globalSearch &&
          globalSearch.value.trim() !== ""
        ) {
          globalSearch.value = "";

          if (
            typeof window.searchAllMaterials === "function"
          ) {
            window.searchAllMaterials();
          }
        }
      }
    });

    // Add a keyboard shortcut hint beside the search label.
    const searchLabel = document.querySelector(
      'label[for="globalSearchInput"]'
    );

    if (
      searchLabel &&
      !searchLabel.querySelector(".ux-shortcut")
    ) {
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

    // Secure links whenever material cards are rendered.
    const resourceGrid =
      document.getElementById("resourceGrid");

    if (resourceGrid && "MutationObserver" in window) {
      const observer = new MutationObserver(() => {
        secureExternalLinks(resourceGrid);
      });

      observer.observe(resourceGrid, {
        childList: true,
        subtree: true
      });
    }

    // Recheck links after browser history restoration.
    window.addEventListener("pageshow", () => {
      secureExternalLinks();
    });
  }

  // Correctly initialize whether this script loads before
  // or after the DOM is ready.
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initUX,
      { once: true }
    );
  } else {
    initUX();
  }
})();
