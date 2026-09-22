// Configuration & State
const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLGKfaC9WUePvCArs7YAxYP9tmoPYkCdfJviR2pdOnlSZ6gVLEqgtAEga4XLQpubVTfEsHo2eWBWx7/pub?output=csv';

let allResources = [];
let currentSubject = '';
let currentCategory = 'All';

// Subject Grid Configuration
const subjectsConfig = [
  { name: "English Paper 1", icon: "fa-pen-nib", color: "from-rose-500/20 to-pink-500/10" },
  { name: "English Paper 2", icon: "fa-book-open", color: "from-pink-500/20 to-rose-500/10" },
  { name: "Mathematics", icon: "fa-calculator", color: "from-purple-500/20 to-indigo-500/10" },
  { name: "Physics", icon: "fa-atom", color: "from-blue-500/20 to-cyan-500/10" },
  { name: "Chemistry", icon: "fa-flask", color: "from-amber-500/20 to-yellow-500/10" },
  { name: "Biology", icon: "fa-dna", color: "from-green-500/20 to-emerald-500/10" },
  { name: "History & Civics", icon: "fa-landmark", color: "from-orange-500/20 to-amber-500/10" },
  { name: "Geography", icon: "fa-earth-americas", color: "from-teal-500/20 to-cyan-500/10" },
  { name: "Commercial Studies", icon: "fa-briefcase", color: "from-slate-500/20 to-gray-500/10" },
  { name: "Commercial Applications", icon: "fa-chart-line", color: "from-emerald-500/20 to-teal-500/10" },
  { name: "Economic Applications", icon: "fa-coins", color: "from-yellow-500/20 to-amber-500/10" },
  { name: "Computer Applications", icon: "fa-code", color: "from-blue-600/20 to-indigo-600/10" },
  { name: "Second Language (Hindi)", icon: "fa-language", color: "from-fuchsia-500/20 to-pink-500/10" },
  { name: "Second Language (Tamil)", icon: "fa-language", color: "from-fuchsia-500/20 to-purple-500/10" },
  { name: "Second Language (Kannada)", icon: "fa-language", color: "from-violet-500/20 to-fuchsia-500/10" },
  { name: "Second Language (Malayalam)", icon: "fa-language", color: "from-purple-500/20 to-pink-500/10" }
];

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
  renderMainSubjectGrid();
  fetchSheetData();
});

// 1. Render Main Landing Subject Cards
function renderMainSubjectGrid() {
  const container = document.getElementById("mainSubjectGrid");
  if (!container) return;

  container.innerHTML = subjectsConfig.map(sub => `
    <div onclick="openSubjectSubPage('${sub.name}')" 
         class="glass-card rounded-2xl p-5 cursor-pointer border border-gray-800/80 hover:border-brand-500/50 transition bg-gradient-to-br ${sub.color} group flex flex-col justify-between">
      <div>
        <div class="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 text-xl mb-4 group-hover:scale-110 transition-transform">
          <i class="fa-solid ${sub.icon}"></i>
        </div>
        <h3 class="text-base font-bold text-white mb-1 tracking-tight">${sub.name}</h3>
        <p class="text-xs text-gray-400 mb-4">Notes, question banks & solved papers</p>
      </div>
      <div class="text-xs font-bold text-brand-400 flex items-center justify-between pt-2 border-t border-gray-800/50 mt-auto">
        <span>Open Vault</span>
        <i class="fa-solid fa-arrow-right transition-transform group-hover:translate-x-1"></i>
      </div>
    </div>
  `).join('');
}

// 2. Fetch Google Sheet CSV Data
async function fetchSheetData() {
  const statusMsg = document.getElementById("statusMessage");
  try {
    const response = await fetch(sheetCsvUrl);
    if (!response.ok) throw new Error("Network response was not ok");
    const csvText = await response.text();
    
    allResources = parseCSV(csvText);
    if (statusMsg) statusMsg.classList.add("hidden");

    if (window.location.hash.startsWith("#subject-")) {
      const subName = decodeURIComponent(window.location.hash.replace("#subject-", ""));
      openSubjectSubPage(subName);
    }
  } catch (error) {
    console.error("Fetch error:", error);
    if (statusMsg) {
      statusMsg.innerHTML = `
        <div class="text-red-400 text-xs font-semibold">
          <i class="fa-solid fa-triangle-exclamation mb-1 text-base"></i><br>
          Failed to load database. Please refresh or try again later.
        </div>
      `;
    }
  }
}

// 3. CSV Parser
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

