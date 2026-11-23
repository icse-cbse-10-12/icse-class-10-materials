import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderCard } from "../scripts/build-catalog.mjs";
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("display titles repair known typos, title-case uppercase filename tokens and remove copy suffixes", () => {
  const title = value => renderCard({ "Book Name": value, Subject: "Chemistry", Format: "PDF" }).match(/<h3>(.*?)<\/h3>/)?.[1];
  assert.equal(title("Vastal Chemistry Handbook (2024).pdf"), "Vatsal Chemistry Handbook (2024)");
  assert.equal(title("QUEST-BOOK-ICSE-10-Chemistry.pdf"), "Quest Book ICSE 10 Chemistry");
  assert.equal(title("Arihant Chemistry 2022-2000 (1).pdf"), "Arihant Chemistry 2022-2000");
  assert.equal(title("Arihant Chemistry 2022-2000 (2).pdf"), "Arihant Chemistry 2022-2000");
});

test("hidden UI state is authoritative for PWA notices, saved count and the material viewer", () => {
  const html = read("index.html"), css = read("swiss-editorial.css"), js = read("script.js"), pwa = read("pwa.js");
  assert.match(html, /id="offlineNotice"[^>]*hidden/);
  assert.match(html, /id="pwaIosInstallGuide"[^>]*hidden/);
  assert.match(html, /id="savedMaterialCount" hidden/);
  assert.match(html, /id="detailView"[\s\S]*?\bhidden\b/);
  assert.match(css, /body\.mc-home \[hidden\]\s*\{\s*display:none!important/);
  assert.match(css, /#pwaIosInstallGuide:not\(\[open\]\)\s*>\s*:not\(summary\)/);
  assert.match(pwa, /offlineNotice\.hidden = navigator\.onLine/);
  assert.match(pwa, /isStandalone\(\).*installCard\.hidden = true/s);
  assert.match(pwa, /isAppleMobileSafari/);
  assert.match(pwa, /navigator\.onLine !== false/);
  assert.match(html, /<h3>Vatsal Chemistry Handbook \(2024\)<\/h3>/);
  assert.match(html, /<h3>Quest Book ICSE 10 Chemistry<\/h3>/);
  assert.match(js, /detailView.*removeAttribute\(\"hidden\"\)/s);
  assert.match(js, /detailView.*setAttribute\(\"hidden\"/s);
});

test("EduBot privacy notice remains readable before acknowledgement and collapses after checking", () => {
  const html = read("index.html"), loader = read("edubot-loader.js");
  assert.match(html, /<details id="edubotPrivacyNotice"[^>]*open/);
  assert.match(html, /<summary id="edubotPrivacySummary">Privacy &amp; AI notice/);
  assert.ok(html.includes("recent conversation context (up to 10 messages, including your questions and EduBot replies)"));
  assert.ok(html.includes("This acknowledgement is not parental consent."));
  assert.match(html, /id="edubotDataAcknowledgement"[^>]*required/);
  assert.match(loader, /edubotDataAcknowledgement/);
  assert.match(loader, /privacyNotice\.open = !acknowledgement\.checked/);
});

test("shared material routes accept both legacy material and id query parameters", () => {
  const js = read("script.js");
  assert.match(js, /queryParams\.get\(\"material\"\)\s*\|\|\s*queryParams\.get\(\"id\"\)/);
  assert.match(js, /function showSharedMaterialPage/);
});
