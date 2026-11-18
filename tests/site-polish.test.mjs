import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");

test("publisher filtering uses existing sheet metadata rather than a hard-coded publisher list", () => {
  const html = read("index.html");
  const script = read("script.js");
  assert.ok(html.includes('id="publisherFilter"'));
  assert.ok(html.includes('onchange="setPublisherFilter(this.value)"'));
  assert.ok(script.includes("const materialPublisherCache = new WeakMap();"));
  assert.ok(script.includes("function getMaterialPublisher(item)"));
  assert.ok(script.includes('item?.["Publisher/Company"]||item?.["Publisher"]||""'));
  assert.ok(script.includes("function populatePublisherFilter()"));
  assert.ok(script.includes("function setPublisherFilter(value)"));
  assert.ok(script.includes("publisherMatch"));
  assert.ok(script.includes("yearMatch && publisherMatch && personalMatch"));
  assert.doesNotMatch(script, /Oswaal|Educart|Arihant|NODIA|Goyal Brothers/i);
});

test("publisher and year refinements remain independent and the source catalogue stays read-only", () => {
  const html = read("index.html");
  const script = read("script.js");
  assert.ok(html.includes('id="yearFilter"'));
  assert.ok(html.includes('id="publisherFilter"'));
  assert.ok(script.includes('const selectedYear = document.getElementById("yearFilter")'));
  assert.ok(script.includes("const selectedPublisher = normalizePublisherValue"));
  assert.ok(script.includes('const publisherMatch = selectedPublisher === "all"'));
  assert.ok(script.includes("const primaryCsvUrl ="));
  assert.doesNotMatch(script, /spreadsheets\.googleapis\.com[\s\S]{0,300}(?:POST|PUT|PATCH|DELETE)/i);
});

test("the shared design layer is loaded on every public page with a rendered interface", () => {
  const pages = ["index.html","login.html","dashboard.html","admin-1.html","faq.html","privacy-policy.html","cookie-policy.html","terms-and-conditions.html","refund-policy.html","404.html","blog/index.html","blog/how-to-use-icse-masterclass-study-vault.html","blog/icse-class-10-date-sheet-2027.html","blog/icse-class-10-study-plan.html"];
  for (const page of pages) assert.ok(read(page).includes("site-polish.css?v=1"), page);
});

test("shared visual tokens preserve Paper Light and avoid costly visual effects", () => {
  const css = read("site-polish.css");
  assert.ok(css.includes("--site-paper:#FAF9F6"));
  assert.ok(css.includes("--site-surface:#FFFFFF"));
  assert.ok(css.includes("--site-ink:#1E293B"));
  assert.ok(css.includes("--site-primary:#1D4ED8"));
  assert.ok(css.includes("min-height:48px"));
  assert.equal((css.match(/\\{/g) || []).length, (css.match(/\\}/g) || []).length);
  assert.doesNotMatch(css, /mix-blend-mode\s*:\s*difference|backdrop-filter\s*:\s*blur|linear-gradient|radial-gradient/i);
});