// 4. Navigation
function openSubjectSubPage(subjectName) {
  currentSubject = subjectName;
  window.location.hash = `subject-${encodeURIComponent(subjectName)}`;

  document.getElementById("mainLandingView")?.classList.add("hidden");
  document.getElementById("subjectDetailView")?.classList.remove("hidden");
  
  const titleEl = document.getElementById("selectedSubjectTitle");
  if (titleEl) titleEl.innerText = `${subjectName} Vault`;

  filterResources();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeSubjectSubPage() {
  document.getElementById("subjectDetailView")?.classList.add("hidden");
  document.getElementById("mainLandingView")?.classList.remove("hidden");
  history.pushState("", document.title, window.location.pathname + window.location.search);
}

// 5. Filtering & Search
function setCategoryFilter(cat, evt) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('active-tab');
    btn.classList.add('bg-gray-900', 'text-gray-300', 'border-gray-800');
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

  const filtered = allResources.filter(item => {
    const sheetSubjectLower = (item["Subject"] || "").toLowerCase().trim();
    const sheetCategoryLower = (item["Category"] || "").toLowerCase().trim();
    const sheetBookNameLower = (item["Book Name"] || "").toLowerCase().trim();
    const sheetScopeLower = (item["Scope"] || "").toLowerCase().trim();
    const sheetPublisherLower = (item["Publisher/Company"] || "").toLowerCase().trim();

    const matchSubject = !currentSubject || sheetSubjectLower.includes(selectedSubjectLower) || selectedSubjectLower.includes(sheetSubjectLower);
    const matchCategory = selectedCategoryLower === 'all' || sheetCategoryLower.includes(selectedCategoryLower);
    const matchSearch = !searchQuery || 
      sheetBookNameLower.includes(searchQuery) || 
      sheetScopeLower.includes(searchQuery) ||
      sheetPublisherLower.includes(searchQuery) ||
      sheetSubjectLower.includes(searchQuery);

    return matchSubject && matchCategory && matchSearch;
  });

  renderResourceGrid(filtered);
}

// 6. Render Resource Grid
function renderResourceGrid(items) {
  const grid = document.getElementById("resourceGrid");
  const countEl = document.getElementById("itemCount");
  
  if (countEl) countEl.innerText = `${items.length} Material${items.length === 1 ? '' : 's'} Found`;

  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500 text-xs">
        No resources found for this category or query.
      </div>
    `;
    return;
  }

  window.currentFilteredItems = items;

  grid.innerHTML = items.map((item, index) => `
    <div class="glass-card rounded-2xl p-5 border border-gray-800/80 flex flex-col justify-between hover:border-brand-500/40 transition">
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
            ${item["Category"] || 'Resource'}
          </span>
          <span class="text-[10px] font-mono text-gray-500 uppercase">${item["Format"] || 'PDF'}</span>
        </div>

        <h3 class="font-bold text-sm text-white mb-2 line-clamp-2 leading-snug">
          ${item["Book Name"] || 'Untitled Document'}
        </h3>

        <p class="text-xs text-gray-400 mb-4 line-clamp-2">
          ${item["Publisher/Company"] ? `<strong class="text-gray-300">${item["Publisher/Company"]}:</strong> ` : ''}${item["Scope"] || 'Full syllabus notes & practice files.'}
        </p>
      </div>

      <button onclick="openMaterialModalByIndex(${index})" 
              class="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500 hover:text-black transition flex items-center justify-center gap-2">
        <i class="fa-solid fa-book-open"></i> Open Material Page
      </button>
    </div>
  `).join('');
}

// 7. Open Detail Modal View
function openMaterialModalByIndex(index) {
  const item = window.currentFilteredItems[index];
  if (!item) return;

  const container = document.getElementById("detailContent");
  
  const driveLink = (item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || "").trim();
  const lectureLink = (item["Lecture Link"] || item["Telegram Channel Post Link"] || "").trim();

  const driveBtnHtml = driveLink && driveLink !== "#"
    ? `<a href="${driveLink}" target="_blank" rel="noopener noreferrer" class="w-full py-3 px-4 rounded-xl text-xs font-bold bg-brand-500 text-black hover:bg-brand-400 text-center transition flex items-center justify-center gap-2">
         <i class="fa-solid fa-file-pdf text-sm"></i> Direct View / Download
       </a>`
    : `<button disabled class="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gray-800 text-gray-500 cursor-not-allowed text-center flex items-center justify-center gap-2 border border-gray-700/50">
         <i class="fa-solid fa-file-circle-xmark text-sm"></i> Link Coming Soon
       </button>`;

  const lectureBtnHtml = lectureLink
    ? `<a href="${lectureLink}" target="_blank" rel="noopener noreferrer" class="w-full py-3 px-4 rounded-xl text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white text-center transition flex items-center justify-center gap-2">
         <i class="fa-brands fa-youtube text-sm"></i> Watch Video Lecture
       </a>`
    : `<a href="https://t.me/ICSEMasterClass10" target="_blank" rel="noopener noreferrer" class="w-full py-3 px-4 rounded-xl text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500 hover:text-white text-center transition flex items-center justify-center gap-2">
         <i class="fa-brands fa-telegram text-sm"></i> Open in Telegram
       </a>`;

  if (container) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
          <i class="fa-solid fa-folder-open shrink-0"></i> 
          <span class="truncate">${item["Subject"] || 'General'}</span>
        </div>

        <h2 class="text-xl sm:text-2xl font-black text-white leading-tight">
          ${item["Book Name"] || 'Material File'}
        </h2>

        <div class="p-4 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-300 space-y-2">
          <p><strong class="text-brand-400">Category:</strong> ${item["Category"] || 'N/A'}</p>
          <p><strong class="text-brand-400">Publisher / Company:</strong> ${item["Publisher/Company"] || 'N/A'}</p>
          <p><strong class="text-brand-400">Scope:</strong> ${item["Scope"] || 'N/A'}</p>
          <p><strong class="text-brand-400">Format:</strong> ${item["Format"] || 'PDF'}</p>
        </div>

        <div class="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${driveBtnHtml}
          ${lectureBtnHtml}
        </div>
      </div>
    `;
  }

  document.getElementById("detailView")?.classList.remove("hidden");
}

function closeMaterialModal() {
  document.getElementById("detailView")?.classList.add("hidden");
}
