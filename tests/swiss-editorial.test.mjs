import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderCard } from "../scripts/build-catalog.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("catalogue cards clean filenames, collapse broad subject lists and omit unknown sizes", () => {
  const card = renderCard({
    "Book Name": "CHEMISTRY_most_likely_ICSE_question_Bank.PDF",
    Subject: "Physics, Chemistry, Biology, Mathematics",
    Category: "Question Banks",
    Format: "PDF"
  });
  assert.match(card, /CHEMISTRY most likely ICSE question Bank/);
  assert.doesNotMatch(card, /\.PDF|CHEMISTRY_most_likely/);
  assert.match(card, /All Subjects \(13\)/);
  assert.doesNotMatch(card, /Size not listed/);
});

test("homepage places the subject directory directly after hero search and legal copy near the footer", () => {
  const html = read("../index.html");
  const search = html.indexOf('id="globalSearchInput"');
  const subject = html.indexOf('id="mainLandingView"');
  const status = html.indexOf('id="statusMessage"');
  const legal = html.indexOf('id="study-vault-guide"');
  const footer = html.indexOf("<footer");
  assert.ok(search >= 0 && subject > search && status > subject);
  assert.ok(legal > subject && legal < footer);
  assert.match(html, /id="savedMaterialCount" hidden/);
  assert.match(html, /swiss-editorial\.css\?v=1/);
  const cards = html.split("<!-- CATALOG_CARDS_START -->")[1].split("<!-- CATALOG_CARDS_END -->")[0];
  assert.equal((cards.match(/mc-prerendered-row/g) || []).length, 12);
  assert.doesNotMatch(cards, /Size not listed|<h3>[^<]*_[^<]*<\/h3>/);
  assert.match(html, /A listing does not grant permission to copy or redistribute a file/);
  assert.ok(html.indexOf('id="offlineNotice"') > html.indexOf('id="mainLandingView"'));
});

test("mobile resource rendering starts with 12 cards and search uses a 250ms debounce", () => {
  const js = read("../script.js");
  assert.match(js, /max-width:\s*767px[\s\S]{0,80}\?\s*12\s*:\s*RESOURCE_PAGE_SIZE/);
  assert.match(read("../scripts/build-catalog.mjs"), /resources\.slice\(0, 12\)/);
  assert.match(js, /},\s*250\);/);
  assert.match(js, /visibleResourceCount = getInitialResourcePageSize\(\)/);
  assert.match(js, /visibleResourceCount \+ getResourcePageIncrement\(\)/);
});

test("runtime card labels clean titles, compact broad subjects and omit missing file sizes", () => {
  const js = read("../script.js");
  assert.match(js, /replace\(\/\\\.\(\?:pdf\|docx\?\)\$\/i/);
  assert.match(js, /All Subjects \(13\)/);
  assert.doesNotMatch(js, /Size not listed/);
  assert.match(js, /savedCount\.hidden = count === 0/);
});

test("Swiss editorial styling preserves light, dark and midnight palettes with dark text on orange", () => {
  const css = read("../swiss-editorial.css");
  assert.match(css, /--swiss-accent:#FF4F00/);
  assert.match(css, /data-site-mode="dark"/);
  assert.match(css, /data-site-mode="midnight"/);
  assert.match(css, /color:#141414!important/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("PWA hides install UI in standalone mode and keeps offline state event-driven", () => {
  const pwa = read("../pwa.js");
  const js = read("../script.js");
  assert.match(pwa, /isStandalone\(\) && installCard/);
  assert.match(pwa, /window\.addEventListener\("online"/);
  assert.match(pwa, /window\.addEventListener\("offline"/);
  assert.match(js, /if \(standalone\) return/);
});

