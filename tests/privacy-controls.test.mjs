import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(join(root, path), "utf8");

test("consent manager defaults optional categories to off and persists versioned choices", () => {
  const source = read("consent-manager.js");
  assert.match(source, /externalServices: false/);
  assert.match(source, /analytics: false/);
  assert.match(source, /version: VERSION/);
  assert.match(source, /updatedAt: new Date\\(\\)\\.toISOString\\(\\)/);
  assert.match(source, /data-consent-action="accept"/);
  assert.match(source, /data-consent-action="reject"/);
  assert.match(source, /data-consent-action="customise"/);
  assert.match(source, /Privacy settings/);
});

test("necessary storage is separate from optional categories", () => {
  const source = read("consent-manager.js");
  assert.match(source, /necessary: true/);
  assert.match(source, /save\\(false, false\\)/);
  assert.match(source, /category === "necessary"/);
  const policy = read("cookie-policy.html");
  assert.match(policy, /Rejecting this category leaves the catalogue/);
  assert.match(policy, /Google Sheets/);
});

test("EduBot is documented as optional external processing", () => {
  const policy = read("cookie-policy.html");
  assert.match(policy, /Google Gemini/);
  assert.match(policy, /question and recent conversation context/);
  assert.match(policy, /No analytics SDK is currently activated/);
});

test("account deletion function is caller-scoped and requires recent authentication", () => {
  const source = read("functions/index.js");
  assert.match(source, /if \\(!request\\.auth\\)/);
  assert.match(source, /request\\.auth\\.uid/);
  assert.match(source, /auth_time/);
  assert.match(source, /ageSeconds > 5 \\* 60/);
  assert.doesNotMatch(source, /request\\.data\\.uid|request\\.data\\.userId/);
});

test("legal and backend foundation files exist and refund model is truthful", () => {
  for (const file of ["cookie-policy.html", "refund-policy.html", "functions/package.json", "firebase.json", ".firebaserc"]) {
    assert.ok(existsSync(join(root, file)), file + " must exist");
  }
  assert.match(read("refund-policy.html"), /does not currently offer paid subscriptions/);
  assert.match(read("refund-policy.html"), /no Study Vault purchases to refund/);
});

test("deployment instructions explicitly distinguish source from deployed backend", () => {
  const doc = read("docs/ACCOUNT-DELETION-DEPLOYMENT.md");
  assert.match(doc, /not a deployed backend/);
  assert.match(doc, /Verify the deployed function name and region/);
  assert.match(doc, /Blaze plan/);
});
