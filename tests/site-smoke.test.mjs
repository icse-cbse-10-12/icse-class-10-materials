import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = name => readFileSync(join(root, name), "utf8");

test("all public pages load the shared academic design layer", () => {
  for (const [page, bodyClass] of [["index.html", "mc-home"], ["login.html", "mc-login"], ["dashboard.html", "mc-dashboard"], ["admin-1.html", "mc-admin"]]) {
    const html = read(page);
    assert.ok(html.includes("academic-library.css"), `${page} must load the shared design layer`);
    assert.match(html, new RegExp(`<body[^>]*class=[\"'][^\"']*${bodyClass}`), `${page} must have its expected scope class`);
  }
});

test("EduBot shared API module is not loaded during initial page parsing", () => {
  const html = read("index.html");
  assert.match(html, /edubot-loader\.js\?v=2/);
  assert.doesNotMatch(html, /<script[^>]+gemini-ai\.js/i);
  const loader = read("edubot-loader.js");
  assert.match(loader, /import\(\"\.\/gemini-ai\.js\?v=3\"\)/);
  assert.match(loader, /addEventListener\(\"submit\"/);
});

test("service worker does not precache broken or heavy AI assets", () => {
  const sw = read("sw.js");
  assert.doesNotMatch(sw, /ai-tutor\.js|gemini-ai\.js/);
  assert.match(sw, /login\.html/);
  assert.match(sw, /icseYtLogo\.webp/);
  assert.doesNotMatch(sw, /icseYtLogo\.png/);
  assert.match(sw, /academic-library\.css/);
  assert.match(sw, /NETWORK_TIMEOUT_MS/);
  assert.match(sw, /CATALOGUE_TIMEOUT_MS/);
  assert.match(sw, /ignoreSearch/);
});

test("shared design layer stays paper-based and honours reduced motion", () => {
  const css = read("academic-library.css");
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
  assert.match(css, /--mc-paper:#F5F1E8/);
  assert.doesNotMatch(css, /radial-gradient|linear-gradient|backdrop-filter\s*:\s*blur/i);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
});

test("the base stylesheet no longer serializes a remote font import", () => {
  assert.equal(read("style.css").includes("fonts.googleapis.com/css2?family=Inter"), false);
});

test("all same-origin assets referenced by the new patch exist", () => {
  for (const name of ["academic-library.css", "edubot-loader.js", "sw.js", "src/inkbleed.js"]) assert.ok(existsSync(join(root, name)), `${name} must exist`);
});

test("the homepage defaults to the paper theme while retaining dark mode options", () => {
  assert.match(read("script.js"), /siteSettingsDefaults = \{ mode: "light"/);
  assert.match(read("script.js"), /\["dark", "light", "midnight"\]/);
});

test("the catalogue can render from cache while a background refresh runs", () => {
  const sw = read("sw.js");
  assert.match(sw, /const refresh = fetchWithTimeout\(request, CATALOGUE_TIMEOUT_MS\)/);
  assert.match(sw, /event.waitUntil\(refresh\.then/);
  assert.match(sw, /const cached = await caches.match\(request\)/);
});

test("offline app assets keep versioned cache keys and navigation fallback is query tolerant", () => {
  const sw = read("sw.js");
  assert.match(sw, /request\.mode === "navigate"\)\);/);
  assert.match(sw, /typeof AbortController === "undefined"/);
  assert.match(sw, /return cached \|\| response/);
});

test("EduBot lazy loading coalesces concurrent submits and can retry focus after failure", () => {
  const loader = read("edubot-loader.js");
  assert.match(loader, /let submissionPending = false/);
  assert.match(loader, /if \(submissionPending\) return/);
  assert.doesNotMatch(loader, /\{ once: true \}/);
});

test("service-worker precache includes exact versioned CSS keys used by the homepage and login", () => {
  const sw = read("sw.js");
  for (const asset of ["style.css?v=study-hub-layout-1", "design-polish.css?v=20261026-1", "luxury-theme.css?v=3", "academic-library.css?v=5"]) {
    assert.ok(sw.includes(asset), `APP_SHELL must precache ${asset}`);
  }
});

test("visible logo assets are optimised and PWA icons use the correct dimensions", () => {
  for (const name of ["icseYtLogo.webp", "icseYtFavicon.png", "icseYtPwa-192.png", "icseYtPwa-512.png"]) assert.ok(existsSync(join(root, name)), `${name} must exist`);
  assert.ok(statSync(join(root, "icseYtLogo.webp")).size < 100_000, "visible WebP logo must stay below 100 KB");
  const manifest = JSON.parse(read("manifest.json"));
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ["192x192", "512x512"]);
  assert.ok(read("index.html").includes('src="icseYtLogo.webp"'));
  assert.ok(read("login.html").includes('src="icseYtLogo.webp"'));
  assert.ok(read("dashboard.html").includes('src="icseYtLogo.webp"'));
});


test("the public materials catalogue opens without a forced login redirect", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /window\.location\.replace\(redirect\)/);
  assert.doesNotMatch(html, /login\.html\?entry=1/);
  assert.match(html, /href=[\"']\.\/login\.html[\"']/);
});

test("the homepage is a material-first index with search before subject browsing", () => {
  const html = read("index.html");
  const discovery = html.indexOf('class="library-discovery"');
  const search = html.indexOf('id="globalSearchWrap"');
  const subjects = html.indexOf('id="mainSubjectGrid"');
  assert.ok(discovery >= 0, "a direct library heading should be present");
  assert.ok(search > discovery && search < subjects, "global search must precede subject browsing");
  assert.match(html, /Find the right study material/);
  assert.doesNotMatch(html, /aurora-welcome|aurora-quick-dock|study-hub-nav|study-hub-notice|study-hub-tools|lux-proof/);
});

test("Telegram, feedback and appearance controls are secondary to material discovery", () => {
  const html = read("index.html");
  const header = html.match(/<header class="sticky[\s\S]*?<\/header>/)?.[0] || "";
  assert.doesNotMatch(header, /t\.me\/|Feedback|settingsToggle/);
  assert.match(html, /toggleSettings\(true\)/, "settings remain available from the navigation drawer");
  assert.match(html, /https:\/\/t\.me\/ICSEMasterClass10/, "the Telegram link remains available outside the header");
});

test("the unused portal URL redirects to the real catalogue and contains no demo resources", () => {
  const portal = read("portal.html");
  assert.match(portal, /location\.replace\([\"']\.\/[\"']\)/);
  assert.doesNotMatch(portal, /sample practice card|Sample question to demonstrate|Planned feature|Add a real resource link/i);
});

test("invalid or missing shared-material URLs cannot navigate to a hash placeholder", () => {
  const html = read("index.html");
  const script = read("script.js");
  assert.doesNotMatch(html, /href=[\"']#[\"']/);
  assert.doesNotMatch(script, /openButton\.href\s*=\s*[\"']#[\"']/);
  assert.match(script, /openButton\.removeAttribute\([\"']href[\"']\)/);
});

test("the published Google Sheets source remains unchanged and read-only", () => {
  const script = read("script.js");
  assert.match(script, /const primaryCsvUrl =\s*[\"']https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/2PACX-1vQLGKfaC9WUePvCArs7YAxYP9tmoPYkCdfJviR2pdOnlSZ6gVLEqgtAEga4XLQpubVTfEsHo2eWBWx7\/pub\?output=csv[\"']/);
  assert.doesNotMatch(script, /spreadsheets\.googleapis\.com[\s\S]{0,300}(?:POST|PUT|PATCH|DELETE)/i);
});

test("local page links and fragment targets resolve within the repository", () => {
  const pages = ["index.html", "login.html", "dashboard.html", "admin-1.html", "portal.html", "404.html", "privacy-policy.html", "terms-and-conditions.html", "cookie-policy.html", "refund-policy.html", "faq.html", "blog/index.html", "blog/icse-class-10-date-sheet-2027.html", "blog/icse-class-10-study-plan.html", "blog/how-to-use-icse-masterclass-study-vault.html"];
  for (const page of pages) {
    const html = read(page);
    const ids = new Set([...html.matchAll(/\bid=[\"']([^\"']+)[\"']/g)].map(match => match[1]));
    for (const match of html.matchAll(/\b(href|src|action)=[\"']([^\"']+)[\"']/g)) {
      const value = match[2];
      if (/^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(value)) continue;
      if (value === "#") assert.fail(`${page} contains an inert hash-only link`);
      if (value.startsWith("#")) {
        assert.ok(ids.has(value.slice(1)), `${page} has no target for ${value}`);
        continue;
      }
      const pathname = new URL(value, `https://study-vault.test/${page}`).pathname.replace(/^\//, "");
      if (!pathname || pathname.endsWith("/")) continue;
      assert.ok(existsSync(join(root, pathname)), `${page} references missing local path ${value}`);
    }
  }
});


test("material result rows preserve preview, open, save and share actions", () => {
  const script = read("script.js");
  assert.match(script, /class="mc-material-row"/);
  for (const selector of ["js-toggle-save", "js-open-share-page", "js-share-material", "openMaterialModalByIndex"]) {
    assert.ok(script.includes(selector), `${selector} must remain available`);
  }
  assert.match(read("academic-library.css"), /#resourceGrid \.mc-material-row/);
  assert.doesNotMatch(script, /subjectEmoji|📚|📘/);
});

test("the first-screen Telegram invitation and floating CTA are removed", () => {
  const html = read("index.html");
  const script = read("script.js");
  assert.doesNotMatch(html, /welcomePopup|telegramInviteJoin|Join Group/);
  assert.doesNotMatch(script, /checkWelcomePopup|TELEGRAM_INVITE_KEY/);
  assert.doesNotMatch(read("design-polish.css"), /#welcomePopup/);
});


test("the service worker invalidates the previous app shell and precaches the new library styles", () => {
  const sw = read("sw.js");
  assert.match(sw, /icse-masterclass-v1\.16\.0-edubot-api/);
  assert.ok(sw.includes("./src/inkbleed.js"), "APP_SHELL must precache the ink theme module");
  assert.match(sw, /academic-library\.css\?v=5/);
});

test("subject and search navigation hide and restore the discovery header correctly", () => {
  const script = read("script.js");
  assert.match(script, /discovery\?\.classList\.add\(\"hidden\"\)/);
  assert.match(script, /discovery\?\.classList\.remove\(\"hidden\"\)/);
  assert.doesNotMatch(script, /renderLatestMaterials|No 2027 resources are tagged/);
});

test("PWA installation is available from the secondary navigation, not the header", () => {
  const html = read("index.html");
  const header = html.match(/<header class="sticky[\s\S]*?<\/header>/)?.[0] || "";
  const nav = html.match(/<nav class="site-nav-links"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.doesNotMatch(header, /pwaInstallBtn/);
  assert.match(nav, /id="pwaInstallBtn"/);
});


test("copyright, non-affiliation and takedown information are visible by default and remain collapsible", () => {
  const html = read("index.html");
  assert.match(html, /<details class="library-legal" open>/);
  assert.match(html, /not affiliated with, authorised by or endorsed by the Council/);
  assert.match(html, /Third-party materials, publications, book covers and trademarks remain the property/);
  assert.match(html, /mailto:icsemasterclass@gmail.com/);
  assert.doesNotMatch(html, /October 2026|settings-version-badge/);
});



test("subject directory uses accessible subject-specific vector illustrations", () => {
  const script = read("script.js");
  const css = read("academic-library.css");
  assert.ok(script.includes("function getSubjectIllustration(subject)"));
  assert.ok(script.includes("mc-subject-art"));
  assert.ok(script.includes('aria-label="Open ${escapeHTML(subject)} subject materials"'));
  assert.ok(css.includes("#mainSubjectGrid .mc-subject-art"));
  assert.ok(css.includes("repeat(2,minmax(0,1fr))"));
  assert.ok(css.includes("focus-visible"));
  assert.ok(css.includes("prefers-reduced-motion"));
});

test("homepage discovery has clear student-facing search guidance", () => {
  const html = read("index.html");
  assert.match(html, /Find the right study material/);
  assert.match(html, /class="library-intro"/);
  assert.match(html, /class="library-search-hint"/);
  assert.match(html, /role="group" aria-label="Filter resources by category"/);
});

test("mobile subject cards retain their vector illustrations at narrow widths", () => {
  const css = read("academic-library.css");
  assert.match(css, /min-height:164px !important/);
  assert.match(css, /mc-subject-illustration \{ min-height:82px/);
});

test("file size is shown only when the published row includes file-size metadata", () => {
  const script = read("script.js");
  assert.match(script, /const fileSize = String\(item\["File Size"\] \|\| ""\)\.trim\(\)/);
  assert.match(script, /fileSize \? `<span class="mc-material-size">/);
});

test("all active stylesheets have balanced rule braces", () => {
  for (const file of ["style.css", "ui-ux.css", "design-polish.css", "luxury-theme.css", "academic-library.css"]) {
    const css = read(file);
    assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, `${file} must have balanced braces`);
  }
});

test("public pages do not contain duplicate element IDs", () => {
  for (const page of ["index.html", "login.html", "dashboard.html", "admin-1.html", "portal.html", "404.html", "privacy-policy.html", "terms-and-conditions.html", "cookie-policy.html", "refund-policy.html"]) {
    const ids = [...read(page).matchAll(/\bid=[\"']([^\"']+)[\"']/g)].map(match => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual([...new Set(duplicates)], [], `${page} must not repeat IDs`);
  }
});


test("material rows do not invent generic titles, subjects or categories when source metadata is blank", () => {
  const script = read("script.js");
  assert.doesNotMatch(script, /item\[\"Book Name\"\] \|\| \"Resource File\"/);
  assert.doesNotMatch(script, /item\[\"Category\"\] \|\| \"General\"/);
  assert.match(script, /category \? `\<span/);
});


test("privacy and terms pages are linked from the homepage, login and dashboard", () => {
  for (const page of ["index.html", "login.html", "dashboard.html"]) {
    const html = read(page);
    assert.match(html, /href=["']privacy-policy\.html["']/i, `${page} must link to the privacy policy`);
    assert.match(html, /href=["']terms-and-conditions\.html["']/i, `${page} must link to the terms`);
  }
  for (const page of ["privacy-policy.html", "terms-and-conditions.html", "cookie-policy.html", "refund-policy.html"]) {
    assert.ok(existsSync(join(root, page)), `${page} must exist`);
    const html = read(page);
    assert.match(html, /Team MasterClass/);
    assert.match(html, /icsemasterclass@gmail\.com/);
    assert.match(html, /icseYtFavicon\.png/);
    assert.match(html, /Back to Study Vault/);
  }
  assert.doesNotMatch(read("login.html"), /8,000\+/);
  const privacy = read("privacy-policy.html");
  assert.match(privacy, /Firebase Authentication/);
  assert.match(privacy, /Google Gemini/);
  assert.match(privacy, /localStorage/);
  assert.match(privacy, /does not include built-in age verification/i);
});


test("About and copyright panel uses the compact navy reference design", () => {
 const html=read("index.html"); const css=read("academic-library.css");
 assert.match(html,/academic-library\.css\?v=5/);
 assert.match(html,/<details class="library-legal" open>/);
 assert.match(html,/Extensive Subject Support/); assert.match(html,/Curated Resource Formats/);
 assert.match(html,/Resource Index, Copyright and Disclaimer/);
 assert.match(css,/About \/ copyright panel — match the compact navy reference layout/);
 assert.match(css,/#080e1b/); assert.match(css,/#15151b/);
});

test("About email support provides copy and Gmail compose actions", () => {
 const html=read("index.html"); const css=read("academic-library.css"); const script=read("script.js"); const sw=read("sw.js");
 assert.match(html,/id="emailText"[^>]*>icsemasterclass@gmail\.com/);
 assert.match(html,/id="copyEmailBtn"/);
 assert.match(html,/id="copyEmailStatus"[^>]*aria-live="polite"/);
 assert.match(html,/mail\.google\.com\/mail\/\?view=cm&amp;fs=1&amp;to=icsemasterclass%40gmail\.com/);
 assert.match(html,/academic-library\.css\?v=5/);
 assert.match(css,/Email support actions/);
 assert.match(css,/\.copy-button\.success/);
 assert.match(script,/navigator\.clipboard\.writeText/);
 assert.match(script,/copyTextFallback/);
 assert.match(script,/Email address copied\./);
 assert.match(sw,/icse-masterclass-v1\.16\.0-edubot-api/);
});

test("offline app shell caches the legal pages and invalidates the old cache", () => {
  const sw = read("sw.js");
    assert.match(sw, /icse-masterclass-v1\.16\.0-edubot-api/);
  assert.match(sw, /privacy-policy\.html/);
  assert.match(sw, /terms-and-conditions\.html/);
});


test("CI uses supported Node 24 actions and a pinned Ubuntu runner", () => {
  const workflow = read(".github/workflows/site-smoke.yml");
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /actions\/checkout@v7/);
  assert.match(workflow, /actions\/setup-node@v7/);
  assert.match(workflow, /node-version: 24/);
});
test("ink theme initializes after the site's saved appearance settings", () => {
  const html = read("index.html");
  const script = read("script.js");
  const modulePosition = html.indexOf('import { createInkTheme }');
  const appScriptPosition = html.indexOf('<script src="script.js"></script>');
  assert.ok(modulePosition >= 0 && appScriptPosition > modulePosition);
  assert.ok(html.includes('document.addEventListener("DOMContentLoaded", initialiseInkTheme, { once: true });'));
  assert.ok(script.includes('document.addEventListener("DOMContentLoaded", startApp)'));
  assert.ok(!html.includes('document.readyState === "loading"'));
});


test("editorial pages expose canonical metadata, answer content and structured data", () => {
  const blog = read("blog/index.html");
  const faq = read("faq.html");
  for (const page of ["blog/icse-class-10-date-sheet-2027.html", "blog/icse-class-10-study-plan.html", "blog/how-to-use-icse-masterclass-study-vault.html"]) {
    const html = read(page);
    assert.ok(html.includes("<title>") && html.includes("</title>"), page + " must have a title");
    assert.ok(html.includes('rel="canonical"'), page + " must have a canonical URL");
    assert.ok(html.includes("application/ld+json"), page + " must have structured data");
    assert.ok(html.includes("datePublished"), page + " must expose a publication date");
    assert.ok(html.includes("Team MasterClass"), page + " must identify the publisher");
  }
  assert.ok(blog.includes('"@type":"Blog"'));
  assert.ok(faq.includes('"@type":"FAQPage"'));
  assert.ok(faq.includes("Is ICSE MasterClass an official CISCE website"));
  assert.ok(read("llms.txt").toLowerCase().includes("not affiliated with, authorised by or endorsed by cisce"));
  assert.ok(read("seo/keyword-map.md").includes("Search-volume figures are intentionally omitted"));
});
test("homepage links to blog and FAQs without removing protected copyright content", () => {
  const html = read("index.html");
  assert.ok(html.includes('href="./blog/"'));
  assert.ok(html.includes('href="./faq.html"'));
  assert.ok(html.includes("Resource Index, Copyright and Disclaimer"));
  assert.ok(html.includes("not affiliated with, authorised by or endorsed by the Council"));
});
test("sitemap and service worker include the new editorial pages", () => {
  const sitemap = read("sitemap.xml");
  for (const path of ["blog/","faq.html","blog/icse-class-10-date-sheet-2027.html","blog/icse-class-10-study-plan.html","blog/how-to-use-icse-masterclass-study-vault.html"]) assert.ok(sitemap.includes(path));
  const sw = read("sw.js");
  assert.ok(sw.includes("icse-masterclass-v1.16.0-edubot-api"));
  assert.ok(sw.includes("./blog/blog.css"));
  assert.ok(sw.includes("./faq.html"));
});


test("AI crawler policy permits search agents and blocks training crawlers", () => {
  const robots = read("robots.txt");
  const groups = robots.split(/\n\s*\n/);
  const groupFor = agent => groups.find(group => group.split(/\r?\n/).some(line => line.trim() === `User-agent: ${agent}`)) || "";
  assert.ok(groupFor("*").includes("Disallow: /"));
  for (const agent of ["Googlebot", "Bingbot", "Applebot", "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot"]) {
    assert.ok(groupFor(agent).includes("Allow: /"), `${agent} must remain discoverable`);
  }
  for (const agent of ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider", "meta-externalagent"]) {
    assert.ok(groupFor(agent).includes("Disallow: /"), `${agent} must be blocked`);
  }
  assert.ok(robots.includes("https://icse-cbse-10-12.github.io/icse-class-10-materials/sitemap.xml"));
});

test("dashboard links to the current official ICSE 2027 syllabus page", () => {
  const dashboard = read("dashboard.html");
  assert.ok(dashboard.includes("https://cisce.org/icse-regulations-and-syllabuses-2027/"));
  assert.ok(dashboard.includes("Official ICSE 2027 regulations and syllabus"));
  assert.ok(!dashboard.includes("0.1-ICSE-Contents2.pdf"));
});

test("EduBot API integration keeps the optional-service consent gate", () => {
  const loader = read("edubot-loader.js");
  const client = read("gemini-ai.js");
  assert.ok(loader.includes('window.ICSEConsent && window.ICSEConsent.has("externalServices") === true'));
  assert.ok(loader.includes('import("./gemini-ai.js?v=3")'));
  assert.ok(client.includes("https://edubot-nu-wheat.vercel.app/api/chat"));
  assert.ok(read("index.html").includes("up to 10 messages, including your questions and EduBot replies"));
  assert.ok(read("privacy-policy.html").includes("EduBot API hosted on Vercel"));
});


test("external resource links show a clear source notice and generic open action", () => {
  const script = read("script.js");
  assert.ok(script.includes("External resource"));
  assert.ok(script.includes("This resource is hosted on an external website."));
  assert.ok(script.includes("Open Resource"));
  assert.ok(!script.includes("Open Drive Link"));
});


test("latest edition links are not duplicated when they match the primary resource", () => {
  const script = read("script.js");
  assert.ok(script.includes("latestEdLinkIsDistinct"));
  assert.ok(script.includes("View Latest Edition"));
  assert.ok(!script.includes("Get Latest Edition Book"));
});


test("generated catalogue JSON revalidates online and keeps an offline cache fallback", () => {
  const sw = read("sw.js");
  const script = read("script.js");
  assert.match(sw, /const catalogueData = sameOrigin && url\.pathname\.endsWith\("\/catalog-data\.json"\);/);
  assert.match(sw, /request\.mode === "navigate" \|\| appCode \|\| catalogueData/);
  assert.match(sw, /event\.respondWith\(networkFirst\(request,/);
  assert.match(sw, /const cached = await caches\.match\(request/);
  assert.match(script, /fetch\("\.\/catalog-data\.json", \{ cache: "no-cache" \}\)/);
});
