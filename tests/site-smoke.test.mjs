import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = name => readFileSync(join(root, name), "utf8");

test("all public pages load the shared academic design layer", () => {
  for (const [page, bodyClass] of [["index.html", "mc-home"], ["login.html", "mc-login"], ["dashboard.html", "mc-dashboard"], ["portal.html", "mc-portal"], ["admin-1.html", "mc-admin"]]) {
    const html = read(page);
    assert.match(html, /academic-library\.css\?v=1/ , `${page} must load the shared design layer`);
    assert.match(html, new RegExp(`<body[^>]*class=[\"'][^\"']*${bodyClass}`), `${page} must have its expected scope class`);
  }
});

test("EduBot Firebase module is not loaded during initial page parsing", () => {
  const html = read("index.html");
  assert.match(html, /edubot-loader\.js\?v=1/);
  assert.doesNotMatch(html, /<script[^>]+gemini-ai\.js/i);
  const loader = read("edubot-loader.js");
  assert.match(loader, /import\(\"\.\/gemini-ai\.js\?v=2\"\)/);
  assert.match(loader, /addEventListener\(\"submit\"/);
});

test("service worker does not precache broken or heavy AI assets", () => {
  const sw = read("sw.js");
  assert.doesNotMatch(sw, /ai-tutor\.js|gemini-ai\.js/);
  assert.match(sw, /login\.html/);
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
  for (const name of ["academic-library.css", "edubot-loader.js", "sw.js"]) assert.ok(existsSync(join(root, name)), `${name} must exist`);
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
  for (const asset of ["style.css?v=study-hub-layout-1", "design-polish.css?v=20261026-1", "luxury-theme.css?v=3", "academic-library.css?v=1"]) {
    assert.ok(sw.includes(asset), `APP_SHELL must precache ${asset}`);
  }
});
