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
  "Other Subjects"
];

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
  "Notes": "fa-note-sticky",
  "Other Subjects": "fa-folder-open"
};

let currentSubject = "All";
let currentCategory = "All";
let allResources = [];
let filteredResources = [];
let deferredPwaPrompt = null;

/* ============================================================
   URL VALIDATION
   ============================================================ */

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
    !url.hostname.includes(".")
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
    const icon = subjectIcons[subject] || "fa-book";

    return `
      <button
        onclick="selectSubject('${subject}')"
        class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/50 hover:bg-gray-900/80 transition flex flex-col items-center justify-center gap-2 text-center group cursor-pointer"
        type="button"
        aria-label="Open ${subject} subject materials"
      >
        <div
          class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition"
          aria-hidden="true"
        >
          <i class="fa-solid ${icon} text-base" aria-hidden="true"></i>
        </div>

        <span class="text-xs font-bold text-gray-200 group-hover:text-white">
          ${subject}
        </span>
      </button>
    `;
  }).join("");
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
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(line => line.trim() !== "");

  if (lines.length < 2) return [];

  function splitRow(row) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"' && row[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  const headers = splitRow(lines[0]).map(
    header => header.replace(/^"|"$/g, "").trim()
  );

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitRow(lines[i]);
    const item = {};

    headers.forEach((header, index) => {
      item[header] = (row[index] || "")
        .replace(/^"|"$/g, "")
        .trim();
    });

    if (item["Book Name"] || item["Subject"]) {
      data.push(item);
    }
  }

  return data;
}

/* ============================================================
   SELECT SUBJECT
   ============================================================ */

function selectSubject(subjectName, updateHash = true) {
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
  const globalInput = document.getElementById("globalSearchInput");
  const detailInput = document.getElementById("searchInput");
  const landingView = document.getElementById("mainLandingView");
  const detailView = document.getElementById("subjectDetailView");
  const title = document.getElementById("selectedSubjectTitle");

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

function filterResources() {
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
      const target = currentSubject.toLowerCase().trim();

      if (target === "physical education") {
        subMatch =
          itemSubject.includes("physical education") ||
          itemSubject.includes("physical eduaction") ||
          itemSubject.includes("pe");
      } else if (target === "home science") {
        subMatch =
          itemSubject.includes("home science") ||
          itemSubject.includes("homescience");
      } else if (target === "second language - tamil") {
        subMatch = itemSubject.includes("tamil");
      } else if (target === "second language - malayalam") {
        subMatch = itemSubject.includes("malayalam");
      } else if (target === "second language - kannada") {
        subMatch = itemSubject.includes("kannada");
      } else if (target === "second language - hindi") {
        subMatch = itemSubject.includes("hindi");
      } else if (target === "english literature") {
        subMatch =
          itemSubject.includes("english literature") ||
          itemSubject.includes("lit");
      } else if (target === "english language") {
        subMatch =
          itemSubject.includes("english language") ||
          itemSubject.includes("lang");
      } else if (target === "environmental applications") {
        subMatch = itemSubject.includes("environmental applications");
      } else if (target === "environmental science") {
        subMatch = itemSubject.includes("environmental science");
      } else if (target === "commercial applications") {
        subMatch = itemSubject.includes("commercial app");
      } else if (target === "commercial studies") {
        subMatch = itemSubject.includes("commercial stud");
      } else if (target === "economic applications") {
        subMatch = itemSubject.includes("economic");
      } else {
        subMatch = itemSubject.includes(target);
      }
    }

    let catMatch = false;

    if (currentCategory === "All") {
      catMatch = true;
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

    return subMatch && catMatch && srchMatch;
  });

  renderGrid(filteredResources);
}

/* ============================================================
   CATEGORY FILTER TABS
   ============================================================ */

function setCategoryFilter(category, event) {
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

    return `
      <div class="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/40 transition flex flex-col justify-between gap-3 shadow-lg">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[10px] gap-2">
            <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold shrink-0">
              ${item["Category"] || "General"}
            </span>

            <div class="flex items-center gap-1 overflow-hidden truncate text-gray-400">
              ${
                editionText
                  ? `<span class="px-1.5 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-semibold">${editionText}</span>`
                  : ""
              }
              <span class="truncate">
                ${item["Publisher/Company"] || item["Publisher"] || item["Subject"] || ""}
              </span>
            </div>
          </div>

          <h3 class="font-bold text-sm text-white line-clamp-2 leading-snug">
            ${item["Book Name"] || "Resource File"}
          </h3>

          ${
            item["Scope"]
              ? `<p class="text-xs text-gray-400 line-clamp-2">${item["Scope"]}</p>`
              : ""
          }

          ${
            isLatestAvailable
              ? `
                <div class="pt-1 text-[11px]">
                  <span class="text-emerald-400 font-semibold">
                    <i class="fa-solid fa-circle-check text-[10px]" aria-hidden="true"></i>
                    Latest Edition: ${isLatestAvailable}
                  </span>
                  ${
                    latestEdLink
                      ? `<a href="${latestEdLink}" target="_blank" rel="noopener noreferrer" class="ml-1 text-amber-400 underline hover:text-amber-300 font-bold">(Get Book)</a>`
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
            aria-label="Preview ${item["Book Name"] || "material"}"
            type="button"
            class="py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs text-center transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i class="fa-solid fa-eye" aria-hidden="true"></i>
            Preview
          </button>

          <a
            href="${driveLink || "#"}"
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
                  href="${lectureLink}"
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
                  data-share-id="${item["Share ID"]}"
                  class="js-open-share-page py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs text-center transition"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                  Share Page
                </button>

                <button
                  type="button"
                  data-share-id="${item["Share ID"]}"
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

  if (driveLink && driveLink.includes("drive.google.com")) {
    const previewUrl = driveLink.replace(
      /\/view(\?.*)?$/,
      "/preview"
    );

    embedHtml = `
      <div class="w-full h-[55vh] sm:h-[62vh] rounded-lg overflow-hidden border border-gray-800 bg-black relative">
        <iframe
          src="${previewUrl}"
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
            ${item["Publisher/Company"] || item["Publisher"] || "N/A"}
          </p>

          <p>
            <strong class="text-amber-400">Category:</strong>
            ${item["Category"] || "N/A"}
          </p>

          <p>
            <strong class="text-amber-400">Edition:</strong>
            ${item["Edition"] || "Not Specified"}
          </p>

          <p>
            <strong class="text-amber-400">Format:</strong>
            ${item["Format"] || "PDF"}
          </p>

          <p class="col-span-full">
            <strong class="text-amber-400">Scope:</strong>
            ${item["Scope"] || "N/A"}
          </p>

          ${
            item["Latest Edition Available?"]
              ? `
                <p class="col-span-full pt-1 border-t border-gray-800/80">
                  <strong class="text-amber-400">Latest Edition Status:</strong>
                  ${item["Latest Edition Available?"]}

                  ${
                    latestEdLink
                      ? `
                        <a
                          href="${latestEdLink}"
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
            href="${driveLink || "#"}"
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
                  href="${lectureLink}"
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
   NAVIGATION EVENTS AND APP STARTUP
   ============================================================ */

window.addEventListener("hashchange", checkHashRoute);
window.addEventListener("popstate", checkHashRoute);

const startApp = () => {
  initSubjectCards();
  fetchSheetData();
  checkWelcomePopup();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
