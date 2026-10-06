// Configuration & Data Source
const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLGKfaC9WUePvCArs7YAxYP9tmoPYkCdfJviR2pdOnlSZ6gVLEqgtAEga4XLQpubVTfEsHo2eWBWx7/pub?output=csv';

let allResources = [];
let currentFilteredItems = [];
let currentSubject = '';
let currentCategory = 'All';

// Subject Grid Config with Distinct Minimalist Icons
const subjectsConfig = [
  { name: "Physics", icon: "fa-atom", color: "border-blue-500/30 text-blue-400" },
  { name: "Chemistry", icon: "fa-flask", color: "border-amber-500/30 text-amber-400" },
  { name: "Mathematics", icon: "fa-calculator", color: "border-purple-500/30 text-purple-400" },
  { name: "Biology", icon: "fa-dna", color: "border-emerald-500/30 text-emerald-400" },
  { name: "English Paper 1", icon: "fa-pen-nib", color: "border-rose-500/30 text-rose-400" },
  { name: "English Paper 2", icon: "fa-book-open", color: "border-pink-500/30 text-pink-400" },
  { name: "History & Civics", icon: "fa-landmark", color: "border-orange-500/30 text-orange-400" },
  { name: "Geography", icon: "fa-earth-americas", color: "border-teal-500/30 text-teal-400" },
  { name: "Computer Applications", icon: "fa-code", color: "border-cyan-500/30 text-cyan-400" },
  { name: "Physical Education", icon: "fa-running", color: "border-red-500/30 text-red-400" },
  { name: "Commercial Studies", icon: "fa-briefcase", color: "border-slate-500/30 text-slate-400" },
  { name: "Second Language (Hindi)", icon: "fa-language", color: "border-fuchsia-500/30 text-fuchsia-400" }
];

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
  renderMainSubjectGrid();
  fetchSheetData();
});

// 1. Render Mobile-First Bento Grid
function renderMainSubjectGrid() {
  const container = document.getElementById("mainSubjectGrid");
  if (!container) return;

  container.innerHTML = subjectsConfig.map(sub => `
    <div onclick="openSubjectSubPage('${sub.name}')" 
         class="bg-surface-card border ${sub.color} rounded-xl p-3.5 cursor-pointer active:scale-95 transition-all flex flex-col justify-between hover:bg-surface-active shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <div class="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-sm font-bold">
          <i class="fa-solid ${sub.icon}"></i>
        </div>
        <i class="fa-solid fa-chevron-right text-[10px] text-gray-600"></i>
      </div>
      <div>
        <h3 class="text-xs font-bold text-white tracking-tight leading-tight">${sub.name}</h3>
        <span class="text-[9px] text-gray-500 block mt-0.5">Explore Assets</span>
      </div>
    </div>
  `).join('');
}

// 2. Fetch CSV Data & Handle Hash Route
async function fetchSheetData() {
  renderSkeletons();
  try {
    const response = await fetch(sheetCsvUrl);
    if (!response.ok) throw new Error("Network response error");
    const csvText = await response.text();
    
    allResources = parseCSV(csvText);

    if (window.location.hash.startsWith("#subject-")) {
      const subName = decodeURIComponent(window.location.hash.replace("#subject-", ""));
      openSubjectSubPage(subName);
    }
  } catch (error) {
    console.error("Fetch error:", error);
    const container = document.getElementById("resourceContainer");
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 text-red-400 text-xs">
          <i class="fa-solid fa-triangle-exclamation text-lg mb-1"></i><br>
          Failed to load resource database. Please pull down to refresh.
        </div>
      `;
    }
  }
}

// 3. Robust CSV Parser
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  function splitCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"' && row[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitCSVRow(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVRow(lines[i]);
    let item = {};
    headers.forEach((header, index) => {
      item[header] = (row[index] || "").replace(/^"|"$/g, '').trim();
    });

    if (item["Book Name"] || item["Subject"]) {
      data.push(item);
    }
  }
  return data;
}

// 4. Skeleton Loader UI
function renderSkeletons() {
  const container = document.getElementById("resourceContainer");
  if (!container) return;

  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="bg-surface-card border border-surface-border rounded-xl p-3 flex items-center justify-between animate-pulse">
      <div class="space-y-2 flex-grow pr-3">
        <div class="h-3 bg-surface-border rounded w-1/4"></div>
        <div class="h-4 bg-surface-border rounded w-3/4"></div>
        <div class="h-2.5 bg-surface-border rounded w-1/2"></div>
      </div>
      <div class="w-16 h-8 bg-surface-border rounded-lg shrink-0"></div>
    </div>
  `).join('');
}

