import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("mobile homepage exposes Study Tools and Privacy in navigation instead of floating overlays", () => {
  const html = read("index.html"), css = read("mobile-home-fix.css");
  assert.match(html, /mobile-home-fix\.css\?v=1/);
  assert.match(html, /aria-label="Open Study Tools"/);
  assert.match(html, /aria-label="Open privacy settings"/);
  assert.match(html, /icseStudyToggle.*click/);
  assert.match(html, /icsePrivacySettings.*click/);
  assert.match(css, /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /#icseStudyToggle, #icsePrivacySettings\s*\{\s*display:\s*none\s*!important/);
});
test("mobile search controls remain within the viewport and quick searches wrap", () => {
  const css = read("mobile-home-fix.css");
  assert.match(css, /#globalSearchInput[\s\S]*?min-width:\s*0/);
  assert.match(css, /\.study-desk-quick-search[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(css, /overflow:\s*visible\s*!important/);
});
