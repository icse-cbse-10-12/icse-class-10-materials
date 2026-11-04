import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");

test("consent manager is present on the public, account and admin surfaces", () => {
  for (const page of ["index.html", "login.html", "dashboard.html", "admin-1.html", "privacy-policy.html", "terms-and-conditions.html"]) {
    assert.ok(read(page).includes("consent-manager.js"), page + " must load the shared consent manager");
  }
});

test("consent manager defaults optional categories off and persists versioned preferences", () => {
  const source = read("consent-manager.js");
  assert.ok(source.includes("externalServices: false"));
  assert.ok(source.includes("analytics: false"));
  assert.ok(source.includes("version: VERSION"));
  assert.ok(source.includes("updatedAt: new Date().toISOString()"));
  assert.ok(source.includes('data-consent-action="accept"'));
  assert.ok(source.includes('data-consent-action="reject"'));
  assert.ok(source.includes('data-consent-action="customise"'));
  assert.ok(source.includes("Privacy settings"));
});

test("necessary storage remains active and optional rejection is explicit", () => {
  const source = read("consent-manager.js");
  assert.ok(source.includes("necessary: true"));
  assert.ok(source.includes('save(false, false, consent?.region || "unknown")'));
  assert.ok(source.includes('category === "necessary"'));
  const policy = read("cookie-policy.html");
  assert.ok(policy.includes("Rejecting this category leaves the catalogue"));
  assert.ok(policy.includes("Google Sheets"));
});

test("region preference is self-selected and does not infer location or legal applicability", () => {
  const source = read("consent-manager.js");
  const policy = read("cookie-policy.html");
  assert.ok(source.includes("REGION_PROFILES"));
  assert.ok(source.includes('id="icseConsentRegion"'));
  assert.ok(source.includes("region: Object.prototype.hasOwnProperty.call(REGION_PROFILES, region)"));
  assert.ok(policy.includes("self-selected"));
  assert.ok(policy.includes("does not determine whether a law applies"));
});

test("EduBot displays a separate required pre-send data-use acknowledgement", () => {
  const html = read("index.html");
  assert.ok(html.includes('id="edubotDataAcknowledgement"'));
  assert.ok(html.includes('form="edubotChatForm" type="checkbox" required'));
  assert.ok(html.includes("recent conversation context (up to 12 messages in this page)"));
  assert.ok(html.includes("sent to Google Gemini through Firebase AI Logic"));
  assert.ok(html.includes("This acknowledgement is not parental consent."));
  assert.ok(html.includes("Do not include your name, email, phone number, school details, passwords"));
});

test("EduBot and administrator Supabase are optional external processing", () => {
  const policy = read("cookie-policy.html");
  assert.ok(policy.includes("Gemini service"));
  assert.ok(policy.includes("question and recent conversation context"));
  assert.ok(policy.includes("administrator-only Supabase SDK"));
  assert.ok(policy.includes("does not currently run an analytics SDK"));
});

test("account deletion function is caller-scoped and requires recent authentication", () => {
  const source = read("functions/index.js");
  assert.ok(source.includes("if (!request.auth)"));
  assert.ok(source.includes("request.auth.uid"));
  assert.ok(source.includes("auth_time"));
  assert.ok(source.includes("ageSeconds > 5 * 60"));
  assert.ok(!source.includes("request.data.uid"));
  assert.ok(!source.includes("request.data.userId"));
});

test("local student-data deletion covers dashboard and Study Tools keys", () => {
  const dashboard = read("student-dashboard.js");
  const tools = read("study-tools.js");
  const login = read("login.html");
  assert.ok(dashboard.includes("window.clearStudyToolsData()"));
  assert.ok(dashboard.includes('localStorage.removeItem("icseMasterClassStudyToolsV1")'));
  assert.ok(tools.includes("window.clearStudyToolsData = function()"));
  assert.ok(login.includes('localStorage.removeItem("icseMasterClass.studentDashboard.v1")'));
  assert.ok(login.includes('localStorage.removeItem("icseMasterClassStudyToolsV1")'));
});

test("legal and backend foundation files exist and refund model is truthful", () => {
  for (const file of ["cookie-policy.html", "refund-policy.html", "functions/package.json", "firebase.json", ".firebaserc"]) {
    assert.ok(existsSync(join(root, file)), file + " must exist");
  }
  assert.ok(read("refund-policy.html").includes("does not currently offer paid subscriptions"));
  assert.ok(read("refund-policy.html").includes("no Study Vault purchases to refund"));
});

test("Cloud Functions uses a supported Node 22 runtime and current Admin SDK", () => {
  const pkg = JSON.parse(read("functions/package.json"));
  const firebase = JSON.parse(read("firebase.json"));
  assert.equal(pkg.engines.node, "22");
  assert.equal(firebase.functions.runtime, "nodejs22");
  assert.ok(pkg.dependencies["firebase-admin"].startsWith("^14."));
  assert.ok(pkg.dependencies["firebase-functions"].startsWith("^7."));
  const workflow = read(".github/workflows/site-smoke.yml");
  assert.ok(workflow.includes("node-version: 22"));
  assert.ok(workflow.includes("node-version: 24"));
});

test("deployment instructions explicitly distinguish source from deployed backend", () => {
  const doc = read("docs/ACCOUNT-DELETION-DEPLOYMENT.md");
  assert.ok(doc.includes("not a deployed backend"));
  assert.ok(doc.includes("Verify the deployed function name and region"));
  assert.ok(doc.includes("Blaze plan"));
});