// 5. Navigation
function openSubjectSubPage(subjectName) {
  currentSubject = subjectName;
  window.location.hash = `subject-${encodeURIComponent(subjectName)}`;

  document.getElementById("mainLandingView")?.classList.add("hidden");
  document.getElementById("subjectDetailView")?.classList.remove("hidden");
  
  const titleEl = document.getElementById("selectedSubjectTitle");
  if (titleEl) titleEl.innerText = `${subjectName}`;

  filterResources();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeSubjectSubPage() {
  document.getElementById("subjectDetailView")?.classList.add("hidden");
  document.getElementById("mainLandingView")?.classList.remove("hidden");
  history.pushState("", document.title, window.location.pathname + window.location.search);
}

// 6. Filtering Logic
function setCategoryFilter(cat, evt) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('active-tab');
    btn.classList.add('bg-surface-card', 'text-gray-400', 'border-surface-border');
  });

  const target = evt ? evt.target : (window.event ? window.event.target : null);
  if (target) {
    target.classList.add('active-tab');
  }
  filterResources();
}

function filterResources() {
  const searchQuery = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const selectedSubjectLower = currentSubject.toLowerCase().trim();
  const selectedCategoryLower = currentCategory.toLowerCase().trim();

  currentFilteredItems = allResources.filter(item => {
    const sheetSubjectLower = (item["Subject"] || "").toLowerCase().trim();
    const sheetCategoryLower = (item["Category"] || "").toLowerCase().trim();
    const sheetBookNameLower = (item["Book Name"] || "").toLowerCase().trim();
    const sheetScopeLower = (item["Scope"] || "").toLowerCase().trim();
    const sheetPublisherLower = (item["Publisher/Company"] || "").toLowerCase().trim();

    let matchSubject = !currentSubject || 
                       sheetSubjectLower.includes(selectedSubjectLower) || 
                       selectedSubjectLower.includes(sheetSubjectLower);

    if (selectedSubjectLower === "physical education") {
      matchSubject = matchSubject || sheetSubjectLower.includes("pe") || sheetSubjectLower.includes("phys ed");
    }

    let matchCategory = selectedCategoryLower === 'all' || sheetCategoryLower.includes(selectedCategoryLower);
    if (selectedCategoryLower.includes('textbook') || selectedCategoryLower.includes('reference')) {
      matchCategory = sheetCategoryLower.includes('textbook') || sheetCategoryLower.includes('reference') || sheetCategoryLower.includes('book');
    }

    const matchSearch = !searchQuery || 
      sheetBookNameLower.includes(searchQuery) || 
      sheetScopeLower.includes(searchQuery) ||
      sheetPublisherLower.includes(searchQuery) ||
      sheetSubjectLower.includes(searchQuery);

    return matchSubject && matchCategory && matchSearch;
  });

  renderResourceList(currentFilteredItems);
}

function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!url || url === '#') return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

