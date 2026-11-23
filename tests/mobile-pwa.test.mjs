import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile viewport supports device safe areas and exposes a real install action", () => {
  const html = read("index.html");
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/);
  assert.match(html, /id="pwaInstallCard"/);
  assert.match(html, /id="offlineNotice"/);
  assert.match(html, /pwa\.js/);
});

test("PWA manifest declares a GitHub Pages-safe scope and adaptive display", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.id, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.start_url, "./");
  assert.ok(manifest.display_override.includes("standalone"));
  assert.equal(manifest.orientation, "any");
});

test("PWA runtime handles install prompts, iOS instructions, connectivity and safe service-worker updates", () => {
  const pwa = read("pwa.js");
  const script = read("script.js");
  assert.match(script, /beforeinstallprompt/);
  assert.match(read("index.html"), /Add to Home Screen/);
  assert.match(pwa, /navigator\.onLine/);
  assert.match(pwa, /updateViaCache:\s*"none"/);
  assert.match(pwa, /navigator\.serviceWorker\.register/);
  assert.match(script, /appinstalled/);
});

test("offline shell is cached and missing navigation routes use a useful offline page", () => {
  const sw = read("sw.js");
  assert.match(sw, /icse-masterclass-v1\.19\.0-mobile-pwa/);
  assert.ok(sw.includes("./offline.html"));
  assert.ok(sw.includes("./pwa.js"));
  assert.match(sw, /caches\.match\("\.\/offline\.html"\)/);
  assert.ok(read("offline.html").includes("ICSE MasterClass"));
});

test("mobile quick navigation respects safe areas and the Study Tools launcher stays above it", () => {
  const css = read("site-polish.css");
  assert.match(css, /#icseStudyTools\s*\{[^}]*bottom:\s*calc\([^}]*safe-area-inset-bottom/s);
  assert.match(css, /\.mobile-bottom-nav[^}]*safe-area-inset-bottom/s);
  assert.match(css, /#mobileAccountLink\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /#headerActions\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.pwa-install-card/);
});
