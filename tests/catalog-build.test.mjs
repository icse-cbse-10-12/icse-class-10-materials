import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCSV, buildCatalog } from "../scripts/build-catalog.mjs";

const fixture = 'Book Name,Subject,Category,Google Drive Link,File Size,Scope\n"Physics, Volume 1",Physics,Notes,https://drive.google.com/file/d/abc/view,12 MB,"Motion, force and energy"\n';

test("catalog CSV parser handles quoted commas and embedded delimiters", () => {
  const rows = parseCSV(fixture);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]["Book Name"], "Physics, Volume 1");
  assert.equal(rows[0].Scope, "Motion, force and energy");
});

test("catalog build injects safe cards, cached data, LearningResource schema and sitemap dates", async () => {
  const root = await mkdtemp(join(tmpdir(), "icse-catalog-"));
  try {
    await writeFile(join(root, "index.html"), '<p id="itemCount">0 Materials Found</p><!-- CATALOG_CARDS_START --><!-- CATALOG_CARDS_END --><!-- CATALOG_DATA_START --><!-- CATALOG_DATA_END --><!-- CATALOG_SCHEMA_START --><!-- CATALOG_SCHEMA_END -->');
    await writeFile(join(root, "sitemap.xml"), '<urlset><url><lastmod>2026-01-01</lastmod></url></urlset>');
    const result = await buildCatalog({ root, csvText: fixture, now: new Date("2026-11-12T00:00:00Z") });
    const html = await readFile(join(root, "index.html"), "utf8");
    const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
    const cache = JSON.parse(await readFile(join(root, "catalog-data.json"), "utf8"));
    assert.equal(result.count, 1);
    assert.match(html, /Physics, Volume 1/);
    assert.match(html, /Direct Drive/);
    assert.match(html, /catalog-data\.json/);
    assert.equal(cache.rows.length, 1);
    assert.ok(cache.fields.includes("Book Name"));
    assert.match(html, /"@type":"LearningResource"/);
    assert.match(sitemap, /2026-11-12/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("empty catalog input is rejected without replacing existing content", async () => {
  await assert.rejects(() => buildCatalog({ root: tmpdir(), csvText: "" }), /no material rows/);
});