// 7. Render Streamlined List Rows with Dual-Actions
function renderResourceList(items) {
  const container = document.getElementById("resourceContainer");
  const countEl = document.getElementById("itemCount");
  
  if (countEl) countEl.innerText = `${items.length} Files`;

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500 text-xs bg-surface-card rounded-xl border border-surface-border">
        <i class="fa-solid fa-folder-open text-xl mb-1 text-gray-600"></i>
        <p>No materials matching your filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const publisher = item["Publisher/Company"] || 'General';
    const edition = item["Edition"] && item["Edition"] !== "Not Specified" ? `Ed: ${item["Edition"]}` : '';
    const rawDrive = item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || "";
    const driveLink = sanitizeUrl(rawDrive);

    // Dynamic Publisher Color Badge
    let pubColor = "bg-amberBrand-500/10 text-amberBrand-400 border-amberBrand-500/20";
    if (publisher.toLowerCase().includes('oswaal')) pubColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (publisher.toLowerCase().includes('arihant')) pubColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";
    if (publisher.toLowerCase().includes('goyal')) pubColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

    return `
      <div class="bg-surface-card border border-surface-border rounded-xl p-3 flex items-center justify-between gap-2.5 hover:border-gray-700 transition">
        <div class="overflow-hidden space-y-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${pubColor}">
              ${publisher}
            </span>
            ${edition ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface text-gray-400 border border-surface-border">${edition}</span>` : ''}
            <span class="text-[9px] font-mono text-gray-500 uppercase">${item["Format"] || 'PDF'}</span>
          </div>

          <h3 class="font-bold text-xs text-white truncate leading-snug">
            ${item["Book Name"] || 'Untitled Document'}
          </h3>

          <p class="text-[10px] text-gray-400 truncate">
            ${item["Scope"] || 'Full syllabus practice notes'}
          </p>
        </div>

        <!-- Dual Action Icons -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="openMaterialModalByIndex(${index})" title="Preview in App"
                  class="w-8 h-8 rounded-lg bg-surface border border-surface-border text-gray-300 active:scale-95 flex items-center justify-center transition">
            <i class="fa-solid fa-eye text-xs"></i>
          </button>
          
          ${driveLink ? `
            <a href="${driveLink}" target="_blank" rel="noopener noreferrer" title="Direct Download"
               class="w-8 h-8 rounded-lg bg-amberBrand-500/10 border border-amberBrand-500/30 text-amberBrand-400 active:scale-95 flex items-center justify-center transition">
              <i class="fa-solid fa-download text-xs"></i>
            </a>
          ` : `
            <button disabled class="w-8 h-8 rounded-lg bg-surface border border-surface-border text-gray-600 cursor-not-allowed flex items-center justify-center">
              <i class="fa-solid fa-lock text-xs"></i>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// 8. Open In-App Lightbox Preview Modal
function openMaterialModalByIndex(index) {
  const item = currentFilteredItems[index];
  if (!item) return;

  const modalBadge = document.getElementById("modalSubjectBadge");
  const modalTitle = document.getElementById("modalTitle");
  const container = document.getElementById("detailContent");

  if (modalBadge) modalBadge.innerText = item["Subject"] || 'General';
  if (modalTitle) modalTitle.innerText = item["Book Name"] || 'Material Document';
  
  const rawDrive = item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || "";
  const rawLecture = item["Lecture Link"] || item["Telegram Channel Post Link"] || "";
  const latestEditionLink = sanitizeUrl(item["Latest Edition Link"] || "");

  const driveLink = sanitizeUrl(rawDrive);
  const lectureLink = sanitizeUrl(rawLecture);

  // Embedded Preview Player
  let embedHtml = "";
  if (driveLink && driveLink.includes("drive.google.com")) {
    const previewUrl = driveLink.replace(/\/view(\?.*)?$/, '/preview');
    embedHtml = `
      <div class="w-full h-[60vh] rounded-xl overflow-hidden border border-surface-border bg-black relative">
        <iframe src="${previewUrl}" class="w-full h-full border-0" allow="autoplay" loading="lazy"></iframe>
      </div>`;
  }

  const driveBtnHtml = driveLink
    ? `<a href="${driveLink}" target="_blank" rel="noopener noreferrer" class="py-2 px-3 rounded-lg text-xs font-bold bg-amberBrand-500 text-black hover:bg-amberBrand-400 text-center transition flex items-center justify-center gap-1.5">
         <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Open Full Tab
       </a>`
    : `<button disabled class="py-2 px-3 rounded-lg text-xs font-bold bg-surface text-gray-500 cursor-not-allowed text-center flex items-center justify-center gap-1.5 border border-surface-border">
         <i class="fa-solid fa-file-circle-xmark text-xs"></i> Link Unavailable
       </button>`;

  const lectureBtnHtml = lectureLink
    ? `<a href="${lectureLink}" target="_blank" rel="noopener noreferrer" class="py-2 px-3 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white text-center transition flex items-center justify-center gap-1.5">
         <i class="fa-brands fa-youtube text-sm"></i> Watch Video
       </a>`
    : `<a href="https://t.me/ICSEMasterClass10" target="_blank" rel="noopener noreferrer" class="py-2 px-3 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500 hover:text-white text-center transition flex items-center justify-center gap-1.5">
         <i class="fa-brands fa-telegram text-sm"></i> Telegram Notes
       </a>`;

  if (container) {
    container.innerHTML = `
      <div class="space-y-3">
        ${embedHtml}

        <div class="p-3 rounded-xl bg-surface border border-surface-border text-[11px] text-gray-300 grid grid-cols-2 gap-1.5">
          <p><strong class="text-amberBrand-400">Publisher:</strong> ${item["Publisher/Company"] || 'N/A'}</p>
          <p><strong class="text-amberBrand-400">Category:</strong> ${item["Category"] || 'N/A'}</p>
          <p class="col-span-2"><strong class="text-amberBrand-400">Scope:</strong> ${item["Scope"] || 'N/A'}</p>
          ${item["Edition"] ? `<p><strong class="text-amberBrand-400">Edition:</strong> ${item["Edition"]}</p>` : ''}
          ${latestEditionLink && latestEditionLink !== '#' ? `<p class="col-span-2 pt-1"><a href="${latestEditionLink}" target="_blank" class="text-amberBrand-400 underline font-bold flex items-center gap-1"><i class="fa-solid fa-cart-shopping text-xs"></i> Get Latest Edition Book</a></p>` : ''}
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          ${driveBtnHtml}
          ${lectureBtnHtml}
        </div>
      </div>
    `;
  }

  const modalEl = document.getElementById("detailView");
  if (modalEl) modalEl.classList.remove("hidden");
}

function closeMaterialModal() {
  const modalEl = document.getElementById("detailView");
  if (modalEl) modalEl.classList.add("hidden");
}
