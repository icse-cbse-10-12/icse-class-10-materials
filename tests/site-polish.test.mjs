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
  assert.match(html, /id="publisherFilter"/);
  assert.match(html, /onchange="setPublisherFilter\\(this\\.value\\)"/);
  assert.match(script, /function getMaterialPublisher\\(item\\)/);
  assert.match(script, /item\\?\\.\\["Publisher\\/Company"\\] \\|\\| item\\?\\.\\["Publisher"\\]/);
  assert.match(script, /function populatePublisherFilter\\(\\)/);
  assert.match(script, /function setPublisherFilter\\(value\\)/);
  assert.match(script, /publisherMatch/);
  assert.match(script, /yearMatch && publisherMatch && personalMatch/);
  assert.doesNotMatch(script, /Oswaal|Educart|Arihant|NODIA|Goyal Brothers/i);
});

test("publisher and year refinements remain independent and the source catalogue stays read-only", () => {
  const html = read("index.html");
  const script = read("script.js");
  assert.match(html, /id="yearFilter"/);
  assert.match(html, /id="publisherFilter"/);
  assert.match(script, /const selectedYear = document\\.getElementById\\("yearFilter"\\)/);
  assert.match(script, /const selectedPublisher = normalizePublisherValue/);
  assert.match(script, /const publisherMatch = selectedPublisher === "all"/);
  assert.match(script, /const primaryCsvUrl =/);
  assert.doesNotMatch(script, /spreadsheets\\.googleapis\\.com[\\s\\S]{0,300}(?:POST|PUT|PATCH|DELETE)/i);
});

test("the shared design layer is loaded on every public page with a rendered interface", () => {
  const pages = ["index.html","login.html","dashboard.html","admin-1.html","faq.html","privacy-policy.html","cookie-policy.html","terms-and-conditions.html","refund-policy.html","404.html","blog/index.html","blog/how-to-use-icse-masterclass-study-vault.html","blog/icse-class-10-date-sheet-2027.html","blog/icse-class-10-study-plan.html"];
  for (const page of pages) assert.match(read(page), /site-polish\\.css\\?v=1/, page);
});

test("shared visual tokens preserve Paper Light and avoid costly visual effects", () => {
  const css = read("site-polish.css");
  assert.match(css, /--site-paper:\\s*#FAF9F6/i);
  assert.match(css, /--site-surface:\\s*#FFFFFF/i);
  assert.match(css, /--site-ink:\\s*#1E293B/i);
  assert.match(css, /--site-primary:\\s*#1D4ED8/i);
  assert.match(css, /min-height:\\s*48px/);
  assert.doesNotMatch(css, /mix-blend-mode\\s*:\\s*difference|backdrop-filter\\s*:\\s*blur|linear-gradient|radial-gradient/i);
});

test("404 page uses local system fonts and no remote Tailwind or Google Fonts", () => {
  const html = read("404.html");
  assert.match(html, /class="mc-not-found"/);
  assert.doesNotMatch(html, /cdn\\.tailwindcss\\.com|fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/);
});

test("service worker precaches the shared visual layer under a fresh cache version", () => {
  const sw = read("sw.js");
  assert.match(sw, /icse-masterclass-v1\\.17\\.0-site-polish/);
  assert.match(sw, /\\.\\/site-polish\\.css\\?v=1/);
});

test("protected copyright and non-affiliation copy remains present", () => {
  const html = read("index.html");
  assert.match(html, /About ICSE MasterClass Study Vault/);
  assert.match(html, /Resource Index, Copyright and Disclaimer/);
  assert.match(html, /not affiliated with, authorised by or endorsed by the Council for the Indian School Certificate Examinations \\(CISCE\\)/);
  assert.match(html, /Original authors, publishers and rights holders retain their respective rights/);
  assert.match(html, /icsemasterclass@gmail\\.com/);
});