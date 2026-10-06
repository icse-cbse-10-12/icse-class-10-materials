// Complete Subject List Matching All Folders
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

// Initialize Subject Cards into Grid
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

  const statusEl = document.getElementById('statusMessage');
  if (statusEl) {
    statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i><span>Select a subject above to view materials.</span>`;
  }
}

// Select Subject Handler
function selectSubject(subjectName) {
  currentSubject = subjectName;
  document.getElementById('selectedSubjectTitle').innerText = subjectName === "All" ? "All Subjects Vault" : subjectName;
  document.getElementById('mainLandingView').classList.add('hidden');
  document.getElementById('subjectDetailView').classList.remove('hidden');
  filterResources();
}

// Case-Insensitive Multi-Condition Filtering Engine
function filterResources() {
  const searchVal = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

  const filtered = allResources.filter(item => {
    const itemSubject = (item["Subject"] || "").toLowerCase().trim();
    const itemCategory = (item["Category"] || "").toLowerCase().trim();
    const bookName = (item["Book Name"] || "").toLowerCase().trim();

    let subMatch = false;

    if (currentSubject === "All") {
      subMatch = true;
    } else {
      const target = currentSubject.toLowerCase().trim();
      
      // Strict / Typo-Resilient Matching Logic
      if (target === "physical education") {
        subMatch = itemSubject.includes("physical education") || itemSubject.includes("physical eduaction") || itemSubject.includes("pe");
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
      } else if (target === "economic applications") {
        subMatch = itemSubject.includes("economic");
      } else {
        subMatch = itemSubject.includes(target);
      }
    }
                   
    let catMatch = currentCategory === "All" || itemCategory.includes(currentCategory.toLowerCase());
    let srchMatch = !searchVal || bookName.includes(searchVal) || itemSubject.includes(searchVal);

    return subMatch && catMatch && srchMatch;
  });

  renderGrid(filtered);
}

// Set Category Filter Tab
function setCategoryFilter(category, event) {
  currentCategory = category;
  document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active-tab', 'bg-amber-500', 'text-black'));
  if (event && event.target) {
    event.target.classList.add('active-tab', 'bg-amber-500', 'text-black');
  }
  filterResources();
}

// Close Detail Subview
function closeSubjectSubPage() {
  document.getElementById('subjectDetailView').classList.add('hidden');
  document.getElementById('mainLandingView').classList.remove('hidden');
}

// Render Filtered Cards Grid
function renderGrid(data) {
  const grid = document.getElementById("resourceGrid");
  const countEl = document.getElementById("itemCount");
  if (countEl) countEl.innerText = `${data.length} Materials Found`;
  if (!grid) return;

  if (data.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500 text-xs">No study materials matched your filters.</div>`;
    return;
  }

  grid.innerHTML = data.map(item => `
    <div class="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-amber-500/40 transition flex flex-col justify-between gap-3">
      <div class="space-y-2">
        <div class="flex items-center justify-between text-[10px]">
          <span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">${item["Category"] || "General"}</span>
          <span class="text-gray-400">${item["Publisher"] || item["Subject"] || ""}</span>
        </div>
        <h3 class="font-bold text-sm text-white line-clamp-2">${item["Book Name"] || "Resource File"}</h3>
      </div>
      <a href="${item["Link"] || "#"}" target="_blank" class="w-full py-2 rounded-xl bg-amber-500 text-black font-bold text-xs text-center hover:bg-amber-400 transition flex items-center justify-center gap-1.5">
        <i class="fa-solid fa-download"></i> Access Material
      </a>
    </div>
  `).join("");
}

// DOM Ready Event Listener
document.addEventListener("DOMContentLoaded", initSubjectCards);
