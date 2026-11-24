import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = new URL("../", import.meta.url).pathname;
const routes = ["home", "Materials", "EduBot", "Settings", "StudyTools", "Privacy"];
test("all six Study Vault route pages exist", () => { for (const route of routes) assert.ok(existsSync(join(root, route, "index.html")), route); });
test("route pages expose shared navigation and accessible page landmarks", () => { for (const route of routes) { const html = readFileSync(join(root, route, "index.html"), "utf8"); assert.match(html, /aria-label="Main navigation"/); assert.match(html, /<main class="shell">/); assert.match(html, /<title>/); } });
test("existing features are reused instead of replaced", () => { for (const route of ["Materials", "EduBot", "Settings", "StudyTools", "Privacy"]) assert.match(readFileSync(join(root, route, "index.html"), "utf8"), /data-existing-app/); });
test("all new routes and shared assets are in the service-worker app shell", () => { const sw = readFileSync(join(root, "sw.js"), "utf8"); for (const route of routes) assert.ok(sw.includes(`./${route}/index.html`), route); assert.ok(sw.includes("./routes.css")); assert.ok(sw.includes("./routes.js")); });
test("all six routes are discoverable in the sitemap", () => { const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8"); for (const route of routes) assert.ok(sitemap.includes(`/${route}/`), route); });
test("original legal and resource disclosures remain present", () => { const index = readFileSync(join(root, "index.html"), "utf8"); const privacy = readFileSync(join(root, "privacy-policy.html"), "utf8"); for (const phrase of ["About ICSE MasterClass Study Vault", "Resource Index", "Copyright", "not affiliated"]) assert.ok(index.toLowerCase().includes(phrase.toLowerCase()), phrase); for (const phrase of ["known limitation", "parent/guardian", "icsemasterclass@gmail.com"]) assert.ok(privacy.toLowerCase().includes(phrase.toLowerCase()), phrase); });

test("route stylesheet has a valid shadow token and balanced rules", () => {
  const css = readFileSync(join(root, "routes.css"), "utf8");
  assert.match(css, /--shadow:0 18px 50px rgba\\(37,41,35,\\.08\\)\\}/);
  assert.equal((css.match(/\\{/g) || []).length, (css.match(/\\}/g) || []).length);
});
