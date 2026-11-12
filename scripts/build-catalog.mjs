import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLGKfaC9WUePvCArs7YAxYP9tmoPYkCdfJviR2pdOnlSZ6gVLEqgtAEga4XLQpubVTfEsHo2eWBWx7/pub?output=csv";
export const SITE_URL = "https://icse-cbse-10-12.github.io/icse-class-10-materials/";

export function parseCSV(input) {
  const source = String(input ?? "").replace(/^\uFEFF/, "");
  if (!source.trim()) return [];
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim()); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(value => value !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows.shift().map(value => value.trim());
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? "").trim()])))
    .filter(item => item["Book Name"] || item.Subject);
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const clean = value => String(value ?? "").trim();

function safeUrl(value) {
  const raw = clean(value);
  if (!raw || raw === "#" || /^(?:n\/a|na|none|null|undefined)$/i.test(raw)) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ["https:", "http:"].includes(url.protocol) && url.hostname.includes(".") && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

function resourceUrl(item) {
  return safeUrl(item["Google Drive Link"] || item["Google Drive Direct View / Download Link"] || item.Link || "");
}

function materialKey(item) {
  const shareId = clean(item["Share ID"]);
  if (shareId) return `share:${shareId}`;
  return [item["Book Name"], item.Subject, item.Category, item.Edition].map(value => clean(value).toLowerCase()).join("|");
}

function renderCard(item) {
  const title = clean(item["Book Name"] || item.Subject || "Study material");
  const subject = clean(item.Subject);
  const category = clean(item.Category);
  const edition = clean(item.Edition);
  const publisher = clean(item["Publisher/Company"] || item.Publisher);
  const scope = clean(item.Scope);
  const size = clean(item["File Size"]) || "Size not listed";
  const format = clean(item.Format) || "PDF";
  const url = resourceUrl(item);
  let source = "Link unavailable";
  try { source = url && new URL(url).hostname.toLowerCase().endsWith("drive.google.com") ? "Direct Drive" : url ? "External source" : source; } catch { /* keep safe fallback */ }
  const meta = [subject, category, edition && edition !== "Not Specified" ? `Ed. ${edition}` : "", publisher]
    .filter(Boolean).map(value => `<span class="mc-material-meta-chip">${esc(value)}</span>`).join("");
  const action = url
    ? `<a class="mc-material-action mc-material-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>Open PDF</span></a>`
    : `<span class="mc-material-action is-disabled" aria-disabled="true">Link unavailable</span>`;
  return `<article class="mc-material-row mc-prerendered-row"><div class="mc-material-main"><div class="mc-material-meta">${meta}</div><h3>${esc(title)}</h3>${scope ? `<p class="mc-material-scope">${esc(scope)}</p>` : ""}<div class="mc-material-file-badges"><span class="mc-material-file-badge">${esc(format)}</span><span class="mc-material-file-badge">${esc(size)}</span><span class="mc-material-file-badge">${esc(source)}</span></div></div><div class="mc-material-actions">${action}<button type="button" class="mc-material-action js-toggle-save" data-material-key="${esc(materialKey(item))}" aria-pressed="false" aria-label="Save material: ${esc(title)}"><span>Save</span></button></div></article>`;
}

const CATALOG_FIELDS = [
  "Book Name", "Subject", "Category", "Scope", "Publisher/Company", "Publisher",
  "Format", "File Size", "Google Drive Link", "Google Drive Direct View / Download Link",
  "Link", "Lecture Link", "Telegram Channel Post Link", "Edition",
  "Latest Edition Available?", "Latest Edition Link", "Share ID"
];

function schemaFor(resources, modified, totalCount) {
  const learningResources = resources.map((item, index) => {
      const resource = {
        "@type": "LearningResource",
        "@id": `${SITE_URL}#learning-resource-${index + 1}`,
        "name": clean(item["Book Name"] || item.Subject || "Study material"),
        "educationalLevel": "ICSE Class 10",
        "learningResourceType": clean(item.Category || item.Format || "Study material"),
        "dateModified": modified,
        "isPartOf": { "@type": "WebSite", "name": "ICSE MasterClass Study Vault", "url": SITE_URL }
      };
      if (clean(item.Subject)) resource.about = clean(item.Subject).split(/[,;|]+/).map(value => value.trim()).filter(Boolean);
      if (clean(item.Scope)) resource.description = clean(item.Scope);
      const url = resourceUrl(item);
      if (url) resource.url = url;
      return resource;
    });
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ItemList", "name": "ICSE Class 10 Study Materials", "numberOfItems": totalCount, "itemListElement": learningResources.map((item, index) => ({ "@type": "ListItem", "position": index + 1, "item": { "@id": item["@id"] } })) },
      ...learningResources
    ]
  };
}

