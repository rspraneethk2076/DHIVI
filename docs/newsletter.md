# Dhivi Morning Signal

An email-only, confirmed subscription. No account or reader sign-in is needed.

The morning digest selects up to ten current publisher headlines/excerpts across AI news, Technical, Clinical, Tools and Geopolitical. It includes populated sections, limits a publisher to two stories, consolidates duplicate headlines/URLs and preserves original links and publication dates. No generated or fabricated news. Both the digest endpoint and the sending worker reject stories outside the preceding 24 hours. Quiet sections stay quiet.

## Gmail service

`scripts/newsletter-google.gs` is the complete Apps Script service. Deploy it under the Gmail account requested by the owner. `setupNewsletter()` checks the exact owner, creates a **private** subscriber Sheet, initializes a bridge secret, and creates one 15-minute time trigger if absent. `MailApp` sends mail without inbox-read access. Google authorization is required before setup can run. Review the requested Google scopes; do not grant another account access or make the Sheet public.

The trigger checks **08:00–08:59 America/Chicago**, including daylight saving time. The first successful tick normally sends around 8:00–8:15; Google time triggers are approximate, not an exact-minute guarantee. Later ticks retry unsent rows. Each confirmed recipient is reserved for the Chicago calendar date before sending; a second tick cannot send another copy. A crash between reservation and recording success leaves `deliveryState=sending` for manual review, favoring no duplicates over an unsafe automatic resend.

Gmail/App Script quotas apply: consumer accounts currently allow 100 email recipients/day, shared between confirmation and digest messages. The worker checks remaining quota, never upgrades or buys capacity, and throws a visible execution failure on exhaustion/runtime limits. Subscribers beyond remaining quota do not receive that day's edition unless capacity becomes available during the 8 a.m. hour. A dedicated email delivery service is needed if the audience outgrows this account. [Google quota documentation](https://developers.google.com/apps-script/guides/services/quotas).

## Connect

1. Open Apps Script under the requested Gmail account; create a project named **Dhivi Morning Signal** and paste the reviewed `scripts/newsletter-google.gs` into `Code.gs`.
2. Save and run `setupNewsletter`. The owner must authorize Google access for sending mail, the private Sheet, fetching the public digest endpoint, and the timed trigger. It sends no email during setup.
3. Deploy as a Web App: execute as the owner, accessible to Anyone. Only the bridge accepts POSTs; every request requires a high-entropy server secret. The Sheet is not shared. No public GET data endpoint exists in the script.
4. Copy the Web App `/exec` URL into the existing Netlify site's **production-only secret** `NEWSLETTER_GOOGLE_SCRIPT_URL`. Copy `BRIDGE_SECRET` from Apps Script Project Settings into the production-only secret `NEWSLETTER_BRIDGE_SECRET`. Prefer function-only scopes when the existing plan supports them. This project's current plan requires the standard secret scopes (Builds, Functions and Runtime); keep Post processing excluded and every non-production value empty. Do not purchase an upgrade for granular scopes. No client code reads either value, and neither key uses the `VITE_` prefix. Keep both out of Git, client code, URLs, logs and chat. This is an internal service credential, not the Gmail password. Verify the persisted dashboard/API settings and live readiness; a CLI exit code alone is insufficient.
5. Deploy the matching tested app revision. Verify `GET /.netlify/functions/newsletter` says `enabled:true`. The app exposes no subscriber list. Preview/local delivery stays disabled.
6. Submit the owner's sender address through the app, open its confirmation email, and explicitly confirm in the app. Verify pending → active in the private Sheet. Select `sendTestDigest` in the private script editor and run it to deliver one `[TEST]` edition to the confirmed owner only, including outside the normal morning window. Verify receipt, then test unsubscribe and that further owner test sends are refused. This operator-only function is not exposed by the bridge or attached to a timer and does not reserve or alter normal daily delivery. Do not enroll anyone without their confirmation.

Updating script code requires publishing a new Apps Script deployment version while retaining the same Web App URL. Re-running setup preserves durable subscriber data and existing trigger. Never delete the Sheet or reset subscribers to test.

## Consent and delivery safeguards

The public app requires explicit consent, validates email and request origin, bounds input, and uses a platform per-IP/domain rate limit. The private worker applies an hour-long per-address confirmation cooldown without exposing whether an address exists. No digest is sent before confirmation. Pending links expire after 24 hours and are invalidated on confirmation or unsubscribe. Tokens are high-entropy random values; pending tokens are hashed at rest. Unsubscribe links carry only a random token, no email address. They open a landing page; an explicit POST confirms the action so email link scanners do not change consent.

The app shows a clear unavailable state when sender setup is absent or the service is failing. It never claims an email was sent on provider failure. Google authorization and a deployed worker are prerequisites; committed integration code alone is not working delivery.

Subscriber email/state remain in the owner's private Google Sheet. The operational SQLite ledger remains public headline metadata only. Saved stories and reading preferences remain local to each device/browser and do not sync by email. Marking a story read does not remove a saved copy. Device storage exhaustion produces a visible error without evicting earlier saves; clearing site data still removes that device's archive.
