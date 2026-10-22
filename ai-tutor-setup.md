# Velora AI Tutor setup

The front-end UI is added to the GitHub Pages site. GitHub Pages cannot run a private AI API; complete these steps before live answers work.

1. Create a Gemini API key at https://aistudio.google.com/app/apikey. Review the current model availability, quota, and regional terms. Free quota may be available but is limited and not guaranteed; don't enable paid billing if your target is ₹0.
2. In https://dash.cloudflare.com/ open **Workers & Pages → Create → Worker**, create a Worker, and replace its starter code with all of `worker/ai-tutor-worker.js`. Deploy.
3. In Worker **Settings → Variables and Secrets**, add `GEMINI_API_KEY` as a **Secret**. Never put the key in this repository or browser JavaScript.
4. Test `https://YOUR-WORKER.workers.dev/health`; expect `ok:true` and `configured:true`.
5. Edit `ai-tutor-config.js` in GitHub and replace the placeholder URL with your real Worker URL plus `/api/chat`. Commit, wait for Pages to publish, then test the tutor.

API: GET `/health`; POST `/api/chat` with JSON `{ "subject":"Physics", "message":"Explain torque", "history":[] }`. Requests are capped at 5,000 question characters and use up to 8 prior messages. CORS is restricted to this GitHub Pages origin and localhost. Add Cloudflare rate limiting/abuse monitoring before promoting publicly; a public endpoint can consume your provider quota. No API key is required or returned by the front end.
