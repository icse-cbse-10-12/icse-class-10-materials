const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

initializeApp();

/**
 * Deletes only the authenticated caller's Firebase Authentication account.
 * The inspected repository contains no student Firestore profile collection
 * or student Supabase records. Unknown collections are never guessed/deleted.
 */
exports.deleteMyAccount = onCall({ region: "asia-south1" }, async request => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before requesting account deletion.");
  }
  const authTime = Number(request.auth.token.auth_time || 0);
  const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
  if (!authTime || ageSeconds < 0 || ageSeconds > 5 * 60) {
    throw new HttpsError("failed-precondition", "For your security, sign out and sign in again before deleting your account.");
  }
  // Never accept a UID from the browser. Delete only the verified caller.
  await getAuth().deleteUser(request.auth.uid);
  return { deleted: true };
});