function replaceMarkedBlock(html, start, end, content) {
  const pattern = new RegExp(`(${start})[\\s\\S]*?(${end})`);
  if (!pattern.test(html)) throw new Error(`Missing required HTML markers: ${start} / ${end}`);
  return html.replace(pattern, (_, startMarker, endMarker) => `${startMarker}\n${content}\n${endMarker}`);
}

export async function buildCatalog({ root = resolve(fileURLToPath(new URL("..", import.meta.url))), csvText, now = new Date() } = {}) {
  if (typeof csvText !== "string") throw new TypeError("buildCatalog requires csvText.");
  const resources = parseCSV(csvText);
  if (!resources.length) throw new Error("The Google Sheet returned no material rows; refusing to erase the existing prerendered catalogue.");
  const required = ["Book Name", "Subject"];
  if (!required.every(header => Object.hasOwn(resources[0], header))) throw new Error("The published CSV is missing the expected Book Name and Subject columns.");

  const modified = now.toISOString().slice(0, 10);
  const indexPath = resolve(root, "index.html");
  const catalogPayload = {
    fields: CATALOG_FIELDS,
    rows: resources.map(item => CATALOG_FIELDS.map(key => clean(item[key])))
  };
  const catalogJson = JSON.stringify(catalogPayload);
  const catalogJsonPath = resolve(root, "catalog-data.json");
  await writeFile(catalogJsonPath, catalogJson);
  let html = await readFile(indexPath, "utf8");
  const firstPage = resources.slice(0, 36);
  html = replaceMarkedBlock(html, "<!-- CATALOG_CARDS_START -->", "<!-- CATALOG_CARDS_END -->", firstPage.map(renderCard).join("\n"));
  const safeJson = value => JSON.stringify(value).replace(/</g, "\\u003c");
  html = replaceMarkedBlock(html, "<!-- CATALOG_DATA_START -->", "<!-- CATALOG_DATA_END -->", '<link rel="preload" href="./catalog-data.json" as="fetch" crossorigin>');
  html = replaceMarkedBlock(html, "<!-- CATALOG_SCHEMA_START -->", "<!-- CATALOG_SCHEMA_END -->", `<script type="application/ld+json" id="catalog-learning-resources">${safeJson(schemaFor(firstPage, modified, resources.length))}</script>`);
  html = html.replace(/(<p id="itemCount"[^>]*>)[\s\S]*?(<\/p>)/, `$1${resources.length.toLocaleString("en-IN")} Materials Found$2`);
  html = html.replace(/<span>Loading the materials catalogue…<\/span>/, `<span>${resources.length.toLocaleString("en-IN")} materials are ready to browse.</span>`);
  await writeFile(indexPath, html);

  const sitemapPath = resolve(root, "sitemap.xml");
  let sitemap = await readFile(sitemapPath, "utf8");
  sitemap = sitemap.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g, `<lastmod>${modified}</lastmod>`);
  await writeFile(sitemapPath, sitemap);
  return { count: resources.length, prerendered: firstPage.length, modified, jsonBytes: Buffer.byteLength(catalogJson) };
}

async function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const csvFile = process.env.CATALOG_CSV_FILE;
  let csvText;
  if (csvFile) csvText = await readFile(resolve(csvFile), "utf8");
  else {
    const response = await fetch(process.env.CATALOG_CSV_URL || DEFAULT_CSV_URL, { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "ICSE-MasterClass-Catalog-Build/1.0" } });
    if (!response.ok) throw new Error(`Google Sheets CSV request failed (${response.status}).`);
    csvText = await response.text();
  }
  const result = await buildCatalog({ root, csvText });
  console.log(`Cached ${result.count.toLocaleString("en-IN")} materials in catalog-data.json; pre-rendered ${result.prerendered} cards and LearningResource entries; sitemap updated (${result.modified}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error("Catalog build failed:", error); process.exitCode = 1; });
}
