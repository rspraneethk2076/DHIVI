# Dhivi maintenance

Production: [Dhivi Live AI News](https://dhivi-live-ai-news.netlify.app/). Source repository: [rspraneethk2076/DHIVI](https://github.com/rspraneethk2076/DHIVI), branch `main`. Existing Netlify project: `dd444f11-4706-44e0-860c-78875fb1d31e`.

The local daily maintenance cadence is **8:00 AM America/Chicago**, following daylight saving time. Keep this computer powered on, the desktop app running, and the project available on disk for local work. These are the requirements in the [official scheduled-task documentation](https://learn.chatgpt.com/docs/automations?surface=app). A schedule does not provide GitHub or Netlify authentication; use an already authenticated CLI or a connected GitHub tool with the user's granted repository access. Verify the actual schedule configuration, repository push and deployment results before reporting them as active or synchronized. Do not create duplicate schedules.

## Daily routine

1. Inspect `git status`, the configured remote and recent upstream changes. Preserve unrelated local work. Fetch and integrate upstream changes safely before making a maintenance fix; do not discard or force-push user changes.
2. Run the production health check below. Read the aggregate source coverage and individual check results. A publisher returning 403, timing out or publishing no fresh AI news does not justify fabricated stories, bypassing access controls, or deleting a legitimate source immediately. Verify persistent failures against the publisher's public feed and update the source catalog only with real, parseable endpoints.
3. Inspect failing tests, application errors and meaningful source regressions. Make a focused fix when evidence supports one, adding a regression test where useful. Check scrolling, search, filtering, bookmarks, mark-read/undo, resume and speech in Chrome when their implementation changes; the health script only inspects HTTP, shipped assets and public API metadata.
4. Run `npm ci`, `npm run sources:check`, `npm test` and `npm run build`. Resolve failures before publication. Source changes require `npm run sources:build`; `sources:check` compares generated files with saved evidence without making publisher requests. Use `npm run sources:audit` for a deliberate HTTP/XML re-screen, review the resulting evidence and preserve editorial exclusions. Re-run the health check after fixes and record its metadata in the local ledger, including failed runs.
5. When authenticated repository access is available, review the diff and push authorized maintenance changes to the configured GitHub remote. If using the connected GitHub API, read the current head, preserve concurrent changes, verify every uploaded blob against the reviewed manifest and update the branch with an expected-head lease. Verify the resulting remote commit/tree and CI result. Do not describe a local commit or an attempted push as synchronized.
6. Publish that same tested revision using the existing authenticated Netlify CLI and project link. GitHub push and Netlify publication currently require separate actions. Use Git continuous deployment only after its connection and results have been verified. The app's manual publishing commands are in the README. Check the actual production assets and API after publishing and record a new health result.

```sh
node scripts/health-check.mjs
python scripts/record_health.py
npm run sources:check
npm test
npm run build
```

On Linux use `python3` instead of `python`. The health CLI does not need `npm install`, service keys or cookies. To check a local server, use `node scripts/health-check.mjs --base-url http://127.0.0.1:5173/`; this overwrites the latest local report with that server's result. Its JSON records the checked base URL explicitly. `--output PATH`, and the ledger's `--report PATH --db PATH`, allow separate histories.

## What the health check means

The CLI exits successfully only when the homepage, application scripts and news API return usable HTTP 200 responses and the payload passes these checks:

- Every live article has a valid original HTTP(S) link, category and publication date in the inclusive interval from `now − 24 hours` to `now`. Future dates and expired stories fail. The saved-story archive is browser state and is not part of this live API check.
- The API declares a 24-hour rolling window and a refresh interval of **3,600,000 milliseconds**. API generation/serving metadata and healthy source timestamps must be no older than **75 minutes**, allowing 15 minutes beyond the hourly refresh. Metadata may be at most one minute ahead to allow clock skew; article dates receive no future allowance.
- `sourceCoverage` exists, agrees with the listed checks, and at least one source is healthy. Fewer than **25% of configured sources** healthy is a severe outage. Partial and deferred sources are reported honestly. Exactly 25% passes with a warning. A healthy feed with no currently eligible articles warns instead of inventing content.
- Articles and delivered UI assets do not contain the removed Vaibhav Sisinty/Staying Ahead branding or their known URLs, and the API does not reactivate creator or digest fields. Generic reporting about content creators or digests remains eligible.

This is an operational signal, not a claim that every publisher is available or that all AI news is included. The static asset check does not verify rendered layout, audio output, recommendation quality or all source classification decisions. Review the specific failure codes and reproduce an issue before changing the application.

## GitHub workflows

`.github/workflows/ci.yml` checks the generated source registry, runs the full test suite and builds production assets on push, pull request and manual dispatch. `.github/workflows/monitor.yml` checks the public production site hourly at minute 17, on push, and on manual dispatch. Both use Node.js 22 on Ubuntu, read-only repository permissions, and checkout without persisted credentials. They have no hosting credentials and do not deploy or modify the repository. The cloud monitor does not depend on this computer being on.

The workflows use the official `actions/checkout`, `actions/setup-node` and `actions/upload-artifact` v7 releases, pinned to the full commit IDs verified against their official GitHub tag references on October 14, 2026. Review the publishers' official release notes when updating these pins.

Scheduled GitHub runs require the workflow on the default branch and enabled Actions. GitHub can delay scheduled runs, particularly under load; minute 17 is the requested schedule, not a precise execution guarantee. In public repositories, inactive scheduled workflows can be disabled by GitHub. See [GitHub's scheduled-workflow documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Confirm workflow runs in the repository's Actions tab after pushing; the presence of local YAML files alone does not activate monitoring.

The monitor uploads exactly `.local/latest-health.json` with seven-day artifact retention, including a failed check's report, and adds an aggregate job summary. It explicitly includes that hidden-directory file; it does not upload the whole `.local` directory. Inspect workflow failures and reports through Actions. Normal GitHub notification settings determine who receives failure notifications.

## Local metadata ledger

`scripts/record_health.py` uses Python's standard-library SQLite support. It stores `.local/dhivi.sqlite` in a transaction, with an idempotent run ID, source check metadata and headline URL/date/category metadata. Re-recording the same report updates that run without multiplying rows. The ledger never stores headline/summary text, image content, reader preferences, bookmarks, speech text, service credentials or browser cookies.

`.local/` is ignored by Git. The database stays on this computer and accumulates maintenance history until explicitly removed. The latest JSON report is replaced on each check. No server database or account is required. GitHub runners validate the same ledger writer in an ephemeral workspace; their SQLite files are not persisted or uploaded. Only the compact JSON report has seven-day GitHub retention.

## Morning Signal and reader checks

Preserve the device archive without age-based deletion or silent size eviction. Read marks hide live stories while saved copies remain visible with read badges. Verify archive persistence across reloads after changing save/read behavior. Device storage can be cleared by the user; do not describe it as cross-device synchronization.

Hands-free reading starts only after a tap, chooses the story occupying most of the visible feed, pauses scrolling for speech, waits the chosen interval and advances with a “Next news” transition. Stop must cancel pending timers as well as speech. Browser voice failures must remain visible and stop the session safely. Test sequencing and cancellation with injected speech/timers; validate audible output on an available real voice before claiming that environment played audio.

See [newsletter setup](newsletter.md) for the private Google service, confirmation/unsubscribe, 8 a.m. Chicago schedule and Gmail quotas. A disabled endpoint during pending authorization is an intentional setup state. Do not claim working delivery without a real confirmed test subscription and received message. No subscriber emails, tokens or private Sheet data belong in the local public-headline ledger, Git or deploy output.

## Hosted collection is separate

The deployed application uses a bounded Netlify Blobs hourly snapshot, a conditional refresh lease, warm-instance/CDN caching and an hourly scheduled warmer. These share public news between function instances; production and preview stores are isolated. Every served payload still removes stories outside the strict 24-hour window. Shared-storage failure falls back to bounded in-process collection, and failed/deferred publishers remain visible in coverage metadata. The local SQLite ledger is optional maintenance history, not the hosted feed database. Neither the deployed collector nor GitHub monitoring depends on the local scheduled task being awake.
