import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const home = read("home/index.html");
const materials = read("Materials/index.html");
const css = read("routes.css");
const js = read("routes.js");
const root = read("index.html");

test("homepage presents a search-first editorial entry point with working catalogue destinations", () => {
  assert.match(home, /Less searching\.<br><span>More learning\.<\/span>/);
  assert.match(home, /action="\.\.\/Materials\/" method="get"/);
  assert.match(home, /name="q"/);
  for (const subject of ["Mathematics","Physics","Chemistry","Biology","History","Geography","English","Computer Applications"]) {
    assert.ok(home.includes("../Materials/?q=" + encodeURIComponent(subject).replace(/%20/g,"%20")), "missing subject destination: " + subject);
  }
  assert.match(home, /aria-label="Main navigation"/);
  assert.match(home, /data-nav-toggle/);
  assert.match(home, /Study Tools/);
  assert.match(home, /EduBot/);
});

test("Materials embeds the existing catalogue rather than duplicating or replacing its data layer", () => {
  assert.match(materials, /src="\.\.\/index\.html\?embed=1#globalSearchWrap"/);
  assert.match(materials, /data-existing-app/);
  assert.match(materials, /Open full Study Vault/);
  assert.match(root, /id="globalSearchInput"/);
  assert.match(root, /id="mainSubjectGrid"/);
  assert.match(root, /About ICSE MasterClass Study Vault/);
  assert.match(root, /Resource Index, Copyright and Disclaimer/);
  assert.match(root, /Removal requests will be reviewed promptly\./);
});

test("embedded catalogue receives search queries and adapts its height without nested fixed-height scrolling", () => {
  assert.match(js, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(js, /scheduleMaterialSearch\("global"\)/);
  assert.match(js, /ResizeObserver/);
  assert.match(js, /MutationObserver/);
  assert.match(js, /body>header,body>footer,#siteNavOverlay/);
  assert.match(js, /syncFrameHeight/);
});

test("phase-one design tokens and responsive accessibility rules are present", () => {
  for (const token of ["#243d32","#ede9df","#c47d54","#d6dfd2","#282a27"]) assert.ok(css.includes(token), "missing design token " + token);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.nav\.is-open/);
});
