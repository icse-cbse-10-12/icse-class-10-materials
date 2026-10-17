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

// Emoji fallback icons remain visible even when the Font Awesome CDN is blocked.
const subjectEmoji = {
  "All":"📚", "Physics":"⚛️", "Physical Education":"🏃", "Mathematics":"📐", "Home Science":"🏠",
  "History & Civics":"🏛️", "Geography":"🌍", "Environmental Applications":"🌿", "Environmental Science":"🌱",
  "English Literature":"📖", "English Language":"✍️", "Economic Applications":"📈", "Computer Applications":"💻",
  "Commercial Studies":"💼", "Commercial Applications":"🏢", "Chemistry":"🧪", "Biology":"🧬",
  "Second Language - Tamil":"🗣️", "Second Language - Malayalam":"🗣️", "Second Language - Kannada":"🗣️",
  "Second Language - Hindi":"🗣️", "Second Language: Telugu":"🗣️", "Other Subjects":"📁"
};

// Custom Icons Mapping
const subjectIcons = {
  "All": "fa-layer-group",
  "Physics": "fa-atom",
  "Physical Education": "fa-dumbbell",
  "Mathematics": "fa-calculator",
  "Home Science": "fa-house-user",
  "History & Civics": "fa-landmark",
  "Geography": "fa-earth-americas",
  "Environmental Applications": "fa-leaf",
  "Environmental Science": "fa-leaf",
  "English Literature": "fa-book-open",
  "English Language": "fa-pen-nib",
  "Economic Applications": "fa-chart-line",
  "Computer Applications": "fa-code",
  "Commercial Studies": "fa-briefcase",
  "Commercial Applications": "fa-building-columns",
  "Chemistry": "fa-flask",
  "Biology": "fa-dna",
  "Second Language - Tamil": "fa-language",
  "Second Language - Malayalam": "fa-language",
  "Second Language - Kannada": "fa-language",
  "Second Language - Hindi": "fa-language",
  "Second Language: Telugu": "fa-language",
  "Notes": "fa-note-sticky",
  "Other Subjects": "fa-folder-open",
  "English": "fa-book-open",
  "Economics": "fa-chart-pie",
  "Accounts": "fa-calculator",
  "Art": "fa-palette",
  "Sanskrit": "fa-language",
};

let currentSubject = "All";
let currentCategory = "All";
let allResources = [];
let filteredResources = [];
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

function initSubjectCards() {
  const grid = document.getElementById("mainSubjectGrid");
  if (!grid) return;

  grid.innerHTML = subjectsList.map(subject => {
    return `
      <button
        data-subject="${escapeHTML(subject)}"
        class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/50 hover:bg-gray-900/80 transition flex flex-col items-center justify-center gap-2 text-center group cursor-pointer"
        type="button"
        aria-label="Open ${escapeHTML(subject)} subject materials"
      >
        <div class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition" aria-hidden="true">
          <span class="text-xl leading-none" aria-hidden="true">${escapeHTML(subjectEmoji[subject] || "📘")}</span>
        </div>
        <span class="text-xs font-bold text-gray-200 group-hover:text-white">${escapeHTML(subject)}</span>
      </button>`;
  }).join("");

  grid.querySelectorAll("button[data-subject]").forEach(button => {
    button.addEventListener("click", () => selectSubject(button.dataset.subject));
  });
}

/* ============================================================
   FETCH GOOGLE SHEETS DATA
   ============================================================ */

