/* ============================================================
   ICSE MasterClass — Study Materials
   Google Sheets database, global search, previews and sharing
   ============================================================ */

// Published Google Sheets CSV Endpoint & Proxy Fallback
const primaryCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLGKfaC9WUePvCArs7YAxYP9tmoPYkCdfJviR2pdOnlSZ6gVLEqgtAEga4XLQpubVTfEsHo2eWBWx7/pub?output=csv";

const fallbackCsvUrl =
  "https://api.allorigins.win/raw?url=" +
  encodeURIComponent(primaryCsvUrl);

// Full Subject List
const subjectsList = [
  "All",
  "Physics",
  "Physical Education",
  "Mathematics",
  "Home Science",
  "History & Civics",
  "Geography",
  "Environmental Applications",
  "Environmental Science",
  "English Literature",
  "English Language",
  "Economic Applications",
  "Computer Applications",
  "Commercial Studies",
  "Commercial Applications",
  "Chemistry",
  "Biology",
  "Second Language - Tamil",
  "Second Language - Malayalam",
  "Second Language - Kannada",
  "Second Language - Hindi",
  "Second Language: Telugu",
  "Other Subjects"
];

let currentSubject = "All";
let currentCategory = "All";
let currentPublisher = "all";
let allResources = [];
let filteredResources = [];
// Build only a small number of cards per frame to keep mobile devices responsive.
// Filter and search still scan the complete catalogue of 8,000+ materials.
const RESOURCE_PAGE_SIZE = 36;
let visibleResourceCount = RESOURCE_PAGE_SIZE;
let materialSearchTimer = null;
const materialSearchTextCache = new WeakMap();
function materialSearchText(item) {
  let cached = materialSearchTextCache.get(item);
  if (cached !== undefined) return cached;
  cached = [
    item["Book Name"],item["Subject"],item["Publisher/Company"],item["Publisher"],
    item["Category"],item["Scope"],item["Edition"],item["Format"]
  ].filter(Boolean).join(" ").toLowerCase();
  materialSearchTextCache.set(item,cached);
  return cached;
}
function scheduleMaterialSearch(source) {
  clearTimeout(materialSearchTimer);
  materialSearchTimer = setTimeout(() => {
    materialSearchTimer = null;
    if (source === "global") searchAllMaterials();
    else filterResources();
  }, 200);
}
function loadMoreMaterials() {
  if (visibleResourceCount >= filteredResources.length) return;
  const from = visibleResourceCount;
  visibleResourceCount = Math.min(visibleResourceCount + RESOURCE_PAGE_SIZE, filteredResources.length);
  renderGrid(filteredResources, from);
}
let deferredPwaPrompt = null;
let currentPersonalView = "all";
const SAVED_MATERIALS_KEY = "icseMasterClass.savedMaterials.v1";
const RECENT_MATERIALS_KEY = "icseMasterClass.recentMaterials.v1";

function readPersonalList(storageKey) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
  } catch (error) { return []; }
}
function writePersonalList(storageKey, values) {
  try { localStorage.setItem(storageKey, JSON.stringify(values)); return true; }
  catch (error) { console.warn("Personal library could not be saved in this browser.", error); return false; }
}
function getMaterialKey(item) {
  const shareId = String(item?.["Share ID"] || "").trim();
  if (shareId) return `share:${shareId}`;
  return [item?.["Book Name"], item?.["Subject"], item?.["Category"], item?.["Edition"]].map(value => String(value || "").trim().toLowerCase()).join("|");
}
function isMaterialSaved(item) { return readPersonalList(SAVED_MATERIALS_KEY).includes(getMaterialKey(item)); }
function updatePersonalLibraryUI() {
  const savedCount = document.getElementById("savedMaterialCount");
  if (savedCount) savedCount.textContent = String(readPersonalList(SAVED_MATERIALS_KEY).length);
  document.querySelectorAll("[data-personal-view]").forEach(button => {
    const active = button.dataset.personalView === currentPersonalView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function setPersonalView(view) {
  currentPersonalView = ["all", "saved", "recent"].includes(view) ? view : "all";
  if (currentPersonalView !== "all") {
    currentSubject = "All"; currentCategory = "All";
    const search = document.getElementById("searchInput"); const year = document.getElementById("yearFilter");
    if (search) search.value = ""; if (year) year.value = "all";
    document.querySelectorAll(".cat-btn").forEach(button => button.classList.remove("active-tab", "bg-amber-500", "text-black"));
    document.querySelector(".cat-btn")?.classList.add("active-tab", "bg-amber-500", "text-black");
    const title = document.getElementById("selectedSubjectTitle");
    if (title) title.textContent = currentPersonalView === "saved" ? "Saved Materials" : "Recently Opened";
    document.getElementById("mainLandingView")?.classList.add("hidden");
    document.getElementById("subjectDetailView")?.classList.remove("hidden");
  } else {
    const title = document.getElementById("selectedSubjectTitle");
    if (title && ["Saved Materials", "Recently Opened"].includes(title.textContent)) title.textContent = "All Subjects Vault";
  }
  updatePersonalLibraryUI(); filterResources();
}
function toggleSavedMaterial(key) {
  if (!key) return;
  const saved = readPersonalList(SAVED_MATERIALS_KEY);
  writePersonalList(SAVED_MATERIALS_KEY, saved.includes(key) ? saved.filter(value => value !== key) : [key, ...saved]);
  updatePersonalLibraryUI(); filterResources();
}
function recordRecentMaterial(item) {
  const key = getMaterialKey(item); if (!key) return;
  const recent = readPersonalList(RECENT_MATERIALS_KEY).filter(value => value !== key);
  recent.unshift(key); writePersonalList(RECENT_MATERIALS_KEY, recent.slice(0, 20));
}

/* ============================================================
   URL VALIDATION
   ============================================================ */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function isVerifiedPdfResource(item, url = "") {
  if (String(item?.Format || "").trim().toLowerCase() === "pdf") return true;
  try { return new URL(url).pathname.toLowerCase().endsWith(".pdf"); } catch (_) { return false; }
}

function normalizeExternalUrl(value, rejectGenericCisceHome = false) {
  const raw = String(value || "").trim();

  if (
    !raw ||
    raw === "#" ||
    /^(not available|n\/a|na|none|null|undefined)$/i.test(raw)
  ) {
    return "";
  }

  let url;

  try {
    url = new URL(
      /^https?:\/\//i.test(raw) ? raw : "https://" + raw
    );
  } catch {
    return "";
  }

  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.hostname ||
    !url.hostname.includes(".") ||
    url.username ||
    url.password
  ) {
    return "";
  }

  const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();

  // A generic CISCE homepage is not a specific book link.
  if (
    rejectGenericCisceHome &&
    hostname === "cisce.org" &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash
  ) {
    return "";
  }

  return url.href;
}

/* ============================================================
   PWA INSTALL PROMPT
   ============================================================ */

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPwaPrompt = event;

  document.getElementById("pwaInstallBtn")
    ?.classList.remove("hidden");
});

