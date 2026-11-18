const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:8765/index.html";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], { stdio: "ignore" });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(BASE_URL); if (response.ok) return; } catch {}
    await sleep(250);
  }
  throw new Error("Local Study Vault server did not start");
}

async function runViewport(browser, name, viewport, mobile, expectedCards) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  await page.addInitScript(() => {
    window.__studyVaultLongTasks = [];
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (entry.duration > 50) window.__studyVaultLongTasks.push(Math.round(entry.duration));
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(() => { window.__pageErrors = []; window.addEventListener("error", event => window.__pageErrors.push(event.message)); });
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });

  const navigationStarted = Date.now();
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(() => typeof window.selectSubject === "function" && typeof window.filterResources === "function", null, { timeout: 30000 });
  await page.waitForFunction(() => typeof allResources !== "undefined" && allResources.length > 1000, null, { timeout: 45000 });
  await page.evaluate(() => window.selectSubject("All", false));
  await page.waitForFunction(expected => document.querySelectorAll("#resourceGrid > article").length === expected, expectedCards, { timeout: 30000 });
  await page.waitForTimeout(300);

  const visual = await page.evaluate(() => {
    const grid = document.getElementById("resourceGrid");
    const cards = [...(grid?.querySelectorAll(":scope > article") || [])];
    const firstCard = cards[0];
    const actionNodes = [...(firstCard?.querySelectorAll(".mc-material-actions > *") || [])];
    const rect = node => { const r = node.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, height:r.height }; };
    const overlaps = nodes => nodes.some((a, i) => nodes.slice(i + 1).some(b => {
      const x=rect(a), y=rect(b); return x.left < y.right-1 && x.right > y.left+1 && x.top < y.bottom-1 && x.bottom > y.top+1;
    }));
    const filter = document.querySelector(".library-filter-tabs");
    const refineFields = [...document.querySelectorAll(".library-refinement-filters .library-refinement-field")].filter(el => getComputedStyle(el).display !== "none");
    const firstTitle = firstCard?.querySelector("h3")?.textContent?.trim() || "";
    const allSubjects = cards.some(card => /All Subjects \(\d+\)/.test(card.textContent));
    const countBadge = document.getElementById("savedMaterialCount");
    const guide = document.getElementById("study-vault-guide");
    const faq = document.getElementById("study-vault-faq");
    const resourceGrid = document.getElementById("resourceGrid");
    const actionHeights = actionNodes.map(node => Math.round(rect(node).height));
    const refinementOverlap = overlaps(refineFields);
    const actionOverlap = overlaps(actionNodes);
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      cards: cards.length,
      firstTitle,
      badTitle: /\.(pdf|docx?)$/i.test(firstTitle) || firstTitle.includes("_"),
      sizeNotListed: /Size not listed/i.test(grid?.textContent || ""),
      allSubjectsBadge: allSubjects,
      filterWrap: filter ? getComputedStyle(filter).flexWrap : "missing",
      filterClientWidth: filter?.clientWidth || 0,
      filterScrollWidth: filter?.scrollWidth || 0,
      filterButtonHeights: [...(filter?.querySelectorAll(".cat-btn") || [])].slice(0,3).map(node => Math.round(rect(node).height)),
      actionHeights,
      actionOverlap,
      refinementOverlap,
      savedCount: countBadge?.textContent?.trim() || "missing",
      savedCountHidden: countBadge?.hidden ?? false,
      guideAfterGrid: !!(resourceGrid && guide && (resourceGrid.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING)),
      faqAfterGuide: !!(guide && faq && (guide.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING)),
      loadMs: Math.round(performance.now()),
      fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0)
    };
  });

  assert.ok(visual.scrollWidth <= visual.innerWidth, `${name}: horizontal overflow ${visual.scrollWidth}/${visual.innerWidth}`);
  assert.equal(visual.cards, expectedCards, `${name}: expected ${expectedCards} rendered cards`);
  assert.equal(visual.badTitle, false, `${name}: card title still contains a filename extension or underscores`);
  assert.equal(visual.sizeNotListed, false, `${name}: unknown file-size placeholder is visible`);
  assert.equal(visual.allSubjectsBadge, true, `${name}: multi-subject card is not compacted`);
  assert.equal(visual.guideAfterGrid, true, `${name}: guide appears before the catalogue`);
  assert.equal(visual.faqAfterGuide, true, `${name}: FAQ order is incorrect`);
  assert.equal(visual.savedCountHidden, true, `${name}: zero saved badge is visible`);
  assert.equal(visual.refinementOverlap, false, `${name}: refinement controls overlap`);
  assert.equal(visual.actionOverlap, false, `${name}: card action controls overlap`);
  if (mobile) {
    assert.equal(visual.filterWrap, "nowrap", "mobile category chips must stay on one swipeable row");
    assert.ok(visual.filterScrollWidth > visual.filterClientWidth, "mobile category chips should be horizontally scrollable");
    assert.ok(visual.filterButtonHeights.every(height => height >= 44), "mobile category buttons must be at least 44px high");
    assert.ok(visual.actionHeights.every(height => height >= 44), "mobile card actions must be at least 44px high");
  }

  const beforeSearch = await page.locator("#itemCount").innerText();
  const searchStarted = Date.now();
  await page.locator("#searchInput").fill("Physics");
  await page.waitForFunction(before => document.getElementById("itemCount")?.textContent?.trim() !== before, beforeSearch, { timeout: 2500 });
  const searchMs = Date.now() - searchStarted;
  const afterSearch = await page.locator("#itemCount").innerText();
  assert.notEqual(afterSearch, beforeSearch, `${name}: Physics search did not update the result count`);
  assert.ok(searchMs < 1200, `${name}: search took ${searchMs}ms`);

  await page.locator("#searchInput").fill("");
  await page.waitForFunction(before => document.getElementById("itemCount")?.textContent?.trim() !== before, afterSearch, { timeout: 2500 });
  const publisher = page.locator("#publisherFilter");
  const publisherOptions = await publisher.locator("option").evaluateAll(options => options.map(option => ({ value:option.value, text:option.textContent.trim() })).filter(option => option.value !== "all"));
  assert.ok(publisherOptions.length > 0, `${name}: publisher options were not populated`);
  const targetPublisher = publisherOptions.find(option => option.value === "abha") || publisherOptions[0];
  const beforePublisher = await page.locator("#itemCount").innerText();
  await publisher.selectOption(targetPublisher.value);
  await page.waitForFunction(before => document.getElementById("itemCount")?.textContent?.trim() !== before, beforePublisher, { timeout: 2500 });
  const afterPublisher = await page.locator("#itemCount").innerText();
  assert.notEqual(afterPublisher, beforePublisher, `${name}: publisher filter did not update the result count`);
  await publisher.selectOption("all");

  const notesTab = page.locator(".library-filter-tabs .cat-btn").filter({ hasText: "Notes" }).first();
  await notesTab.click();
  await page.waitForTimeout(350);
  const notesCount = await page.locator("#itemCount").innerText();
  assert.ok(notesCount.length > 0, `${name}: Notes category did not render a result state`);

  await page.locator("#edubotDataAcknowledgement").check({ force: true });
  await page.waitForFunction(() => document.getElementById("edubotPrivacyNotice")?.open === false && localStorage.getItem("icseMasterClass.edubotNoticeAcknowledged.v1") === "true", null, { timeout: 3000 });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(() => document.getElementById("edubotPrivacyNotice")?.open === false, null, { timeout: 5000 });

  const runtime = await page.evaluate(() => ({
    errors: window.__studyVaultLongTasks || [],
    pageErrors: window.__pageErrors || [],
    ackStored: localStorage.getItem("icseMasterClass.edubotNoticeAcknowledged.v1") === "true",
    privacyCollapsed: document.getElementById("edubotPrivacyNotice")?.open === false
  }));
  assert.equal(runtime.ackStored, true, `${name}: acknowledgement was not persisted`);
  assert.equal(runtime.privacyCollapsed, true, `${name}: privacy notice did not stay collapsed after reload`);
  assert.equal(pageErrors.length, 0, `${name}: uncaught page errors: ${pageErrors.join(" | ")}`);

  const result = { name, viewport, navigationMs: Date.now() - navigationStarted, ...visual, searchMs, beforeSearch, afterSearch, publisher:targetPublisher, afterPublisher, notesCount, longTasksOver50ms:runtime.errors, pageErrors, consoleErrors };
  await context.close();
  return result;
}

(async () => {
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true });
    const results = [];
    results.push(await runViewport(browser, "mobile", { width:390, height:844 }, true, 12));
    results.push(await runViewport(browser, "desktop", { width:1440, height:1000 }, false, 36));
    console.log(JSON.stringify({ browser:"Chromium", results }, null, 2));
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})();
