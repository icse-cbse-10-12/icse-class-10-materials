// Published Google Sheets CSV Endpoint
const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLGKfaC9WUePvCArs7YAxYP9tmoPYkCdfJviR2pdOnlSZ6gVLEqgtAEga4XLQpubVTfEsHo2eWBWx7/pub?output=csv';

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
  "Notes",
  "Other Subjects"
];

// Custom FontAwesome Icon Mappings
const subjectIcons = {
  "All": "fa-layer-group",
  "Physics": "fa-atom",
  "Physical Education": "fa-dumbbell",
  "Mathematics": "fa-calculator",
  "Home Science": "fa-house-user",
  "History & Civics": "fa-landmark",
  "Geography": "fa-earth-americas",
  "Environmental Applications": "fa-leaf",
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

// Initialize Subject Cards into Landing Grid
function initSubjectCards() {
  const grid = document.getElementById('mainSubjectGrid');
  if (!grid) return;

  grid.innerHTML = subjectsList.map(subject => {
    const icon = subjectIcons[subject] || 'fa-book';
    return `
      <button onclick="selectSubject('${subject}')" class="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/50 hover:bg-gray-900/80 transition flex flex-col items-center justify-center gap-2 text-center group cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition">
          <i class="fa-solid ${icon} text-base"></i>
        </div>
        <span class="text-xs font-bold text-gray-200 group-hover:text-white">${subject}</span>
      </button>
    `;
  }).join('');
}

// Fetch CSV Data from Google Sheets & Check Hash Route
async function fetchSheetData() {
  const statusEl = document.getElementById('statusMessage');
  try {
    const response = await fetch(sheetCsvUrl);
    if (!response.ok) throw new Error('Network response failed');
    const csvText = await response.text();
    
    allResources = parseCSV(csvText);

    if (statusEl) {
      statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> <span>Loaded ${allResources.length} resources from database.</span>`;
    }

    // Auto-open subject page if URL contains hash (e.g. #subject-Home%20Science or #subject-Physics)
    checkHashRoute();
  } catch (error) {
    console.error('Fetch error:', error);
    if (statusEl) {
      statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-400"></i> <span class="text-red-400">Failed to load database. Refresh to try again.</span>`;
    }
  }
}

// Check Hash Route on Load or Hash Change
function checkHashRoute() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#subject-')) {
    const rawSubject = decodeURIComponent(hash.replace('#subject-', '')).trim();
    const matchedSubject = subjectsList.find(s => s.toLowerCase() === rawSubject.toLowerCase());
    if (matchedSubject) {
      selectSubject(matchedSubject, false);
    }
  }
}