async function fetchSheetData() {
  const statusEl = document.getElementById("statusMessage");
  let csvText = "";

  try {
    const response = await fetch(primaryCsvUrl);

    if (!response.ok) {
      throw new Error("Primary CSV blocked");
    }

    csvText = await response.text();
  } catch (error) {
    console.warn(
      "Primary fetch failed, trying fallback proxy...",
      error
    );

    try {
      const fallbackResponse = await fetch(fallbackCsvUrl);

      if (!fallbackResponse.ok) {
        throw new Error("Fallback CSV blocked");
      }

      csvText = await fallbackResponse.text();
    } catch (fallbackError) {
      console.error("All CSV sources failed:", fallbackError);

      if (statusEl) {
        statusEl.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation text-red-400"
             aria-hidden="true"></i>
          <span class="text-red-400">
            Failed to load database. Please reload the page.
          </span>
        `;
      }

      return;
    }
  }

  allResources = parseCSV(csvText);

  if (statusEl) {
    statusEl.innerHTML = `
      <i class="fa-solid fa-circle-check text-emerald-400"
         aria-hidden="true"></i>
      <span>Loaded ${allResources.length} materials from database.</span>
    `;
  }

  checkHashRoute();
}

/* ============================================================
   LATEST MATERIALS — 2027 RESOURCES
   ============================================================ */

function renderLatestMaterials() {
  const grid = document.getElementById("latestMaterialsGrid");
  const count = document.getElementById("latestMaterialsCount");
  if (!grid) return;

  const latest = allResources.filter(item => {
    const edition = String(item["Edition"] || "").trim();
    const scope = String(item["Scope"] || "").toLowerCase();
    const title = String(item["Book Name"] || "").toLowerCase();
    const itemSubject = String(item["Subject"] || "").trim().toLowerCase();
    const targetSubject = String(currentSubject || "All").trim().toLowerCase();
    const subjectMatches = targetSubject === "all" || itemSubject === targetSubject;
    return subjectMatches && (edition === "2027" || scope.includes("2027") || title.includes("2027"));
  });

  const unique = [];
  const seen = new Set();
  latest.forEach(item => {
    const title = String(item["Book Name"] || "Untitled material").trim();
    const link = normalizeExternalUrl(item["Google Drive Link"] || item["Latest Edition Link"]);
    const key = `${title.toLowerCase()}|${link}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ item, title, link });
    }
  });

  // Show newer question banks and reference documents before repeated syllabus entries.
  unique.sort((a, b) => {
    const score = entry => {
      const text = `${entry.title} ${entry.item["Category"] || ""} ${entry.item["Scope"] || ""}`.toLowerCase();
      let value = 0;
      if (text.includes("question bank")) value -= 5;
      if (text.includes("competency")) value -= 4;
      if (text.includes("sample paper") || text.includes("specimen")) value -= 3;
      if (text.includes("official syllabus")) value += 3;
      return value;
    };
    return score(a) - score(b) || a.title.localeCompare(b.title);
  });

  if (count) count.textContent = `${unique.length} resource${unique.length === 1 ? "" : "s"} tagged 2027`;

  if (!unique.length) {
    grid.innerHTML = '<div class="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 text-sm text-gray-400">No 2027 resources are tagged in the database yet. Add them to Google Sheets with Edition set to 2027.</div>';
    return;
  }

  grid.innerHTML = unique.map(({ item, title, link }) => {
    const subject = item["Subject"] || "Study Material";
    const category = item["Category"] || "Resource";
    const publisher = item["Publisher/Company"] || "ICSE MasterClass resource vault";
    const hasLink = Boolean(link);
    return `
      <article class="group rounded-2xl border border-gray-800 bg-gray-900/70 p-4 sm:p-5 hover:border-amber-500/50 hover:bg-gray-900 transition flex flex-col min-h-[190px]">
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-300"><i class="fa-regular fa-calendar-check"></i> 2027</span>
          <span class="text-[10px] text-gray-500 truncate">${escapeHTML(subject)}</span>
        </div>
        <h3 class="text-sm font-extrabold leading-snug text-white group-hover:text-amber-300 transition">${escapeHTML(title)}</h3>
        <p class="text-xs text-gray-400 mt-2">${escapeHTML(category)} · ${escapeHTML(publisher)}</p>
        <div class="mt-auto pt-4">
          ${hasLink ? `<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold text-xs px-4 py-3 transition"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Material</a>` : '<span class="block rounded-xl border border-gray-700 px-4 py-3 text-center text-xs text-gray-500">Link not available yet</span>'}
        </div>
      </article>`;
  }).join("");
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
  if (subjectName === "All") globalWrap?.classList.remove("hidden");
  else globalWrap?.classList.add("hidden");
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

// Recognised subjects include the existing website labels and common sheet aliases.
const knownSubjectNames = new Set([
  ...subjectsList.filter(subject => subject !== "All").map(subject =>
    String(subject).toLowerCase().trim().replace(/\\s+/g, " ")
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
  const entry = String(value || "").toLowerCase().trim().replace(/\\s+/g, " ");
  return knownSubjectNames.has(entry);
}

function filterResources() {
  if (document.getElementById("yearFilter") && document.getElementById("yearFilter").options.length <= 1 && allResources.length) {
    populateYearFilter();
  }
  const searchVal = (
    document.getElementById("searchInput")?.value || ""
  ).toLowerCase().trim();

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
    const searchableText = [
      item["Book Name"],
      item["Subject"],
      item["Publisher/Company"],
      item["Publisher"],
      item["Category"],
      item["Scope"],
      item["Edition"],
      item["Format"]
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const srchMatch =
      !searchVal || searchableText.includes(searchVal);
    const selectedYear = document.getElementById("yearFilter")?.value || "all";
    const yearMatch = selectedYear === "all" || getMaterialYear(item) === selectedYear;
    const materialKey = getMaterialKey(item);
    const personalKeys = currentPersonalView === "saved" ? readPersonalList(SAVED_MATERIALS_KEY) : currentPersonalView === "recent" ? readPersonalList(RECENT_MATERIALS_KEY) : null;
    const personalMatch = currentPersonalView === "all" || personalKeys.includes(materialKey);

    return subMatch && catMatch && srchMatch && yearMatch && personalMatch;
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
  renderGrid(filteredResources);
}

/* ============================================================
   CATEGORY FILTER TABS
   ============================================================ */

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

  currentSubject = "All";

  history.pushState(
    "",
    document.title,
    window.location.pathname
  );
}

/* ============================================================
   RESOURCE CARDS
   ============================================================ */

function renderGrid(data) {
  const grid = document.getElementById("resourceGrid");
  const countEl = document.getElementById("itemCount");

  if (countEl) {
    countEl.innerText = `${data.length} Materials Found`;
  }

  if (!grid) return;

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500 text-xs">
        No study materials matched your search or category filter.
      </div>
    `;
    return;
  }

  grid.innerHTML = data.map((item, index) => {
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

    const rawLatestEdLink = item["Latest Edition Link"] || "";

    const latestEdLink = normalizeExternalUrl(
      rawLatestEdLink,
      true
    );

    const isLatestAvailable =
      item["Latest Edition Available?"] || "";

    const editionText =
      item["Edition"] && item["Edition"] !== "Not Specified"
        ? `Ed: ${item["Edition"]}`
        : "";
    const materialKey = getMaterialKey(item);
    const saved = isMaterialSaved(item);

    return `
      <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/40 transition flex flex-col justify-between gap-3 shadow-lg">
        <div class="flex justify-end -mb-1">
          <button type="button" data-material-key="${escapeHTML(materialKey)}" aria-pressed="${saved}" class="js-toggle-save personal-save-btn ${saved ? "is-saved" : ""}">
            <i class="fa-${saved ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i>
            ${saved ? "Saved" : "Save"}
          </button>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[10px] gap-2">
            <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold shrink-0">
              ${escapeHTML(item["Category"] || "General")}
            </span>

            <div class="flex items-center gap-1 overflow-hidden truncate text-gray-400">
              ${
                editionText
                  ? `<span class="px-1.5 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-semibold">${escapeHTML(editionText)}</span>`
                  : ""
              }
              <span class="truncate">
                ${escapeHTML(item["Publisher/Company"] || item["Publisher"] || item["Subject"] || "")}
              </span>
            </div>
          </div>

          <h3 class="font-bold text-sm text-white line-clamp-2 leading-snug">
            ${escapeHTML(item["Book Name"] || "Resource File")}
          </h3>

          ${
            item["Scope"]
              ? `<p class="text-xs text-gray-400 line-clamp-2">${escapeHTML(item["Scope"])}</p>`
              : ""
          }

          ${
            isLatestAvailable
              ? `
                <div class="pt-1 text-[11px]">
                  <span class="text-emerald-400 font-semibold">
                    <i class="fa-solid fa-circle-check text-[10px]" aria-hidden="true"></i>
                    Latest Edition: ${escapeHTML(isLatestAvailable)}
                  </span>
                  ${
                    latestEdLink
                      ? `<a href="${escapeHTML(latestEdLink)}" target="_blank" rel="noopener noreferrer" class="ml-1 text-amber-400 underline hover:text-amber-300 font-bold">(Get Book)</a>`
                      : ""
                  }
                </div>
              `
              : ""
          }
        </div>

        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
          <button
            onclick="openMaterialModalByIndex(${index})"
            aria-label="Preview ${escapeHTML(item["Book Name"] || "material")}"
            type="button"
            class="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs text-center transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i class="fa-solid fa-eye" aria-hidden="true"></i>
            Preview
          </button>

          <a
            href="${escapeHTML(driveLink || "#")}"
            ${
              driveLink
                ? 'target="_blank" rel="noopener noreferrer"'
                : 'aria-disabled="true" tabindex="-1"'
            }
            class="py-2 rounded-lg ${
              driveLink
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            } font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
          >
            <i class="fa-solid fa-download" aria-hidden="true"></i>
            ${driveLink ? "Material" : "Link unavailable"}
          </a>

          ${
            lectureLink
              ? `
                <a
                  href="${escapeHTML(lectureLink)}"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Watch lecture video"
                  class="col-span-2 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
                >
                  <i class="fa-brands fa-youtube text-sm" aria-hidden="true"></i>
                  Watch Lecture
                </a>
              `
              : ""
          }
        </div>

        ${
          item["Share ID"]
            ? `
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-share-id="${escapeHTML(item["Share ID"])}"
                  class="js-open-share-page py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs text-center transition"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                  Share Page
                </button>

                <button
                  type="button"
                  data-share-id="${escapeHTML(item["Share ID"])}"
                  class="js-share-material py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs text-center transition"
                >
                  <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
                  Share
                </button>
              </div>
            `
            : ""
        }
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".js-toggle-save").forEach(button => {
    button.addEventListener("click", () => toggleSavedMaterial(button.dataset.materialKey));
  });

  grid.querySelectorAll(".js-open-share-page").forEach(button => {
    button.addEventListener("click", () => {
      openSharePageById(button.dataset.shareId);
    });
  });

  grid.querySelectorAll(".js-share-material").forEach(button => {
    button.addEventListener("click", () => {
      shareMaterialById(button.dataset.shareId);
    });
  });
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
      openButton.href = "#";
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
        openButton.classList.remove(
          "opacity-50",
          "pointer-events-none"
        );
        openButton.setAttribute("aria-disabled", "false");
      } else {
        openButton.href = "#";
        openButton.classList.add(
          "opacity-50",
          "pointer-events-none"
        );
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
                    latestEdLink
                      ? `
                        <a
                          href="${escapeHTML(latestEdLink)}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="ml-2 text-amber-400 underline font-bold"
                        >
                          <i class="fa-solid fa-cart-shopping text-xs" aria-hidden="true"></i>
                          Get Latest Edition Book
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
          <a
            href="${escapeHTML(driveLink || "#")}"
            ${
              driveLink
                ? 'target="_blank" rel="noopener noreferrer"'
                : 'aria-disabled="true" tabindex="-1"'
            }
            class="py-2.5 rounded-lg ${
              driveLink
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-gray-800 text-gray-500 pointer-events-none"
            } font-bold text-xs text-center transition flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            ${driveLink ? "Open Drive Link" : "Link unavailable"}
          </a>

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
   WELCOME POPUP
   ============================================================ */

function checkWelcomePopup() {
  let hasSeenPopup = false;

  try {
    hasSeenPopup = localStorage.getItem(
      "hasSeenMasterclassWelcome"
    ) === "true";
  } catch (error) {
    console.warn("Local storage is unavailable.", error);
  }

  if (!hasSeenPopup) {
    setTimeout(() => {
      document.getElementById("welcomePopup")
        ?.classList.remove("hidden");
    }, 1200);
  }
}

function closeWelcomePopup() {
  document.getElementById("welcomePopup")
    ?.classList.add("hidden");

  try {
    localStorage.setItem("hasSeenMasterclassWelcome", "true");
  } catch (error) {
    console.warn("Could not save popup preference.", error);
  }
}

/* ============================================================
   PERSONALISATION SETTINGS
   ============================================================ */
const siteSettingsDefaults = { mode: "dark", accent: "amber", fontSize: "100" };
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
function setSiteMode(mode) {
  const settings = readSiteSettings(); settings.mode = ["dark", "light", "midnight"].includes(mode) ? mode : "dark";
  saveSiteSettings(settings); applySiteSettings();
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
  checkWelcomePopup();
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
  if (!wrap || !input) return;
  // Return to the all-materials landing view so the global search is not hidden by subject navigation.
  if (wrap.classList.contains("hidden")) {
    currentSubject = "All";
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
