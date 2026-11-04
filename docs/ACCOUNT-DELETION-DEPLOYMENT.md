# Firebase account-deletion backend

## What this backend does

The callable Cloud Function deleteMyAccount deletes only the Firebase Authentication identity belonging to the currently authenticated caller. It does not accept a UID from the browser. It rejects unauthenticated requests and requires a recent authentication event (within five minutes).

The repository inspection found no student Firestore profile collection or student Supabase records. The function therefore does not invent collection names or delete administrator data. If a student-linked server-side data store is introduced later, its schema and deletion transaction must be added and tested before the privacy notice promises deletion of that data.

## Deployment prerequisites

1. Confirm Firebase project icse-masterclass is the intended production project.
2. Confirm Firebase Authentication is enabled for the same project.
3. Enable billing for the Firebase project if Firebase requires the Blaze plan for Cloud Functions deployment. Review current pricing and set budget alerts before enabling billing.
4. Install Node.js 22 and Firebase CLI (current Firebase CLI releases support this workflow).
5. Authenticate with an account authorised to deploy Functions.

## Deploy

From the repository root:

```bash
cd functions
npm install
npm run check
cd ..
firebase deploy --only functions:deleteMyAccount --project icse-masterclass
```

The function is deployed in asia-south1. Verify the deployed function name and region in Firebase Console before enabling the browser control.

## Verification checklist

- Sign in as a test student.
- Call the function with no authentication: it must fail with unauthenticated.
- Call with a stale authentication session: it must fail with failed-precondition.
- Sign in again and call within five minutes: only that caller's Firebase Auth account should be deleted.
- Verify the account no longer appears in Firebase Authentication.
- Verify the client signs out and clears only the documented local student data keys on the current browser.
- Verify an administrator account and all Supabase administrator data remain untouched.
- Verify provider/network failures are shown as failures, never as successful deletion.

## Important deployment boundary

The source code in this repository is not a deployed backend. Until deployment and the verification checklist above are completed, the website must continue to describe online account deletion as unavailable and direct deletion requests to icsemasterclass@gmail.com. Do not enable a frontend delete button or claim deletion is operational before this verification.

## Costs and operational ownership

Cloud Functions deployment may require a billing-enabled Firebase plan. Review current Firebase pricing and budgets before deployment. The project owner is responsible for enabling the service, securing deployment credentials and monitoring usage.