// CSV Parser
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  function splitRow(row) {
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

  const headers = splitRow(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitRow(lines[i]);
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

// Subject Selection Handler with URL Hash Updates
function selectSubject(subjectName, updateHash = true) {
  currentSubject = subjectName;
  
  if (updateHash) {
    if (subjectName === "All") {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    } else {
      window.location.hash = `subject-${encodeURIComponent(subjectName)}`;
    }
  }

  const titleEl = document.getElementById('selectedSubjectTitle');
  if (titleEl) {
    titleEl.innerText = subjectName === "All" ? "All Subjects Vault" : subjectName;
  }

  document.getElementById('mainLandingView')?.classList.add('hidden');
  document.getElementById('subjectDetailView')?.classList.remove('hidden');
  
  filterResources();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Case-Insensitive Multi-Condition Filter Engine
function filterResources() {
  const searchVal = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

  filteredResources = allResources.filter(item => {
    const itemSubject = (item["Subject"] || "").toLowerCase().trim();
    const itemCategory = (item["Category"] || "").toLowerCase().trim();
    const bookName = (item["Book Name"] || "").toLowerCase().trim();
    const publisher = (item["Publisher/Company"] || item["Publisher"] || "").toLowerCase().trim();

    let subMatch = false;

    if (currentSubject === "All") {
      subMatch = true;
    } else {
      const target = currentSubject.toLowerCase().trim();
      
      if (target === "physical education") {
        subMatch = itemSubject.includes("physical education") || itemSubject.includes("physical eduaction") || itemSubject.includes("pe");
      } else if (target === "home science") {
        subMatch = itemSubject.includes("home science") || itemSubject.includes("homescience");
      } else if (target === "second language - tamil") {
        subMatch = itemSubject.includes("tamil");
      } else if (target === "second language - malayalam") {
        subMatch = itemSubject.includes("malayalam");
      } else if (target === "second language - kannada") {
        subMatch = itemSubject.includes("kannada");
      } else if (target === "second language - hindi") {
        subMatch = itemSubject.includes("hindi");
      } else if (target === "english literature") {
        subMatch = itemSubject.includes("english literature") || itemSubject.includes("lit");
      } else if (target === "english language") {
        subMatch = itemSubject.includes("english language") || itemSubject.includes("lang");
      } else if (target === "environmental applications") {
        subMatch = itemSubject.includes("environmental");
      } else if (target === "commercial applications") {
        subMatch = itemSubject.includes("commercial app");
      } else if (target === "commercial studies") {
        subMatch = itemSubject.includes("commercial stud");
      } else if (target === "eco
                 nomic applications") {
        subMatch = itemSubject.includes("economic");
      } else {
        subMatch = itemSubject.includes(target);
      }
    }
                   
    let catMatch = currentCategory === "All" || itemCategory.includes(currentCategory.toLowerCase());
    let srchMatch = !searchVal || bookName.includes(searchVal) || itemSubject.includes(searchVal) || publisher.includes(searchVal);

    return subMatch && catMatch && srchMatch;
  });

  renderGrid(filteredResources);
}

// Category Filter Tabs
function setCategoryFilter(category, event) {
  currentCategory = category;
  document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active-tab', 'bg-amber-500', 'text-black'));
  if (event && event.target) {
    event.target.classList.add('active-tab', 'bg-amber-500', 'text-black');
  }
  filterResources();
}

// Close Detail View and Clear Hash
function closeSubjectSubPage() {
  document.getElementById('subjectDetailView')?.classList.add('hidden');
  document.getElementById('mainLandingView')?.classList.remove('hidden');
  history.pushState("", document.title, window.location.pathname + window.location.search);
}

// Render Filtered Cards Grid with Full Metadata
function renderGrid(data) {
  const grid = document.getElementById("resourceGrid");
  const countEl = document.getElementById("itemCount");
  
  if (countEl) countEl.innerText = `${data.length} Materials Found`;
  if (!grid) return;

  if (data.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 text-xs">No study materials matched your search or category filter.</div>`;
    return;
  }

  grid.innerHTML = data.map((item, index) => {
    const rawDrive = item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || item["Link"] || "#";
    const driveLink = rawDrive.startsWith('http') ? rawDrive : 'https://' + rawDrive;

    const rawLecture = item["Lecture Link"] || item["Telegram Channel Post Link"] || "";
    const lectureLink = rawLecture ? (rawLecture.startsWith('http') ? rawLecture : 'https://' + rawLecture) : "";

    const rawLatestEdLink = item["Latest Edition Link"] || "";
    const latestEdLink = rawLatestEdLink ? (rawLatestEdLink.startsWith('http') ? rawLatestEdLink : 'https://' + rawLatestEdLink) : "";

    const isLatestAvailable = item["Latest Edition Available?"] || "";
    const editionText = item["Edition"] && item["Edition"] !== "Not Specified" ? `Ed: ${item["Edition"]}` : "";

    return `
      <div class="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/40 transition flex flex-col justify-between gap-3 shadow-lg">
        <div class="space-y-2">
          <!-- Category, Edition & Publisher Row -->
          <div class="flex items-center justify-between text-[10px] gap-2">
            <span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold shrink-0">
              ${item["Category"] || "General"}
            </span>
            <div class="flex items-center gap-1 overflow-hidden truncate text-gray-400">
              ${editionText ? `<span class="px-1.5 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-semibold">${editionText}</span>` : ""}
              <span class="truncate">${item["Publisher/Company"] || item["Publisher"] || item["Subject"] || ""}</span>
            </div>
          </div>

          <!-- Book Title -->
          <h3 class="font-bold text-sm text-white line-clamp-2 leading-snug">${item["Book Name"] || "Resource File"}</h3>
          
          <!-- Scope / Description -->
          ${item["Scope"] ? `<p class="text-xs text-gray-400 line-clamp-2">${item["Scope"]}</p>` : ''}

          <!-- Latest Edition Info Tag -->
          ${isLatestAvailable ? `
            <div class="pt-1 text-[11px]">
              <span class="text-emerald-400 font-semibold"><i class="fa-solid fa-circle-check text-[10px]"></i> Latest Edition: ${isLatestAvailable}</span>${latestEdLink ? `<a href="${latestEdLink}" target="_blank" class="ml-1 text-amber-400 underline hover:text-amber-300 font-bold">(Get Book)</a>` : ''}
            </div>
          ` : ''}
        </div>
        
        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
          <button onclick="openMaterialModalByIndex(${index})" class="py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs text-center transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-eye"></i> Preview
          </button>

          <a href="${driveLink}" target="_blank" rel="noopener noreferrer" class="py-2 rounded-xl bg-amber-500 text-black font-bold text-xs text-center hover:bg-amber-400 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-download"></i> Material
          </a>

          ${lectureLink ? `
            <a href="${lectureLink}" target="_blank" rel="noopener noreferrer" class="col-span-2 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white font-bold text-xs text-center transition flex items-center justify-center gap-1.5">
              <i class="fa-brands fa-youtube text-sm"></i> Watch Lecture
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");
}

// Modal Lightbox Viewer
function openMaterialModalByIndex(index) {
  const item = filteredResources[index];
  if (!item) return;

  const modalBadge = document.getElementById("modalSubjectBadge");
  const modalTitle = document.getElementById("modalTitle");
  const container = document.getElementById("detailContent");

  if (modalBadge) modalBadge.innerText = item["Subject"] || 'General';
  if (modalTitle) modalTitle.innerText = item["Book Name"] || 'Material Document';

  const rawDrive = item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || item["Link"] || "";
  let driveLink = rawDrive.trim();
  if (driveLink && !driveLink.startsWith('http')) driveLink = 'https://' + driveLink;

  const rawLecture = item["Lecture Link"] || item["Telegram Channel Post Link"] || "";
  const lectureLink = rawLecture ? (rawLecture.startsWith('http') ? rawLecture : 'https://' + rawLecture) : "";

  const rawLatestEdLink = item["Latest Edition Link"] || "";
  const latestEdLink = rawLatestEdLink ? (rawLatestEdLink.startsWith('http') ? rawLatestEdLink : 'https://' + rawLatestEdLink) : "";

  let embedHtml = "";
  if (driveLink && driveLink.includes("drive.google.com")) {
    const previewUrl = driveLink.replace(/\/view(\?.*)?$/, '/preview');
    embedHtml = `
      <div class="w-full h-[55vh] sm:h-[62vh] rounded-xl overflow-hidden border border-gray-800 bg-black relative">
        <iframe src="${previewUrl}" class="w-full h-full border-0" allow="autoplay" loading="lazy"></iframe>
      </div>`;
  }

  if (container) {
    container.innerHTML = `
      <div class="space-y-4">
        ${embedHtml}
        
        <div class="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <p><strong class="text-amber-400">Publisher:</strong> ${item["Publisher/Company"] || item["Publisher"] || 'N/A'}</p>
          <p><strong class="text-amber-400">Category:</strong> ${item["Category"] || 'N/A'}</p>
          <p><strong class="text-amber-400">Edition:</strong> ${item["Edition"] || 'Not Specified'}</p>
          <p><strong class="text-amber-400">Format:</strong> ${item["Format"] || 'PDF'}</p>
          <p class="col-span-full"><strong class="text-amber-400">Scope:</strong> ${item["Scope"] || 'N/A'}</p>
          
          ${item["Latest Edition Available?"] ? `
            <p class="col-span-full pt-1 border-t border-gray-800/80">
              <strong class="text-amber-400">Latest Edition Status:</strong> ${item["Latest Edition Available?"]}
              ${latestEdLink ? `<a href="${latestEdLink}" target="_blank" class="ml-2 text-amber-400 underline font-bold"><i class="fa-solid fa-cart-shopping text-xs"></i> Get Latest Edition Book</a>` : ''}
            </p>
          ` : ''}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <a href="${driveLink}" target="_blank" rel="noopener noreferrer" class="py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs text-center hover:bg-amber-400 transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Drive Link
          </a>
          
          ${lectureLink ? `
            <a href="${lectureLink}" target="_blank" rel="noopener noreferrer" class="py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white font-bold text-xs text-center transition flex items-center justify-center gap-2">
              <i class="fa-brands fa-youtube text-sm"></i> Watch Video Lecture
            </a>
          ` : `
            <a href="https://t.me/ICSEMasterClass10" target="_blank" rel="noopener noreferrer" class="py-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500 hover:text-white font-bold text-xs text-center transition flex items-center justify-center gap-2">
              <i class="fa-brands fa-telegram text-sm"></i> Telegram Discussion
            </a>
          `}
        </div>
      </div>
    `;
  }

  document.getElementById("detailView")?.classList.remove("hidden");
}
// Modal Lightbox Viewer
function openMaterialModalByIndex(index) {
  const item = filteredResources[index];
  if (!item) return;

  const modalBadge = document.getElementById("modalSubjectBadge");
  const modalTitle = document.getElementById("modalTitle");
  const container = document.getElementById("detailContent");

  if (modalBadge) modalBadge.innerText = item["Subject"] || 'General';
  if (modalTitle) modalTitle.innerText = item["Book Name"] || 'Material Document';

  const rawDrive = item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || item["Link"] || "";
  let driveLink = rawDrive.trim();
  if (driveLink && !driveLink.startsWith('http')) driveLink = 'https://' + driveLink;

  let embedHtml = "";
  if (driveLink && driveLink.includes("drive.google.com")) {
    const previewUrl = driveLink.replace(/\/view(\?.*)?$/, '/preview');
    embedHtml = `
      <div class="w-full h-[55vh] sm:h-[62vh] rounded-xl overflow-hidden border border-gray-800 bg-black relative">
        <iframe src="${previewUrl}" class="w-full h-full border-0" allow="autoplay" loading="lazy"></iframe>
      </div>`;
  }

  if (container) {
    container.innerHTML = `
      <div class="space-y-4">
        ${embedHtml}
        <div class="p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 space-y-1">
          <p><strong class="text-amber-400">Publisher:</strong> ${item["Publisher/Company"] || item["Publisher"] || 'N/A'}</p>
          <p><strong class="text-amber-400">Category:</strong> ${item["Category"] || 'N/A'}</p>
          <p><strong class="text-amber-400">Scope:</strong> ${item["Scope"] || 'N/A'}</p>
        </div>
        <a href="${driveLink}" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs text-center hover:bg-amber-400 transition flex items-center justify-center gap-2">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Drive Link
        </a>
      </div>
    `;
  }

  document.getElementById("detailView")?.classList.remove("hidden");
}

function closeMaterialModal() {
  document.getElementById("detailView")?.classList.add("hidden");
}

// Listen to Hash Changes in Browser History
window.addEventListener('hashchange', checkHashRoute);

// DOM Ready Listener
document.addEventListener("DOMContentLoaded", () => {
  initSubjectCards();
  fetchSheetData();
});
