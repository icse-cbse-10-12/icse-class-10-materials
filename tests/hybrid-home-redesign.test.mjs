import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("hybrid homepage stylesheet is additive and preserves the existing discovery controls", () => {
  const html = read("index.html");
  assert.match(html, /hybrid-home\.css\?v=1/);
  for (const id of ["mainContent", "globalSearchWrap", "globalSearchInput", "mainLandingView", "mainSubjectGrid", "subjectGroupTabs"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /scheduleMaterialSearch\('global'\)/);
  assert.match(html, /runQuickSearch\('PYQs 2026'\)/);
});
test("hybrid homepage keeps both complete legal sections and their required protections", () => {
  const html = read("index.html");
  for (const phrase of ["About ICSE MasterClass Study Vault", "Extensive Subject Support", "Curated Resource Formats", "Resource Index, Copyright and Disclaimer", "Non-Affiliation", "Intellectual Property", "Removal Requests", "icsemasterclass@gmail.com", "Removal requests will be reviewed promptly."]) assert.ok(html.includes(phrase), `Missing protected legal content: ${phrase}`);
});
test("hybrid homepage styles include responsive, keyboard-focus and reduced-motion support", () => {
  const css = read("hybrid-home.css");
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /minmax\(0,1fr\)/);
});
