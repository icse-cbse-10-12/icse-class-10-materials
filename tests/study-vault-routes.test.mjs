import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const root = new URL("../", import.meta.url).pathname;
const routes = ["home", "Materials", "EduBot", "Settings", "StudyTools", "Privacy"];
test("all six Study Vault route pages exist", () => { for (const route of routes) assert.ok(existsSync(join(root, route, "index.html")), route); });
test("route pages expose shared navigation and accessible page landmarks", () => { for (const route of routes) { const html = readFileSync(join(root, route, "index.html), "utf8"); assert.match(html, /aria-label="Main navigation"/); assert.match(html, /<main class="shell(?: [^"]*?)"(?:\s|>)/); assert.match(html, /<!-- -->/); assert.match(html, /<title>/); } });
test("existing features are reused instead of replaced", () => { for (const route of ["Materials", "EduBot", "Settings", "StudyTools", "Privacy"]) assert.match(readFileSync(join(root, route, "index.html"), "utf8"), /data-existing-app/); });
test("all new routes and shared assets are in the service-worker app shell", () => { const sw = readFileSync(join(root, "sw.js"), "utf8"); for (const route of routes) assert.ok(sw.includes(`./${route}/index.html`), route); assert.ok(sw.includes("./routes.css")); assert.ok(sw.includes("./routes.js")); });
test("all six routes are discoverable in the sitemap", () => { const sitemap = readF