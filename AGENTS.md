# Dhivi development instructions

This directory is the complete Dhivi web application. The parent directory contains unrelated clinical research and must not be included in commits or uploads.

- GitHub: https://github.com/rspraneethk2076/DHIVI, branch main.
- Production: https://dhivi-live-ai-news.netlify.app/; Netlify site dd444f11-4706-44e0-860c-78875fb1d31e.
- The user authorizes useful source/backend/UI/feature improvements, bug fixes, GitHub publication and deployment. Preserve user work; never force-push or delete durable data. Do not buy plans or subscriptions.
- Read docs/maintenance.md and docs/source-audit.md. Source screening is evidence-based; retain failed endpoints and exclusions. Never invent a feed URL, timestamp, headline or popularity claim to fill a quiet section.
- Live stories must have their own original publisher date within the past 24 hours, with no future dates. Exclude issue feeds that republish old articles with a new issue timestamp. Saved articles are a personal archive. Recheck expiry on every cached serve and in the open client.
- Keep the creator/newsletter banner and Vaibhav/Staying Ahead redirects removed. Fetch original publisher sources by default.
- Preserve hourly updates, automatic upward scrolling, pause/speed controls, search, categories, bookmarks, readout pause/Stop, exact reading progress, mark-as-read and Undo.
- Source-candidate JSON contains screening evidence; source-quality-overrides.json contains editorial exclusions and metadata corrections. Run npm run sources:build after changing these. Do not edit the generated registry or audit by hand.
- Run npm test, npm run sources:check and npm run build before publication. Validate affected browser flows through the Chrome extension backend. Follow the human's Chrome operating instructions: probe openTabs, claim exact returned tabs, take fresh snapshots before UI actions, and do not use CDP or a separate Chrome instance.
- Keep node_modules, dist, .netlify, .env files, qa output and .local out of Git. The local SQLite ledger stores operational/public headline metadata only. Never put credentials, user reading history or full article bodies into the repository.
- Prefer Git for publication when authenticated. The connected GitHub API can create blobs/trees/commits and update main with an expected-head lease. Read the current head first, preserve concurrent changes, upload the app only, and verify the resulting tree. If CLI authentication is unavailable, API publication is valid; public Git fetch can then align the local checkout without overwriting files.
- Deploy the same tested revision to the existing Netlify project; record commit/deploy identifiers and verify actual live assets and API health. Do not claim GitHub/Netlify synchronization without verifying both.
- Daily maintenance is scheduled for 8:00 a.m. America/Chicago in this chat. Hourly repository monitoring is independent. Do not create duplicate schedules. Keep the computer and Codex running for local maintenance; the deployed news collector and cloud monitor do not depend on the local app.
