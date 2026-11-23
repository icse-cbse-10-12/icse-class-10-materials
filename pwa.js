(() => {
  "use strict";

  const installCard = document.getElementById("pwaInstallCard");
  const installAction = document.getElementById("pwaInstallAction");
  const installDescription = document.getElementById("pwaInstallDescription");
  const iosGuide = document.getElementById("pwaIosInstallGuide");
  const offlineNotice = document.getElementById("offlineNotice");

  const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const isAppleMobile = () => {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  };

  const updateConnection = () => {
    if (!offlineNotice) return;
    offlineNotice.hidden = navigator.onLine;
  };

  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
  updateConnection();

  if (isStandalone() && installCard) installCard.hidden = true;

  if (!isStandalone() && isAppleMobile() && installCard && iosGuide) {
    installCard.hidden = false;
    installDescription.textContent =
      "Add Study Vault to your iPhone or iPad home screen from Safari.";
    iosGuide.hidden = false;
    installAction.hidden = true;
  }

  document.addEventListener("icse:pwa-install-ready", () => {
    if (installCard) installCard.hidden = false;
    if (installAction) installAction.hidden = false;
    if (iosGuide) iosGuide.hidden = true;
  });

  document.addEventListener("icse:pwa-installed", () => {
    if (installCard) installCard.hidden = true;
  });

  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;
  let registration = null;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  const registerWorker = async () => {
    try {
      registration = await navigator.serviceWorker.register("./sw.js", {
        scope: "./",
        updateViaCache: "none"
      });
      await registration.update().catch(() => {});
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  };

  if (document.readyState === "complete") {
    registerWorker();
  } else {
    window.addEventListener("load", registerWorker, { once: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && registration) {
      registration.update().catch(() => {});
    }
  });
})();