function installPwaApp() {
  if (!deferredPwaPrompt) return;

  deferredPwaPrompt.prompt();

  deferredPwaPrompt.userChoice.then(choiceResult => {
    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the PWA install prompt");
    }

    deferredPwaPrompt = null;

    document.getElementById("pwaInstallBtn")
      ?.classList.add("hidden");
  });
}

/* ============================================================
   SUBJECT GRID
   ============================================================ */

function getSubjectIllustration(subject) {
  const n=String(subject||"").toLowerCase(); let art="book",tone="sage";
  if(n==="all"){art="library";} else if(n.includes("physics")){art="atom";tone="blue";}
  else if(n.includes("chemistry")){art="flask";tone="rose";} else if(n.includes("biology")){art="leaf";tone="green";}
  else if(n.includes("mathematics")){art="geometry";tone="lavender";} else if(n.includes("computer")){art="chip";tone="blue";}
  else if(n.includes("geography")){art="globe";tone="sky";} else if(n.includes("history")){art="column";tone="sand";}
  else if(n.includes("english")){art="book";tone="rose";} else if(n.includes("language")){art="speech";tone="lavender";}
  else if(n.includes("physical education")){art="ball";tone="green";} else if(n.includes("home science")){art="home";tone="sand";}
  else if(n.includes("commercial")||n.includes("economic")){art="briefcase";tone="sand";}
  else if(n.includes("environment")){art="sprout";tone="green";}
  const paths={
    library:'<path d="M15 27 40 14l25 13v31H15zM9 27 40 10l31 17M23 35h11v23H23zm23 0h11v23H46z"/>',
    atom:'<ellipse cx="40" cy="39" rx="29" ry="11"/><ellipse cx="40" cy="39" rx="29" ry="11" transform="rotate(60 40 39)"/><ellipse cx="40" cy="39" rx="29" ry="11" transform="rotate(120 40 39)"/><circle cx="40" cy="39" r="4" fill="currentColor"/>',
    flask:'<path d="M31 12h18M35 12v20L19 59q-3 6 5 6h32q8 0 5-7L45 32V12M27 49h26"/><circle cx="36" cy="54" r="2" fill="currentColor"/><circle cx="47" cy="57" r="2" fill="currentColor"/>',
    leaf:'<path d="M64 13C34 13 15 25 15 47c0 11 8 18 19 18 23 0 30-25 30-52ZM17 64c11-18 23-29 42-43M34 47l-2-14m15 2 10-1"/>',
    geometry:'<path d="M12 60 39 13l29 47z"/><circle cx="40" cy="39" r="23"/><path d="M12 60h56M39 13v47"/>',
    chip:'<rect x="22" y="21" width="36" height="36" rx="5"/><rect x="30" y="29" width="20" height="20" rx="2"/><path d="M30 12v9m10-9v9m10-9v9M30 57v9m10-9v9m10-9v9M13 30h9m-9 10h9m-9 10h9m36-20h9m-9 10h9m-9 10h9"/>',
    globe:'<circle cx="40" cy="39" r="28"/><path d="M12 39h56M40 11c-17 17-17 39 0 56m0-56c17 17 17 39 0 56M17 25h46M17 53h46"/>',
    column:'<path d="M13 25 40 11l27 14zM17 29h46M20 29v27m13-27v27m14-27v27m13-27v27M14 59h52M10 65h60"/>',
    book:'<path d="M12 18q15-6 28 3v43q-13-9-28-3zM68 18q-15-6-28 3v43q13-9 28-3zM20 29q8-2 13 2m-13 8q8-2 13 2m19-12q8-4 13-2m-13 12q8-4 13-2"/>',
    speech:'<path d="M12 18q0-6 7-6h42q7 0 7 7v27q0 7-7 7H37L22 64v-11h-3q-7 0-7-7zM25 29h30M25 39h22"/>',
    ball:'<circle cx="40" cy="39" r="28"/><path d="m40 11 9 18-9 10-18-5-10 15m37 16-9-26 18-12M22 34l-7-18m34 13 19 7"/>',
    home:'<path d="m10 35 30-24 30 24M17 31v34h46V31M32 65V45h16v20M24 40h7v8h-7zm25 0h7v8h-7z"/>',
    briefcase:'<rect x="12" y="25" width="56" height="38" rx="4"/><path d="M29 25v-8h22v8M12 39h56M34 39v7h12v-7"/>',
    sprout:'<path d="M40 65V34m0 13C17 48 13 34 15 21c15-1 25 5 25 19m0 4c2-19 15-26 30-25 0 16-9 27-30 29M40 65H25"/>'
  };
  return `<svg class="mc-subject-art mc-art-${tone}" viewBox="0 0 80 76" role="img" aria-label="${escapeHTML(subject)} illustration" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths[art]}</g></svg>`;
}
const subjectGroups = {
  "Sciences": ["All", "Physics", "Chemistry", "Biology", "Physical Education", "Home Science", "Environmental Applications", "Environmental Science"],
  "Maths & Tech": ["Mathematics", "Computer Applications"],
  "Humanities": ["History & Civics", "Geography", "Economic Applications", "Commercial Studies", "Commercial Applications", "Other Subjects"],
  "Languages": ["English Literature", "English Language", "Second Language - Tamil", "Second Language - Malayalam", "Second Language - Kannada", "Second Language - Hindi", "Second Language: Telugu"]
};
let activeSubjectGroup = "Sciences";
function setSubjectGroup(group) {
  if (!Object.prototype.hasOwnProperty.call(subjectGroups, group)) return;
  activeSubjectGroup = group;
  initSubjectCards();
}
function initSubjectCards() {
  const grid=document.getElementById("mainSubjectGrid"); if(!grid)return;
  const subjects = subjectGroups[activeSubjectGroup] || subjectsList;
  grid.innerHTML=subjects.map(subject=>{
    const label=subject.replace(/^Second Language\s*[-:]?\s*/i,"");
    return `<button data-subject="${escapeHTML(subject)}" class="mc-subject-item" type="button" aria-label="Open ${escapeHTML(subject)} subject materials"><span class="mc-subject-illustration" aria-hidden="true">${getSubjectIllustration(subject)}</span><span class="mc-subject-copy"><span class="mc-subject-name">${subject === "All" ? "All Subjects" : escapeHTML(label)}</span><span class="mc-subject-hint">Explore materials <span aria-hidden="true">→</span></span></span></button>`;
  }).join("");
  document.querySelectorAll("[data-subject-group]").forEach(tab => {
    const active = tab.dataset.subjectGroup === activeSubjectGroup;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (tab.dataset.keyboardBound !== "true") {
      tab.addEventListener("keydown", event => {
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
        const tabs = [...document.querySelectorAll("[data-subject-group]")];
        const index = tabs.indexOf(tab);
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        event.preventDefault();
        tabs[nextIndex]?.focus();
        setSubjectGroup(tabs[nextIndex]?.dataset.subjectGroup);
      });
      tab.dataset.keyboardBound = "true";
    }
  });
  const activeTab = [...document.querySelectorAll("[data-subject-group]")].find(tab => tab.dataset.subjectGroup === activeSubjectGroup);
  if (activeTab) grid.setAttribute("aria-labelledby", activeTab.id);
  grid.querySelectorAll("button[data-subject]").forEach(button=>button.addEventListener("click",()=>selectSubject(button.dataset.subject)));
}

