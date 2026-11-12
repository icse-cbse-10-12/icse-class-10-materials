import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCSV, buildCatalog, renderCard } from "../scripts/build-catalog.mjs";

const fixture = 'Book Name,Subject,Category,Format,Google Drive Link,File Size,Scope\n"Physics, Volume 1",Physics,Notes,PDF,https://drive.google.com/file/d/abc/view,12 MB,"Motion, force and energy"\n';

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
    await writeFile(join(root, "sitemap.xml"), '<urlset><url><loc>https://icse-cbse-10-12.github.io/icse-class-10-materials/</loc><lastmod>2026-01-01</lastmod></url><url><loc>https://icse-cbse-10-12.github.io/icse-class-10-materials/blog/</loc><lastmod>2026-01-02</lastmod></url><url><loc>https://icse-cbse-10-12.github.io/icse-class-10-materials/faq.html</loc><lastmod>2026-01-03</lastmod></url></urlset>');
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
    assert.match(sitemap, /<loc>https:\/\/icse-cbse-10-12\.github\.io\/icse-class-10-materials\/<\/loc><lastmod>2026-11-12<\/lastmod>/);
    assert.match(sitemap, /<loc>https:\/\/icse-cbse-10-12\.github\.io\/icse-class-10-materials\/blog\/<\/loc><lastmod>2026-01-02<\/lastmod>/);
    assert.match(sitemap, /<loc>https:\/\/icse-cbse-10-12\.github\.io\/icse-class-10-materials\/faq\.html<\/loc><lastmod>2026-01-03<\/lastmod>/);
    const repeat = await buildCatalog({ root, csvText: fixture, now: new Date("2026-11-13T00:00:00Z") });
    assert.equal(repeat.homepageChanged, false);
    const unchanged = await readFile(join(root, "sitemap.xml"), "utf8");
    assert.match(unchanged, /<lastmod>2026-11-12<\/lastmod>/);
    const changedFixture = fixture.replace("Physics, Volume 1", "Physics, Volume 2");
    await buildCatalog({ root, csvText: changedFixture, now: new Date("2026-11-14T00:00:00Z") });
    const changed = await readFile(join(root, "sitemap.xml"), "utf8");
    assert.match(changed, /<lastmod>2026-11-14<\/lastmod>/);
    assert.match(changed, /<lastmod>2026-01-02<\/lastmod>/);
    assert.match(changed, /<lastmod>2026-01-03<\/lastmod>/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("resource cards use accurate labels for different resource formats", () => {
  const card = (format, url) => renderCard({ "Book Name": "Example", Subject: "Physics", Format: format, "Google Drive Link": url });
  assert.match(card("PDF", "https://drive.google.com/file/d/example/view"), /Open PDF/);
  assert.match(card("DOCX", "https://drive.google.com/file/d/example/view"), /Open Resource/);
  assert.match(card("Image", "https://example.org/image"), /Open Resource/);
  assert.match(card("Video", "https://example.org/video"), /Open Resource/);
  assert.match(card("", "https://example.org/file.pdf"), /Open PDF/);
  assert.match(card("", "https://example.org/resource"), /Open Resource/);
});

test("empty catalog input is rejected without replacing existing content", async () => {
  await assert.rejects(() => buildCatalog({ root: tmpdir(), csvText: "" }), /no material rows/);
});