test("404 page uses local system fonts and no remote Tailwind or Google Fonts", () => {
  const html = read("404.html");
  assert.ok(html.includes('class="mc-not-found"'));
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

test("service worker precaches the shared visual layer under a fresh cache version", () => {
  const sw = read("sw.js");
  assert.ok(sw.includes("icse-masterclass-v1.18.6-mobile-polish"));
  assert.ok(sw.includes("./site-polish.css?v=1"));
});

test("protected copyright and non-affiliation copy remains present", () => {
  const html = read("index.html");
  assert.ok(html.includes("About ICSE MasterClass Study Vault"));
  assert.ok(html.includes("Resource Index, Copyright and Disclaimer"));
  assert.ok(html.includes("not affiliated with, authorised by or endorsed by the Council for the Indian School Certificate Examinations (CISCE)"));
  assert.ok(html.includes("Original authors, publishers and rights holders retain their respective rights"));
  assert.ok(html.includes("icsemasterclass@gmail.com"));
});

test("blog pages provide keyboard skip navigation to the main landmark", () => {
  const pages = [
    "blog/index.html",
    "blog/how-to-use-icse-masterclass-study-vault.html",
    "blog/icse-class-10-date-sheet-2027.html",
    "blog/icse-class-10-study-plan.html"
  ];
  for (const page of pages) {
    const html = read(page);
    assert.ok(html.includes('class="editorial-skip-link" href="#main-content" tabindex="0"'), page);
    assert.match(html, /<main id="main-content" tabindex="-1"/i, page);
  }
  const css = read("blog/blog.css");
  assert.match(css, /editorial-skip-link:focus/);
  assert.match(css, /editorial-skip-link\{position:fixed;/);
  assert.match(css, /transform:translateY\(0\)/);
});

test("homepage exposes answer-ready directory guidance and matching site schema", () => {
  const html = read("index.html");
  assert.ok(html.includes('id="study-vault-guide"'));
  assert.ok(html.includes("An independent ICSE Class 10 resource directory"));
  assert.ok(html.includes("previous-year questions, specimen papers and revision resources"));
  assert.ok(html.includes('"@type":"WebSite"'));
  assert.ok(html.includes('"@type":"WebPage"'));
  assert.ok(html.includes('property="og:image:alt"'));
  assert.ok(html.includes("not an official CISCE website or service"));
});

test("service worker invalidates the previous shell cache after editorial accessibility changes", () => {
  const sw = read("sw.js");
  assert.ok(sw.includes("icse-masterclass-v1.18.6-mobile-polish"));
  assert.ok(sw.includes('"./blog/blog.css"'));
});


test("homepage FAQ schema mirrors visible questions and answers", () => {
  const html = read("index.html");
  assert.ok(html.includes('id="study-vault-faq"'));
  assert.ok(html.includes("Is ICSE MasterClass an official CISCE website?"));
  assert.ok(html.includes("Are the resources in the Study Vault free?"));
  assert.ok(html.includes("Are the PDFs and notes produced by Team MasterClass?"));
  assert.ok(html.includes('"@type":"FAQPage"'));
  assert.ok(html.includes("Read all Study Vault FAQs"));
});


test("mobile search placeholder stays concise and the logo has descriptive alt text", () => {
  const html = read("index.html");
  assert.ok(html.includes('placeholder="Search title, subject or chapter"'));
  assert.ok(html.includes('alt="ICSE MasterClass Study Vault logo for the independent ICSE Class 10 study-resource directory"'));
  assert.ok(html.includes("Guide last updated: 15 November 2026"));
});


test("sitemap homepage lastmod reflects homepage edits without changing blog and FAQ dates", () => {
  const sitemap = read("sitemap.xml");
  assert.ok(sitemap.includes("<loc>https://icse-cbse-10-12.github.io/icse-class-10-materials/</loc><lastmod>2026-11-15</lastmod>"));
  assert.ok(sitemap.includes("<loc>https://icse-cbse-10-12.github.io/icse-class-10-materials/blog/</loc><lastmod>2026-11-12</lastmod>"));
  assert.ok(sitemap.includes("<loc>https://icse-cbse-10-12.github.io/icse-class-10-materials/faq.html</loc><lastmod>2026-11-12</lastmod>"));
});


test("deferred Tailwind configuration waits until the CDN is available", () => {
  const html = read("index.html");
  assert.ok(html.includes('document.addEventListener("DOMContentLoaded"'));
  assert.ok(html.includes("if (!window.tailwind) return;"));
  assert.ok(html.includes("window.tailwind.config = {"));
  assert.ok(html.includes('src="https://cdn.tailwindcss.com" defer'));
  assert.doesNotMatch(html, /(^|[^\w.])tailwind\.config\s*=/m);
});

test("student dashboard safely handles a missing optional due-date input", () => {
  const script = read("student-dashboard.js");
  assert.match(script, /const dashboardTaskDue = \$\("dashboardTaskDue"\); if \(dashboardTaskDue\) dashboardTaskDue\.min = today\(\);/);
});


test("dashboard Tailwind configuration waits for the deferred CDN", () => {
  const html = read("dashboard.html");
  assert.ok(html.includes('document.addEventListener("DOMContentLoaded"'));
  assert.ok(html.includes("if (!window.tailwind) return;"));
  assert.ok(html.includes("window.tailwind.config = {"));
  assert.ok(html.includes('src="https://cdn.tailwindcss.com" defer'));
  assert.doesNotMatch(html, /(^|[^\w.])tailwind\.config\s*=/m);
});

test("student dashboard progress renderer tolerates pages without dashboard widgets", () => {
  const script = read("student-dashboard.js");
  assert.ok(script.includes('const tasksDone = $("dashboardTasksDone");'));
  assert.ok(script.includes('if (!tasksDone || !tasksTotal || !completion || !sessionsEl || !minutesEl || !root) return;'));
  assert.ok(script.includes('const dashboardTaskDue = $("dashboardTaskDue"); if (dashboardTaskDue) dashboardTaskDue.min = today();'));
});


test("mobile catalogue starts with 12 cards, desktop pages with 36, and search is debounced", () => {
  const script = read("script.js");
  assert.ok(script.includes("const DESKTOP_RESOURCE_PAGE_SIZE = 36;"));
  assert.ok(script.includes("const MOBILE_RESOURCE_PAGE_SIZE = 12;"));
  assert.ok(script.includes('window.matchMedia("(max-width: 767px)")'));
  assert.match(script, /}, 250\);/);
  assert.ok(script.includes("function getMaterialFilterMetadata(item)"));
  assert.ok(script.includes("function deduplicateExactResourceRows(items)"));
  assert.ok(script.includes("const savedKeySet = new Set(readPersonalList(SAVED_MATERIALS_KEY));"));
  assert.ok(script.includes("isMaterialSaved(item, savedKeySet)"));
});

test("resource cards clean filenames, omit unknown file sizes, and compact multi-subject labels", () => {
  const script = read("script.js");
  const builder = read("scripts/build-catalog.mjs");
  for (const source of [script, builder]) {
    assert.ok(source.includes("formatMaterialTitle"));
    assert.ok(source.includes("dtoichiometry"));
    assert.ok(source.includes("Vastal"));
    assert.ok(source.includes("All Subjects ("));
    assert.doesNotMatch(source, /Size not listed/);
  }
  assert.ok(script.includes("deduplicateExactResourceRows(filteredResources)"));
  assert.ok(builder.includes("const firstPage = uniqueResources.slice(0, 12);"));
});

test("directory guidance and FAQ appear after the material catalogue, not before subject browsing", () => {
  const html = read("index.html");
  assert.ok(html.indexOf('id="mainLandingView"') < html.indexOf('id="study-vault-guide"'));
  assert.ok(html.indexOf('id="resourceGrid"') < html.indexOf('id="study-vault-guide"'));
  assert.ok(html.indexOf('id="study-vault-guide"') < html.indexOf('id="study-vault-faq"'));
  assert.ok(html.indexOf('id="study-vault-faq"') < html.indexOf('class="library-legal"'));
  assert.ok(html.includes("About ICSE MasterClass Study Vault"));
  assert.ok(html.includes("Resource Index, Copyright and Disclaimer"));
});

test("saved count is hidden when empty and EduBot privacy acknowledgement stays available", () => {
  const html = read("index.html");
  const script = read("script.js");
  const client = read("gemini-ai.js");
  const loader = read("edubot-loader.js");
  assert.ok(html.includes('<span id="savedMaterialCount" hidden>0</span>'));
  assert.ok(html.includes('<details id="edubotPrivacyNotice" class="edubot-privacy-disclosure" open>'));
  assert.ok(html.includes("Privacy &amp; AI notice"));
  assert.ok(html.includes('id="edubotDataAcknowledgement" form="edubotChatForm" type="checkbox" required'));
  assert.ok(html.includes("This acknowledgement is not parental consent."));
  assert.ok(script.includes("savedCount.hidden = savedItems.length === 0;"));
  assert.ok(loader.includes("icseMasterClass.edubotNoticeAcknowledged.v1"));
  assert.ok(loader.includes("privacyNotice.open = false"));
  assert.ok(html.includes("edubot-loader.js?v=3"));
  assert.ok(loader.includes("gemini-ai.js?v=4"));
});

test("mobile layout keeps filters swipeable and card actions thumb-friendly without blur", () => {
  const css = read("site-polish.css");
  assert.ok(css.includes("body.mc-home .library-filter-tabs"));
  assert.ok(css.includes("flex-wrap:nowrap"));
  assert.ok(css.includes("overflow-x:auto"));
  assert.ok(css.includes("min-height:44px!important"));
  assert.ok(css.includes("backdrop-filter:none!important"));
  assert.ok(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))"));
});