/* ============================================================
   FETCH GOOGLE SHEETS DATA
   ============================================================ */

async function requestResourceCsv(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Resource CSV request failed (${response.status}).`);
  }

  const csvText = await response.text();
  const resources = parseCSV(csvText);
  const hasExpectedHeaders =
    resources.length > 0 &&
    Object.prototype.hasOwnProperty.call(resources[0], "Book Name") &&
    Object.prototype.hasOwnProperty.call(resources[0], "Subject");

  if (!hasExpectedHeaders) {
    throw new Error("The response did not contain a valid study-material catalogue.");
  }

  return resources;
}

async function fetchSheetData() {
  const statusEl = document.getElementById("statusMessage");
  const embeddedCatalog = document.getElementById("catalog-data");
  if (embeddedCatalog) {
    try {
      const prerendered = JSON.parse(embeddedCatalog.textContent || "[]");
      if (Array.isArray(prerendered) && prerendered.length > 0) {
        allResources = prerendered;
        window.icseCatalogReady = true;
        if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600" aria-hidden="true"></i><span>Loaded ${allResources.length.toLocaleString()} materials from the pre-rendered catalogue.</span>`;
        const pendingQuery = document.getElementById("globalSearchInput")?.value?.trim();
        if (pendingQuery) searchAllMaterials();
        else checkHashRoute();
        return;
      }
    } catch (error) {
      console.warn("The pre-rendered catalogue could not be read; refreshing from Google Sheets.", error);
    }
  }
  try {
    const cacheResponse = await fetch("./catalog-data.json", { cache: "no-cache" });
    if (cacheResponse.ok) {
      const cachePayload = await cacheResponse.json();
      const cachedResources = Array.isArray(cachePayload)
        ? cachePayload
        : Array.isArray(cachePayload?.fields) && Array.isArray(cachePayload?.rows)
          ? cachePayload.rows.map(row => Object.fromEntries(cachePayload.fields.map((field, index) => [field, row[index] ?? ""])))
          : [];
      if (cachedResources.length > 0) {
        allResources = cachedResources;
        window.icseCatalogReady = true;
        if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600" aria-hidden="true"></i><span>Loaded ${allResources.length.toLocaleString()} materials from the cached catalogue.</span>`;
        const pendingQuery = document.getElementById("globalSearchInput")?.value?.trim();
        if (pendingQuery) searchAllMaterials();
        else checkHashRoute();
        return;
      }
    }
  } catch (error) {
    console.warn("The generated catalogue cache is unavailable; refreshing from Google Sheets.", error);
  }

  let resources = null;

  try {
    resources = await requestResourceCsv(primaryCsvUrl);
  } catch (error) {
    console.warn("Primary CSV fetch failed; trying fallback proxy.", error);

    try {
      resources = await requestResourceCsv(fallbackCsvUrl);
    } catch (fallbackError) {
      console.error("All resource CSV sources failed:", fallbackError);
    }
  }

  if (!resources) {
    if (statusEl) {
      statusEl.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation text-red-400" aria-hidden="true"></i>
        <span class="text-red-400">Could not load the study-material database. Check your connection and retry.</span>
        <button type="button" onclick="fetchSheetData()" class="ml-2 rounded-lg border border-red-400/40 px-3 py-1 text-red-300 hover:bg-red-400/10">Retry</button>
      `;
    }
    return;
  }

  allResources = resources;
  window.icseCatalogReady = true;

  if (statusEl) {
    statusEl.innerHTML = `
      <i class="fa-solid fa-circle-check text-emerald-400" aria-hidden="true"></i>
      <span>Loaded ${allResources.length} materials from database.</span>
    `;
  }

  // Preserve a search typed before the asynchronous CSV request completed.
  const pendingQuery = document.getElementById("globalSearchInput")?.value?.trim();
  if (pendingQuery) {
    searchAllMaterials();
  } else {
    checkHashRoute();
  }
}

/* ============================================================
   ROUTING
   ============================================================ */

function checkHashRoute() {
  const sharedId =
    new URLSearchParams(window.location.search).get("material");

  if (sharedId) {
    showSharedMaterialPage(sharedId);
    return;
  }

  document.body.classList.remove("shared-material-mode");

  const sharedPage = document.getElementById("sharedMaterialPage");

  if (sharedPage) {
    sharedPage.style.display = "none";
  }

  const hash = window.location.hash;

  if (hash && hash.startsWith("#subject-")) {
    let rawSubject = "";

    try {
      rawSubject = decodeURIComponent(
        hash.replace("#subject-", "")
      ).trim();
    } catch {
      rawSubject = "";
    }

    const matchedSubject = subjectsList.find(
      subject => subject.toLowerCase() === rawSubject.toLowerCase()
    );

    if (matchedSubject) {
      selectSubject(matchedSubject, false);
      return;
    }
  }

  document.getElementById("mainLandingView")
    ?.classList.remove("hidden");

  document.getElementById("subjectDetailView")
    ?.classList.add("hidden");
  document.querySelector(".library-discovery")?.classList.remove("hidden");
  document.getElementById("globalSearchWrap")?.classList.remove("hidden");
}

/* ============================================================
   CSV PARSER
   ============================================================ */

function parseCSV(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  if (!source.trim()) return [];

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (inQuotes && source[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(value => value !== "")) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(value => value.trim());
  return rows.slice(1).map(values => {
    const item = {};
    headers.forEach((header, index) => { item[header] = String(values[index] ?? "").trim(); });
    return item;
  }).filter(item => item["Book Name"] || item["Subject"]);
}

/* ============================================================
   SELECT SUBJECT
   ============================================================ */

function selectSubject(subjectName, updateHash = true) {
  currentPersonalView = "all"; updatePersonalLibraryUI();
  const globalWrap = document.getElementById("globalSearchWrap");
  const discovery = document.querySelector(".library-discovery");
  globalWrap?.classList.add("hidden");
  discovery?.classList.add("hidden");
  currentSubject = subjectName;

  if (updateHash) {
    if (subjectName === "All") {
      history.pushState(
        "",
        document.title,
        window.location.pathname + window.location.search
      );
    } else {
      window.location.hash =
        `subject-${encodeURIComponent(subjectName)}`;
    }
  }

  const landingView = document.getElementById("mainLandingView");
  const detailView = document.getElementById("subjectDetailView");
  const titleEl = document.getElementById("selectedSubjectTitle");

  if (titleEl) {
    titleEl.innerText =
      subjectName === "All" ? "All Subjects Vault" : subjectName;
  }

  landingView?.classList.add("hidden");
  detailView?.classList.remove("hidden");

  filterResources();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   GLOBAL SEARCH
   Works with the globalSearchInput added to index.html.
   ============================================================ */

function searchAllMaterials() {
  currentPersonalView = "all"; updatePersonalLibraryUI();
  const globalInput = document.getElementById("globalSearchInput");
  const detailInput = document.getElementById("searchInput");
  const landingView = document.getElementById("mainLandingView");
  const detailView = document.getElementById("subjectDetailView");
  const title = document.getElementById("selectedSubjectTitle");
  const globalWrap = document.getElementById("globalSearchWrap");
  const discovery = document.querySelector(".library-discovery");

  const query = globalInput?.value || "";

  if (detailInput) {
    detailInput.value = query;
  }

  currentSubject = "All";
  currentCategory = "All";

  document.querySelectorAll(".cat-btn").forEach(button => {
    button.classList.remove(
      "active-tab",
      "bg-amber-500",
      "text-black"
    );
  });

  document.querySelector(".cat-btn")?.classList.add(
    "active-tab",
    "bg-amber-500",
    "text-black"
  );

  if (landingView && !landingView.classList.contains("hidden")) {
    landingView.classList.add("hidden");
    detailView?.classList.remove("hidden");
    globalWrap?.classList.add("hidden");
    discovery?.classList.add("hidden");

    history.pushState(
      "",
      document.title,
      window.location.pathname + window.location.search
    );
  }

  if (title) {
    title.innerText = query.trim()
      ? "Search Results"
      : "All Subjects Vault";
  }

  filterResources();
}

/* ============================================================
   FILTER RESOURCES
   ============================================================ */

function getMaterialYear(item) {
  const text = `${item["Edition"] || ""} ${item["Book Name"] || ""} ${item["Scope"] || ""}`;
  const matches = text.match(/20\d{2}/g) || [];
  // Prefer the explicit Edition field when it contains a year.
  const edition = String(item["Edition"] || "").trim();
  if (/^20\d{2}$/.test(edition)) return edition;
  return matches.length ? matches[matches.length - 1] : "";
}

function populateYearFilter() {
  const select = document.getElementById("yearFilter");
  if (!select) return;
  const selected = select.value || "all";
  const years = [...new Set(allResources.map(getMaterialYear).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));
  select.innerHTML = '<option value="all">All Years</option>' +
    years.map(year => `<option value="${year}">${year}</option>`).join("");
  select.value = years.includes(selected) ? selected : "all";
}

function getMaterialPublisher(item) {
  return String(item?.["Publisher/Company"] || item?.["Publisher"] || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePublisherValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function populatePublisherFilter() {
  const select = document.getElementById("publisherFilter");
  if (!select) return;
  const selected = normalizePublisherValue(currentPublisher || select.value || "all") || "all";
  const publishers = new Map();
  allResources.forEach(item => {
    const label = getMaterialPublisher(item);
    const key = normalizePublisherValue(label);
    if (!key) return;
    const existing = publishers.get(key);
    if (existing) existing.count += 1;
    else publishers.set(key, { label, count: 1 });
  });
  select.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All publishers";
  select.append(allOption);
  [...publishers.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label, undefined, { sensitivity: "base" }))
    .forEach(([key, publisher]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = publisher.label + " (" + publisher.count.toLocaleString() + ")";
      select.append(option);
    });
  currentPublisher = publishers.has(selected) ? selected : "all";
  select.value = currentPublisher;
}

// Recognised subjects include the existing website labels and common sheet aliases.
const knownSubjectNames = new Set([
  ...subjectsList.filter(subject => subject !== "All").map(subject =>
    String(subject).toLowerCase().trim().replace(/\s+/g, " ")
  ),
  "second language - tamil", "second language - malayalam",
  "second language - kannada", "second language - hindi", "second language - telugu",
  "second language: telugu",
  "second language (tamil)", "second language (malayalam)",
  "second language (kannada)", "second language (hindi)", "second language (telugu)",
  "tamil", "malayalam", "kannada", "hindi", "telugu",
  "english paper 1", "english paper 2", "paper 1 - english", "paper 2 - english"
]);

function isKnownSubjectEntry(value) {
  const entry = String(value || "").toLowerCase().trim().replace(/\s+/g, " ");
  return knownSubjectNames.has(entry);
}

function filterResources() {
  if (document.getElementById("yearFilter") && document.getElementById("yearFilter").options.length <= 1 && allResources.length) {
    populateYearFilter();
  }
  if (document.getElementById("publisherFilter") && document.getElementById("publisherFilter").options.length <= 1 && allResources.length) {
    populatePublisherFilter();
  }
  const searchVal = (
    document.getElementById("searchInput")?.value || ""
  ).toLowerCase().trim();

  // Read local browser preferences once, never thousands of times per filter.
  const selectedYear = document.getElementById("yearFilter")?.value || "all";
  const selectedPublisher = normalizePublisherValue(document.getElementById("publisherFilter")?.value || currentPublisher || "all") || "all";
  const personalKeySet = currentPersonalView === "saved"
    ? new Set(readPersonalList(SAVED_MATERIALS_KEY))
    : currentPersonalView === "recent"
      ? new Set(readPersonalList(RECENT_MATERIALS_KEY))
      : null;

  filteredResources = allResources.filter(item => {
    const itemSubject =
      (item["Subject"] || "").toLowerCase().trim();

    const itemCategory =
      (item["Category"] || "").toLowerCase().trim();

    const publisher = (
      item["Publisher/Company"] || item["Publisher"] || ""
    ).toLowerCase().trim();

    let subMatch = false;

    if (currentSubject === "All") {
      subMatch = true;
    } else {
      const target = currentSubject.toLowerCase().trim().replace(/\s+/g, " ");
      // Sheet subjects are comma-separated. Match complete subject names only;
      // substring checks such as "pe", "lit", and "lang" caused cross-subject leaks.
      const entries = itemSubject.split(/[,;|\n]+/).map(value => value.trim().replace(/\s+/g, " ")).filter(Boolean);
      const has = (...names) => entries.some(entry => names.includes(entry));

      if (target === "other subjects") {
        subMatch = entries.some(entry => !isKnownSubjectEntry(entry));
      } else if (target === "physical education") {
        subMatch = has("physical education", "physical eduaction");
      } else if (target === "home science") {
        subMatch = has("home science", "homescience");
      } else if (target.startsWith("second language - ") || target.startsWith("second language: ")) {
        const language = target.replace(/^second language\s*[-:]\s*/, "");
        subMatch = has(language, `second language (${language})`, `second language - ${language}`);
      } else if (target === "english language") {
        subMatch = has("english language", "english paper 1", "paper 1 - english");
      } else if (target === "english literature") {
        subMatch = has("english literature", "english paper 2", "paper 2 - english");
      } else if (target === "environmental applications") {
        subMatch = has("environmental applications", "environmental application");
      } else if (target === "environmental science") {
        subMatch = has("environmental science");
      } else if (target === "commercial applications") {
        subMatch = has("commercial applications", "commercial application");
      } else if (target === "commercial studies") {
        subMatch = has("commercial studies", "commercial study");
      } else if (target === "economic applications") {
        subMatch = has("economic applications", "economic application");
      } else {
        subMatch = has(target);
      }
    }
  
let catMatch = false;

if (currentCategory === "All") {
  catMatch = true;

} else if (currentCategory === "Latest Materials") {
  const edition = String(item["Edition"] || "").trim();
  const scope = String(item["Scope"] || "").toLowerCase();
  const title = String(item["Book Name"] || "").toLowerCase();

  catMatch =
    edition === "2027" ||
    scope.includes("2027") ||
    title.includes("2027");

} else if (currentCategory === "PYQ" || currentCategory === "PYQs / Specimen Papers") {
  const title = String(item["Book Name"] || "").toLowerCase();
  const scope = String(item["Scope"] || "").toLowerCase();
  catMatch = itemCategory.includes("pyq") || itemCategory.includes("previous year") || itemCategory.includes("specimen") || itemCategory.includes("sample paper") || title.includes("specimen paper") || title.includes("previous year") || title.includes("board question paper") || title.includes("board paper") || scope.includes("previous year");

} else if (currentCategory === "Special Notes") {
  catMatch =
    publisher.includes("icse masterclass") ||
    publisher.includes("wiseplex");

} else if (currentCategory === "Official CISCE Materials") {
  catMatch = publisher.includes("cisce");

} else {
  catMatch = itemCategory.includes(
    currentCategory.toLowerCase()
  );
}


    // Search across more fields than just book name and subject.
    const srchMatch = !searchVal || materialSearchText(item).includes(searchVal);
    const yearMatch = selectedYear === "all" || getMaterialYear(item) === selectedYear;
    const itemPublisher = normalizePublisherValue(getMaterialPublisher(item));
    const publisherMatch = selectedPublisher === "all" || itemPublisher === selectedPublisher;
    const personalMatch = !personalKeySet || personalKeySet.has(getMaterialKey(item));

    return subMatch && catMatch && srchMatch && yearMatch && publisherMatch && personalMatch;
  });

  if (currentPersonalView === "recent") {
    const recentOrder = readPersonalList(RECENT_MATERIALS_KEY);
    filteredResources.sort((a, b) => recentOrder.indexOf(getMaterialKey(a)) - recentOrder.indexOf(getMaterialKey(b)));
  } else if (currentCategory === "PYQ" || currentCategory === "PYQs / Specimen Papers") {
    filteredResources.sort((a, b) => {
      const yearOf = item => { const text = `${item["Edition"] || ""} ${item["Book Name"] || ""} ${item["Scope"] || ""}`; const matches = text.match(/20(?:2[2-7])/g) || []; return matches.length ? Math.max(...matches.map(Number)) : 0; };
      return yearOf(b) - yearOf(a);
    });
  }
  visibleResourceCount = RESOURCE_PAGE_SIZE;
  renderGrid(filteredResources);
}

/* ============================================================
   CATEGORY FILTER TABS
   ============================================================ */

function setPublisherFilter(value) {
  currentPublisher = normalizePublisherValue(value) || "all";
  currentPersonalView = "all";
  updatePersonalLibraryUI();
  filterResources();
}

function setCategoryFilter(category, event) {
  currentPersonalView = "all"; updatePersonalLibraryUI();
  currentCategory = category;

  document.querySelectorAll(".cat-btn").forEach(button => {
    button.classList.remove(
      "active-tab",
      "bg-amber-500",
      "text-black"
    );
  });

  if (event && event.target) {
    const button = event.target.closest(".cat-btn") || event.target;

    button.classList.add(
      "active-tab",
      "bg-amber-500",
      "text-black"
    );
  }

  filterResources();
}

/* ============================================================
   RETURN HOME
   ============================================================ */

function closeSubjectSubPage() {
  document.body.classList.remove("shared-material-mode");

  const sharedPage = document.getElementById("sharedMaterialPage");

  if (sharedPage) {
    sharedPage.style.display = "none";
  }

  document.getElementById("subjectDetailView")
    ?.classList.add("hidden");

  document.getElementById("mainLandingView")
    ?.classList.remove("hidden");
  document.querySelector(".library-discovery")?.classList.remove("hidden");
  document.getElementById("globalSearchWrap")?.classList.remove("hidden");

  currentSubject = "All";

  history.pushState(
    "",
    document.title,
    window.location.pathname
  );
}

/* ============================================================
   MATERIAL DIRECTORY ROWS
   ============================================================ */

function renderGrid(data, appendFrom = 0) {
  const grid = document.getElementById("resourceGrid");
  const countEl = document.getElementById("itemCount");

  if (countEl) countEl.textContent = `${data.length.toLocaleString()} Materials Found`;
  if (!grid) return;

  const loadMoreWrap = document.getElementById("resourceLoadMoreWrap");
  const loadMoreCount = document.getElementById("resourceLoadMoreCount");
  const loadMoreButton = document.getElementById("resourceLoadMoreButton");
  const shown = Math.min(visibleResourceCount, data.length);
  if (loadMoreCount) loadMoreCount.textContent = `Showing ${shown.toLocaleString()} of ${data.length.toLocaleString()} matching materials`;
  if (loadMoreWrap) loadMoreWrap.hidden = shown >= data.length;
  if (loadMoreButton) loadMoreButton.disabled = shown >= data.length;

  if (data.length === 0) {
    grid.innerHTML = '<div class="mc-material-empty">No study materials matched your search or category filter.</div>';
    return;
  }

  // Render only the visible page; the source catalogue remains untouched.
  const first = appendFrom > 0 ? appendFrom : 0;
  const visible = data.slice(first, shown);
  const rowsHTML = visible.map((item, index) => {
    const rawDrive = item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || item["Link"] || "";
    const driveLink = normalizeExternalUrl(rawDrive);
    const rawLecture = item["Lecture Link"] || item["Telegram Channel Post Link"] || "";
    const lectureLink = normalizeExternalUrl(rawLecture);
    const latestEdLink = normalizeExternalUrl(item["Latest Edition Link"] || "", true);
    const latestEdLinkIsDistinct = Boolean(latestEdLink && latestEdLink !== driveLink);
    const latestStatus = item["Latest Edition Available?"] || "";
    const editionText = item["Edition"] && item["Edition"] !== "Not Specified" ? `Ed. ${item["Edition"]}` : "";
    const materialKey = getMaterialKey(item);
    const saved = isMaterialSaved(item);
    const title = item["Book Name"] || item["Subject"] || "";
    const subject = item["Subject"] || "";
    const category = item["Category"] || "";
    const publisher = item["Publisher/Company"] || item["Publisher"] || "";
    const fileSize = String(item["File Size"] || "").trim();
    const fileFormat = String(item["Format"] || "Resource").trim() || "Resource";
    let sourceBadge = "Link unavailable";
    try { sourceBadge = driveLink && new URL(driveLink).hostname.toLowerCase().endsWith("drive.google.com") ? "Direct Drive" : driveLink ? "External source" : "Link unavailable"; } catch (_) {}
    const openLabel = isVerifiedPdfResource(item, driveLink) ? "Open PDF" : "Open Resource";

    return `
      <article class="mc-material-row">
        <div class="mc-material-main">
          <div class="mc-material-meta">
            ${subject ? `<span class="mc-material-subject">${escapeHTML(subject)}</span>` : ""}
            ${category ? `<span class="mc-material-category">${escapeHTML(category)}</span>` : ""}
            ${editionText ? `<span class="mc-material-edition">${escapeHTML(editionText)}</span>` : ""}
            ${publisher ? `<span class="mc-material-publisher">${escapeHTML(publisher)}</span>` : ""}
          </div>
          <div class="mc-material-file-badges">
            <span class="mc-material-file-badge">${escapeHTML(fileFormat)}</span>
            ${fileSize ? `<span class="mc-material-size"><i class="fa-solid fa-file-arrow-down" aria-hidden="true"></i><span>File size: ${escapeHTML(fileSize)}</span></span>` : `<span class="mc-material-file-badge">Size not listed</span>`}
            <span class="mc-material-file-badge">${escapeHTML(sourceBadge)}</span>
          </div>
          <h3>${escapeHTML(title)}</h3>
          ${item["Scope"] ? `<p class="mc-material-scope">${escapeHTML(item["Scope"])}</p>` : ""}
          ${latestStatus ? `<p class="mc-material-latest">Latest edition: ${escapeHTML(latestStatus)} ${latestEdLinkIsDistinct ? `<a href="${escapeHTML(latestEdLink)}" target="_blank" rel="noopener noreferrer">View edition</a>` : ""}</p>` : ""}
        </div>
        <div class="mc-material-actions">
          <button type="button" onclick="openMaterialModalByIndex(${first + index})" aria-label="Preview ${escapeHTML(title)}" class="mc-material-action">
            <i class="fa-solid fa-eye" aria-hidden="true"></i><span>Preview</span>
          </button>
          ${driveLink ? `<a href="${escapeHTML(driveLink)}" target="_blank" rel="noopener noreferrer" class="mc-material-action mc-material-open"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>${openLabel}</span></a>` : `<span class="mc-material-action is-disabled" aria-disabled="true"><i class="fa-solid fa-link-slash" aria-hidden="true"></i><span>Unavailable</span></span>`}
          <button type="button" data-material-key="${escapeHTML(materialKey)}" aria-pressed="${saved}" aria-label="${saved ? "Remove saved material" : "Save material"}: ${escapeHTML(title)}" class="mc-material-action js-toggle-save ${saved ? "is-saved" : ""}">
            <i class="fa-${saved ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i><span>${saved ? "Saved" : "Save"}</span>
          </button>
          ${lectureLink ? `<a href="${escapeHTML(lectureLink)}" target="_blank" rel="noopener noreferrer" aria-label="Watch lecture for ${escapeHTML(title)}" class="mc-material-action"><i class="fa-brands fa-youtube" aria-hidden="true"></i><span>Video</span></a>` : ""}
          ${item["Share ID"] ? `<button type="button" data-share-id="${escapeHTML(item["Share ID"])}" class="mc-material-action js-open-share-page"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Share page</span></button><button type="button" data-share-id="${escapeHTML(item["Share ID"])}" class="mc-material-action js-share-material"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i><span>Share</span></button>` : ""}
        </div>
      </article>`;
  }).join("");

  if (first > 0) grid.insertAdjacentHTML("beforeend", rowsHTML);
  else grid.innerHTML = rowsHTML;

  // Event delegation keeps one set of handlers for the entire catalogue list.
  if (!grid.dataset.eventsDelegated) {
    grid.dataset.eventsDelegated = "true";
    grid.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (!target) return;
      const save = target.closest(".js-toggle-save");
      if (save && grid.contains(save)) { toggleSavedMaterial(save.dataset.materialKey); return; }
      const openShare = target.closest(".js-open-share-page");
      if (openShare && grid.contains(openShare)) { openSharePageById(openShare.dataset.shareId); return; }
      const share = target.closest(".js-share-material");
      if (share && grid.contains(share)) shareMaterialById(share.dataset.shareId);
    });
  }
}

/* ============================================================
   INDIVIDUAL MATERIAL SHARE LINKS
   ============================================================ */

const SITE_BASE_URL =
  "https://icse-cbse-10-12.github.io/icse-class-10-materials/";

function getMaterialShareUrl(shareId) {
  const url = new URL(SITE_BASE_URL);
  url.searchParams.set("material", shareId);
  return url.href;
}

function getMaterialResourceUrl(item) {
  const raw =
    item["Google Drive Link"] ||
    item["Google Drive Direct View / Download Link"] ||
    item["Link"] ||
    "";

  return normalizeExternalUrl(raw);
}

function openSharePageById(shareId) {
  if (!shareId) {
    alert("This material does not have a Share ID yet.");
    return;
  }

  window.location.href = getMaterialShareUrl(shareId);
}

/* ============================================================
   SHARE MATERIAL
   ============================================================ */

async function shareMaterialById(shareId) {
  const item = allResources.find(
    resource => resource["Share ID"] === shareId
  );

  if (!item || !shareId) {
    alert("This material does not have a valid Share ID.");
    return;
  }

  const shareUrl = getMaterialShareUrl(shareId);
  const title = item["Book Name"] || "ICSE Class 10 Study Material";
  const subject = item["Subject"] || "ICSE Class 10";

  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text: `${subject} — ${title} | ICSE MasterClass`,
        url: shareUrl
      });
    } else {
      await copyShareLink(shareUrl);
      alert("Short share link copied!");
    }
  } catch (error) {
    if (error && error.name !== "AbortError") {
      window.prompt("Copy this short share link:", shareUrl);
    }
  }
}

async function copyShareLink(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    window.prompt("Copy this link:", value);
  }
}

/* ============================================================
   SHARED MATERIAL PAGE
   ============================================================ */

function showSharedMaterialPage(shareId) {
  const page = document.getElementById("sharedMaterialPage");
  if (!page) return;

  const item = allResources.find(resource =>
    String(resource["Share ID"] || "").trim() ===
    String(shareId || "").trim()
  );

  document.body.classList.add("shared-material-mode");
  page.style.display = "block";

  const titleEl = document.getElementById("sharedMaterialTitle");
  const subjectEl = document.getElementById("sharedMaterialSubject");
  const descriptionEl =
    document.getElementById("sharedMaterialDescription");
  const openButton = document.getElementById("sharedMaterialOpen");
  const statusEl = document.getElementById("sharedMaterialStatus");
  const backLink = document.getElementById("sharedBackLink");
  const shareButton = document.getElementById("sharedMaterialShare");
  const copyButton = document.getElementById("sharedMaterialCopy");

  if (!item) {
    if (titleEl) titleEl.textContent = "Material Not Found";
    if (subjectEl) subjectEl.textContent = "ICSE MasterClass";

    if (descriptionEl) {
      descriptionEl.textContent =
        "This Share ID was not found in the current resource database. Please check the link or return to the main vault.";
    }

    if (openButton) {
      openButton.removeAttribute("href");
      openButton.tabIndex = -1;
      openButton.classList.add("opacity-50", "pointer-events-none");
      openButton.setAttribute("aria-disabled", "true");
    }

    if (statusEl) {
      statusEl.textContent = "Invalid or outdated Share ID.";
    }
  } else {
    const resourceUrl = getMaterialResourceUrl(item);

    if (titleEl) {
      titleEl.textContent = item["Book Name"] || "Study Material";
    }

    if (subjectEl) {
      subjectEl.textContent = item["Subject"] || "ICSE Class 10";
    }

    const details = [
      item["Scope"],
      item["Category"] ? `Category: ${item["Category"]}` : "",
      item["Publisher/Company"] || item["Publisher"]
        ? `Publisher: ${item["Publisher/Company"] || item["Publisher"]}`
        : "",
      item["Edition"] && item["Edition"] !== "Not Specified"
        ? `Edition: ${item["Edition"]}`
        : ""
    ].filter(Boolean);

    if (descriptionEl) {
      descriptionEl.textContent =
        details.join(" • ") ||
        "Open the resource using the button below, or share this short link with another student.";
    }

    if (openButton) {
      if (resourceUrl) {
        openButton.href = resourceUrl;
        openButton.removeAttribute("tabindex");
        openButton.classList.remove("opacity-50", "pointer-events-none");
        openButton.setAttribute("aria-disabled", "false");
      } else {
        openButton.removeAttribute("href");
        openButton.tabIndex = -1;
        openButton.classList.add("opacity-50", "pointer-events-none");
        openButton.setAttribute("aria-disabled", "true");
      }
    }

    if (statusEl) statusEl.textContent = "";
  }

  if (backLink) {
    backLink.onclick = event => {
      event.preventDefault();

      const url = new URL(SITE_BASE_URL);
      history.pushState({}, "", url.pathname);

      document.body.classList.remove("shared-material-mode");
      page.style.display = "none";

      document.getElementById("mainLandingView")
        ?.classList.remove("hidden");
      document.querySelector(".library-discovery")?.classList.remove("hidden");
      document.getElementById("globalSearchWrap")?.classList.remove("hidden");

      document.getElementById("subjectDetailView")
        ?.classList.add("hidden");

      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  }

  if (shareButton) {
    shareButton.onclick = () => shareMaterialById(shareId);
  }

  if (copyButton) {
    copyButton.onclick = async () => {
      await copyShareLink(getMaterialShareUrl(shareId));

      if (statusEl) {
        statusEl.textContent =
          "Short link copied! Share it with your friends.";
      }
    };
  }
}

/* ============================================================
   PREVIEW MODAL
   ============================================================ */

function openMaterialModalByIndex(index) {
  const item = filteredResources[index];
  if (!item) return;
  recordRecentMaterial(item); updatePersonalLibraryUI();

  const modalBadge = document.getElementById("modalSubjectBadge");
  const modalTitle = document.getElementById("modalTitle");
  const container = document.getElementById("detailContent");

  if (modalBadge) {
    modalBadge.innerText = item["Subject"] || "General";
  }

  if (modalTitle) {
    modalTitle.innerText = item["Book Name"] || "Material Document";
  }

  const rawDrive =
    item["Google Drive Link"] ||
    item["Google Drive Direct View / Download Link"] ||
    item["Link"] ||
    "";

  const driveLink = normalizeExternalUrl(rawDrive);

  const rawLecture =
    item["Lecture Link"] ||
    item["Telegram Channel Post Link"] ||
    "";

  const lectureLink = normalizeExternalUrl(rawLecture);

  const latestEdLink = normalizeExternalUrl(
    item["Latest Edition Link"] || "",
    true
  );
  const latestEdLinkIsDistinct = Boolean(latestEdLink && latestEdLink !== driveLink);

  let embedHtml = "";

  if (driveLink && new URL(driveLink).hostname === "drive.google.com") {
    const previewUrl = driveLink.replace(
      /\/view(\?.*)?$/,
      "/preview"
    );

    embedHtml = `
      <div class="w-full h-[55vh] sm:h-[62vh] rounded-lg overflow-hidden border border-gray-800 bg-black relative">
        <iframe
          src="${escapeHTML(previewUrl)}"
          title="Google Drive Document Preview"
          class="w-full h-full border-0"
          allow="autoplay"
          loading="lazy"
        ></iframe>
      </div>
    `;
  }
 else if (driveLink) {
    embedHtml = `
      <div class="rounded-lg border border-gray-800 bg-gray-950 p-5 text-sm text-gray-300">
        <p class="font-semibold text-gray-100">External resource</p>
        <p class="mt-2">This resource is hosted on an external website. Use Open Resource below to visit the original source. Availability and any sign-in or payment requirements are controlled by that website.</p>
      </div>
    `;
  }

  if (container) {
    container.innerHTML = `
      <div class="space-y-4">
        ${embedHtml}

        <div class="p-3.5 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <p>
            <strong class="text-amber-400">Publisher:</strong>
            ${escapeHTML(item["Publisher/Company"] || item["Publisher"] || "N/A")}
          </p>

          <p>
            <strong class="text-amber-400">Category:</strong>
            ${escapeHTML(item["Category"] || "N/A")}
          </p>

          <p>
            <strong class="text-amber-400">Edition:</strong>
            ${escapeHTML(item["Edition"] || "Not Specified")}
          </p>

          <p>
            <strong class="text-amber-400">Format:</strong>
            ${escapeHTML(item["Format"] || "PDF")}
          </p>

          <p class="col-span-full">
            <strong class="text-amber-400">Scope:</strong>
            ${escapeHTML(item["Scope"] || "N/A")}
          </p>

          ${
            item["Latest Edition Available?"]
              ? `
                <p class="col-span-full pt-1 border-t border-gray-800/80">
                  <strong class="text-amber-400">Latest Edition Status:</strong>
                  ${escapeHTML(item["Latest Edition Available?"])}

                  ${
                    latestEdLinkIsDistinct
                      ? `
                        <a
                          href="${escapeHTML(latestEdLink)}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="ml-2 text-amber-400 underline font-bold"
                        >
                          <i class="fa-solid fa-arrow-up-right-from-square text-xs" aria-hidden="true"></i>
                          View Latest Edition
                        </a>
                      `
                      : ""
                  }
                </p>
              `
              : ""
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          ${driveLink ? `
            <a href="${escapeHTML(driveLink)}" target="_blank" rel="noopener noreferrer"
              class="py-2.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs text-center transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open Resource
            </a>` : `
            <span class="py-2.5 rounded-lg bg-gray-800 text-gray-500 font-bold text-xs text-center flex items-center justify-center gap-2" aria-disabled="true">
              <i class="fa-solid fa-link-slash" aria-hidden="true"></i> Link unavailable
            </span>`}

          ${
            lectureLink
              ? `
                <a
                  href="${escapeHTML(lectureLink)}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="py-2.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white font-bold text-xs text-center transition flex items-center justify-center gap-2"
                >
                  <i class="fa-brands fa-youtube text-sm" aria-hidden="true"></i>
                  Watch Video Lecture
                </a>
              `
              : `
                <a
                  href="https://t.me/ICSEMasterClass10"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="py-2.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500 hover:text-white font-bold text-xs text-center transition flex items-center justify-center gap-2"
                >
                  <i class="fa-brands fa-telegram" aria-hidden="true"></i>
                  Telegram Discussion
                </a>
              `
          }
        </div>
      </div>
    `;
  }

  document.getElementById("detailView")?.classList.remove("hidden");
}

function closeMaterialModal() {
  document.getElementById("detailView")?.classList.add("hidden");
}

/* ============================================================
   PERSONALISATION SETTINGS
   ============================================================ */
const siteSettingsDefaults = { mode: "light", accent: "emerald", fontSize: "100" };
function readSiteSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("icseMasterclassSiteSettings") || "{}");
    const mode = ["dark", "light", "midnight"].includes(saved.mode) ? saved.mode : siteSettingsDefaults.mode;
    const accent = ["amber", "blue", "emerald", "violet", "rose"].includes(saved.accent) ? saved.accent : siteSettingsDefaults.accent;
    const parsedSize = Number(saved.fontSize);
    const fontSize = Number.isFinite(parsedSize) ? String(Math.max(90, Math.min(115, Math.round(parsedSize / 5) * 5))) : siteSettingsDefaults.fontSize;
    return { mode, accent, fontSize };
  } catch (_) {
    return { ...siteSettingsDefaults };
  }
}
function saveSiteSettings(settings) {
  try { localStorage.setItem("icseMasterclassSiteSettings", JSON.stringify(settings)); } catch (_) {}
}
function applySiteSettings() {
  const settings = readSiteSettings();
  document.body.dataset.siteMode = settings.mode;
  document.body.dataset.siteAccent = settings.accent;
  document.documentElement.style.fontSize = `${settings.fontSize}%`;
  const range = document.getElementById("fontSizeControl");
  const label = document.getElementById("fontSizeLabel");
  if (range) range.value = settings.fontSize;
  if (label) label.textContent = `${settings.fontSize}%`;
  document.querySelectorAll("[data-mode]").forEach(el => el.classList.toggle("active", el.dataset.mode === settings.mode));
  document.querySelectorAll("[data-accent]").forEach(el => el.classList.toggle("active", el.dataset.accent === settings.accent));
}
function setSiteMode(mode, origin) {
  const settings = readSiteSettings();
  settings.mode = ["dark", "light", "midnight"].includes(mode) ? mode : "dark";
  saveSiteSettings(settings);
  const nextInkTheme = settings.mode === "light" ? "light" : "dark";
  const inkTheme = window.icseInkTheme;
  if (inkTheme && inkTheme.get() !== nextInkTheme) {
    void inkTheme.set(nextInkTheme, origin || document.querySelector('[data-mode="' + settings.mode + '"]'));
    return;
  }
  applySiteSettings();
}
function setSiteAccent(accent) {
  const settings = readSiteSettings(); settings.accent = ["amber", "blue", "emerald", "violet", "rose"].includes(accent) ? accent : "amber";
  saveSiteSettings(settings); applySiteSettings();
}
function setSiteFontSize(size) {
  const settings = readSiteSettings(); settings.fontSize = String(Math.min(115, Math.max(90, Number(size) || 100)));
  saveSiteSettings(settings); applySiteSettings();
}
function resetSiteSettings() {
  saveSiteSettings({ ...siteSettingsDefaults }); applySiteSettings();
}
function toggleSettings(open) {
  const overlay = document.getElementById("settingsOverlay"); if (!overlay) return;
  overlay.classList.toggle("hidden", !open);
  document.body.style.overflow = open ? "hidden" : "";
  if (open) document.getElementById("settingsTitle")?.focus();
}
document.addEventListener("keydown", event => { if (event.key === "Escape") toggleSettings(false); });

/* ============================================================
   NAVIGATION EVENTS AND APP STARTUP
   ============================================================ */

window.addEventListener("hashchange", checkHashRoute);
window.addEventListener("popstate", checkHashRoute);

const startApp = () => {
  applySiteSettings();
  updatePersonalLibraryUI();
  initSubjectCards();
  fetchSheetData();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}


/* GLOBAL SLIDE-OUT NAVIGATION */
function toggleSiteNav(open) {
  const overlay = document.getElementById("siteNavOverlay");
  const toggle = document.getElementById("siteNavToggle");
  const panel = document.getElementById("siteNavPanel");
  if (!overlay || !toggle || !panel) return;
  const shouldOpen = Boolean(open);
  overlay.hidden = !shouldOpen;
  overlay.setAttribute("aria-hidden", String(!shouldOpen));
  toggle.setAttribute("aria-expanded", String(shouldOpen));
  toggle.setAttribute("aria-label", shouldOpen ? "Close navigation menu" : "Open navigation menu");
  document.body.classList.toggle("site-nav-open", shouldOpen);
  if (shouldOpen) {
    panel.focus();
    const firstLink = panel.querySelector("a, button");
    if (firstLink) firstLink.focus({ preventScroll: true });
  } else {
    toggle.focus({ preventScroll: true });
  }
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !document.getElementById("siteNavOverlay")?.hidden) toggleSiteNav(false);
});


/* Make global search discoverable from the navigation menu. */
function showGlobalSearch() {
  const wrap = document.getElementById("globalSearchWrap");
  const input = document.getElementById("globalSearchInput");
  const landingView = document.getElementById("mainLandingView");
  const detailView = document.getElementById("subjectDetailView");
  const discovery = document.querySelector(".library-discovery");
  if (!wrap || !input) return;
  // Return to the all-materials landing view so the global search is not hidden by subject navigation.
  if (wrap.classList.contains("hidden")) {
    currentSubject = "All";
    discovery?.classList.remove("hidden");
    wrap.classList.remove("hidden");
    landingView?.classList.remove("hidden");
    detailView?.classList.add("hidden");
    if (typeof initSubjectCards === "function") initSubjectCards();
  }
  window.setTimeout(() => {
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }, 80);
}


/* Copy the published support address with an accessible confirmation and fallback. */
(() => {
  const button = document.getElementById("copyEmailBtn");
  const emailLink = document.getElementById("emailText");
  const status = document.getElementById("copyEmailStatus");
  if (!button || !emailLink || !status) return;

  const copyTextFallback = text => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
    field.remove();
    return copied;
  };

  button.addEventListener("click", async () => {
    const email = emailLink.textContent.trim();
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
        copied = true;
      } else {
        copied = copyTextFallback(email);
      }
    } catch (_) {
      copied = copyTextFallback(email);
    }

    if (copied) {
      button.textContent = "✓ Copied!";
      button.classList.add("success");
      status.textContent = "Email address copied.";
      window.setTimeout(() => {
        button.textContent = "Copy Address";
        button.classList.remove("success");
      }, 2000);
    } else {
      status.textContent = "Copy unavailable. Select the email address to copy it manually.";
    }
  });
})();
