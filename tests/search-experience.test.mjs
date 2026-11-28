import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../study-desk.css", import.meta.url), "utf8");
const block = script.match(/\/\* SEARCH INDEX START \*\/([\s\S]*?)\/\* SEARCH INDEX END \*\//);
assert.ok(block, "search helper block must exist");
const context = {};
vm.runInNewContext(block[1] + "\nglobalThis.searchApi = { normalizeSearchText, prepareMaterialSearchIndex, getSearchTokenGroups, matchesMaterialSearch, getMaterialSearchScore, isMaterialSearchQueryReady };", context);
const api = context.searchApi;

test("catalogue indexing precomputes normalized title, blob, subject, publisher and year", () => {
  const [item] = api.prepareMaterialSearchIndex([{
    "Book Name": "Chemistry_Handbook.PDF",
    "Subject": "Chemistry",
    "Publisher/Company": "Vastal Press",
    "Category": "Notes",
    "Edition": "2026",
    "Scope": "Acids and Bases",
    "Format": "PDF"
  }]);
  assert.equal(item._searchTitle, "chemistry handbook");
  assert.match(item._searchBlob, /chemistry handbook chemistry vatsal press notes 2026 acids and bases pdf/);
  assert.equal(item._materialYear, "2026");
  assert.equal(item._searchSubject, "chemistry");
});

test("student abbreviations expand to common ICSE subject and resource terms", () => {
  const item = api.prepareMaterialSearchIndex([{
    "Book Name": "Previous Year Solved Question Paper",
    "Subject": "Physics Chemistry Biology Geography History Computer Applications English Literature",
    "Category": "PYQs",
    "Edition": "2026"
  }])[0];
  for (const term of ["chem", "phy", "bio", "geo", "hist", "comp", "lit", "pyq"]) {
    assert.equal(api.matchesMaterialSearch(item, api.getSearchTokenGroups(term)), true, term);
  }
});

test("all query tokens must match regardless of order or metadata field", () => {
  const item = api.prepareMaterialSearchIndex([{
    "Book Name": "Oswaal Class 10 Question Bank",
    "Subject": "Chemistry",
    "Publisher/Company": "Oswaal",
    "Category": "Notes",
    "Edition": "2026"
  }])[0];
  assert.equal(api.matchesMaterialSearch(item, api.getSearchTokenGroups("2026 chem oswaal")), true);
  assert.equal(api.matchesMaterialSearch(item, api.getSearchTokenGroups("2026 chem biology")), false);
});

test("exact title and full title-token matches rank above publisher-only matches", () => {
  const [titleMatch, publisherMatch] = api.prepareMaterialSearchIndex([
    { "Book Name": "Chemistry Handbook", "Publisher": "Academic House" },
    { "Book Name": "Science Notes", "Publisher": "Chemistry Handbook Press" }
  ]);
  const groups = api.getSearchTokenGroups("chemistry handbook");
  const query = api.normalizeSearchText("chemistry handbook");
  assert.ok(api.getMaterialSearchScore(titleMatch, groups, query) > api.getMaterialSearchScore(publisherMatch, groups, query));
});

test("global and detail search have clear controls and five quick-search chips", () => {
  assert.match(html, /id="globalSearchClear"/);
  assert.match(html, /id="detailSearchClear"/);
  assert.match(html, /runQuickSearch\('PYQs 2026'\)/);
  for (const label of ["Oswaal", "Selina", "Specimen Papers", "Handwritten Notes"]) assert.ok(html.includes("runQuickSearch('" + label + "')"));
  assert.match(css, /study-desk-search-clear[^}]*width:44px/);
});

test("search is debounced and result rendering is capped at 12 cards per batch", () => {
  assert.match(script, /setTimeout\(\(\) => \{[\s\S]*?\}, 250\)/);
  assert.match(script, /const DESKTOP_RESOURCE_PAGE_SIZE = 36;/);
  assert.match(script, /const MOBILE_RESOURCE_PAGE_SIZE = 12;/);
  assert.match(script, /function getResourcePageSize\(\)/);
  assert.match(script, /function getInitialResourcePageSize\(\) \{ return getResourcePageSize\(\); \}/);
  assert.match(script, /function getResourcePageIncrement\(\) \{ return getResourcePageSize\(\); \}/);
  assert.match(html, /onclick="loadMoreMaterials\(\)"/);
});

test("empty state resets filters and opens EduBot with the searched topic prefilled", () => {
  assert.match(script, /function clearSearchAndFilters\(\)/);
  assert.match(script, /function askEduBotAboutSearch\(\)/);
  assert.ok(script.includes("Please explain"));
  assert.ok(script.includes("ICSE Class 10 level"));
  assert.ok(script.includes("Clear search &amp; filters"));
  assert.ok(script.includes("Ask EduBot about this topic"));
});

test("live search waits for two characters but permits an empty query to reset", () => {
  assert.equal(api.isMaterialSearchQueryReady(""), true);
  assert.equal(api.isMaterialSearchQueryReady("a"), false);
  assert.equal(api.isMaterialSearchQueryReady("s"), false);
  assert.equal(api.isMaterialSearchQueryReady("ic"), true);
  assert.equal(api.isMaterialSearchQueryReady("  a  "), false);
  assert.match(script, /globalSearchMinimumHint/);
  assert.match(script, /detailSearchMinimumHint/);
  assert.match(script, /results\) results\.hidden = true/);
});
