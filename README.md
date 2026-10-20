# Dhivi Live AI News

By sai praneeth renduchinthala.

[Live application](https://dhivi-live-ai-news.netlify.app/) · [GitHub repository](https://github.com/rspraneethk2076/DHIVI)

An independent, image-led AI news reader with a classic dark hacker theme. Headlines move upward automatically, with pause/play, 0.5–2× speed, search, category filters and a personal reading archive. The feed uses original publisher news and research; it has no creator banner, newsletter redirect or embedded videos.

## Read and discover

- Browse all AI news, Technical, AI clinical, New AI tools and AI geopolitical. Search matches every typed word across headlines, publisher excerpts, source names and tags.
- `Spotlight` explains its editorial ranking using recency, concrete impact and conservative related-topic evidence across publishers. `Latest` orders stories chronologically. `For you` adds bounded preferences learned from reading and saving on this device. These signals do not measure social-media virality or guarantee a story's importance.
- Live stories must have their own publisher publication date within the preceding **24 hours**, including the exact boundary and excluding every future timestamp. They age out in the server response, browser cache and open page. Saved stories deliberately remain an older personal archive.
- Cards show original links, publication dates and publisher thumbnails. Missing or blocked images use clearly labeled local topic illustrations.
- Article age and Spotlight recency labels follow the reading clock, including stories restored from device cache. Saved ranking evidence is preserved; a cached “within 3 hours” explanation cannot stay on a 23-hour-old story.
- Save stories without a time limit or silent 200-story eviction. `Mark as read` hides stories from live news/search while saved stories stay in the archive with a read badge; immediate Undo and the help panel can restore hidden stories. Read history keeps at most 1,000 marks within 30 days while retaining bookmarks.
- The reader remembers the visible story and position within it, filters, ordering, scroll preference and speed. New headlines preserve your place; if a story expires or is marked read, restoration selects the next eligible stored story. Progress is saved during scrolling and when leaving. Mid-read updates are offered through the new-stories control.
- `Listen` reads a headline or headline plus publisher excerpt using browser speech voices. Scrolling pauses until completion, Stop or an error. Hands-free mode starts with one explicit tap: it reads the visible story, pauses 1–15 seconds, says “Next news”, moves to the next card and continues without per-card taps. Choose headline or headline plus excerpt, and 0.75–1.5× voice speed. Stop cancels both speech and pending advancement; manual scrolling selects the visible card after settling. Switching filters, opening help/newsletter, leaving the tab or reaching the end stops the session. Readout never starts automatically on opening. Speech output depends on the browser, installed voices and audio device.
- Scrolling pauses during focused reading/search, speech and for four seconds after manual scrolling. It loops at the end. Space toggles scrolling and `/` focuses search. Reduced-motion users start paused. Desktop and mobile have visible controls.

Open the **Morning briefing** button to subscribe by email without an account. The daily digest covers up to ten fresh stories across the five desks, limits repeated publishers, links original reporting and includes confirmation/unsubscribe. Delivery uses the owner’s Gmail through a private Apps Script service; see [email setup](docs/newsletter.md). The UI checks delivery readiness and does not accept subscriptions before setup.

Preferences, saves, read history and progress stay in this browser's local storage. They do not sync across devices; clearing or blocking browser storage affects persistence. Clinical and research categories describe topics and provenance, not clinical quality or treatment recommendations.

## Sources and hourly collection

The October 14, 2026 catalog screens **335 distinct endpoints** and retains **200 active feeds across 85 publisher groups**: major newsrooms, first-party AI/model/tool vendors, university laboratories, journals and public institutions. Feed count and publisher count are different measures. See [the source audit](docs/source-audit.md) and [complete screening evidence](public/source-audit.json), including failed endpoints and editorial exclusions. A verified feed can contain no eligible AI stories today.

The app requests news on opening and checks **every hour** while open. Returning to the tab checks again after the hourly interval; manual refresh and reconnect requests use the same bounded backend cache. Publishers decide when they release news, so a refresh does not promise new stories.

Netlify Functions aggregate public RSS/Atom/RDF feeds, apply AI relevance rules and preserve original dates. Collection has bounded concurrency, per-host limits, body limits and a total deadline. Unchecked feeds are labeled deferred, publisher failures are reported, and duplicate reporting is consolidated with publisher diversity considered. Issue feeds that redate older articles and low-value guide collections are excluded.

A bounded **Netlify Blobs hourly snapshot** shares data between function instances, with a conditional refresh lease to reduce duplicate collection. Production and preview caches are isolated. Memory and CDN caching also apply; every API response filters expired stories again, and CDN lifetime stops before content becomes too old. If shared storage is unavailable, bounded in-process fetching remains available. Cached fallbacks cannot make expired or future stories eligible. An hourly scheduled function warms the cache with a shorter collection deadline; deferred source checks remain visible rather than being presented as successful.

The source explorer lists feed availability, publisher groups and original publisher links, with source-type and name filters. Partial coverage is normal and reported honestly. No API key or model-provider account is needed: the app uses public publisher headlines and excerpts, not generated news.

## Run and validate

Run commands from this app directory with Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Vite serves the actual Netlify news handler locally at `/.netlify/functions/news`. Publisher fetching can take time on a cold start.

```sh
npm run sources:check
npm test
npm run build
```

`sources:check` checks that the generated registry and audit match the committed screening evidence; it does not fetch every publisher. `npm run sources:audit` performs new public HTTP/XML screening and rebuilds the registry. Review that evidence and any exclusions before publication. After an intentional catalog or quality-override edit, run `npm run sources:build` and then the validation commands again.

## Publish the same revision to GitHub and Netlify

GitHub is [rspraneethk2076/DHIVI](https://github.com/rspraneethk2076/DHIVI), branch `main`. Production uses the existing Netlify project `dd444f11-4706-44e0-860c-78875fb1d31e` at [dhivi-live-ai-news.netlify.app](https://dhivi-live-ai-news.netlify.app/).

Publication currently uses a **GitHub push and a separate manual Netlify deploy**. Review and publish the tested source revision with an authenticated Git CLI or the connected GitHub API with granted repository access. Verify the remote commit, preserve concurrent changes and never force-push. If using the upload helper, check its reviewed manifest and verify each uploaded blob against that manifest before updating the branch.

`netlify.toml` configures Vite output, function bundling and response headers. Use the existing authenticated Netlify CLI. If the local project is not linked, authenticate and link the existing site:

```sh
npx netlify-cli login
npx netlify-cli link --id dd444f11-4706-44e0-860c-78875fb1d31e
```

Then deploy the same tested revision:

```sh
npm run sources:check
npm test
npm run build
npx netlify-cli deploy --prod --no-build --dir dist --functions netlify/functions --site dd444f11-4706-44e0-860c-78875fb1d31e
node scripts/health-check.mjs
python scripts/record_health.py
```

On Linux use `python3`. Confirm both the GitHub commit/tree and the actual production assets/API before describing them as synchronized. A GitHub push does not itself deploy this project unless a working Netlify Git connection has separately been configured and verified. Local credentials, `.netlify`, `.env`, build output and `.local` are excluded from Git.

## Maintenance and monitoring

The daily maintenance cadence is **8:00 AM America/Chicago**, following daylight saving time. The local scheduled task checks sources and production health, investigates bugs, validates changes and publishes authorized fixes when authenticated access is available. Keep the computer powered on, the desktop app running and this project on disk for local maintenance. See [the maintenance guide](docs/maintenance.md) for the concrete routine and activation checks.

GitHub CI validates the generated source registry, full test suite and production build on push, pull request and manual dispatch. The independent production monitor checks the live site hourly at minute 17, on push and on manual dispatch. It checks HTTP/UI delivery, strict article freshness, one-hour refresh metadata and source coverage; it treats fewer than 25% healthy sources as a severe outage. Reports are retained as GitHub artifacts for seven days. These read-only workflows have no hosting credentials and do not deploy. Confirm them in the repository's Actions tab after publication; scheduled runs can be delayed.

For a local operational history:

```sh
node scripts/health-check.mjs
python scripts/record_health.py
```

The compact latest report is `.local/latest-health.json`. Python's standard-library SQLite writer maintains `.local/dhivi.sqlite` with idempotent health runs, source-check results and headline URL/date/category metadata. It stores no full article text or reader preferences. This optional local ledger does not power the website and stays out of Git and deploy uploads.

[Backend notes](readme-backend.md) describe collection and cache behavior. `design/concept.png` and `design/concept-prompt.txt` preserve the visual reference.
