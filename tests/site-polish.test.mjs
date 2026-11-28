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
  assert.ok(script.includes('item?.["Publisher/Company"] || item?.["Publisher"]'));
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
  for (const page of pages) assert.match(read(page), /site-polish\.css(?:\?v=\d+)?/, page);
  assert.ok(read("index.html").includes("site-polish.css?v=2"));
});

test("shared vh¬