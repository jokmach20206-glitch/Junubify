# Junubify

Vite + React music platform with a Supabase-backed, authenticated artist submission flow. Payment screens are deliberately non-functional until a real merchant/provider integration is selected and configured.

## Run the web app

```sh
npm install
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
npm run dev
```

The anon/publishable key is intended for browser use only. Never put a Supabase `service_role` key, payment secret, or webhook secret in a `VITE_` variable.

## Listener features

Listeners can save tracks to **Your Library**, filter liked songs by genre, and use the expanded player to seek, navigate playback history, shuffle the upcoming queue, and view the next tracks. Shared track links reopen the selected track in the player. The expanded player also supports a 30-minute sleep timer and audio-output selection in browsers that expose the required device APIs. Likes and followed artists are stored locally on the current device. Lyrics, artist bios, and additional credits are shown only when the app has that content; the current catalog does not yet provide those details.

## Configure persistent song submissions

1. Create a Supabase project and enable email authentication (configure allowed redirect URLs for your deployed site).
2. Run these migrations in order in the Supabase SQL editor: `20261109000000_platform_backend.sql`, `20261114000000_admin_track_review.sql`, then `20261117000000_post_publish_track_verification.sql`.
3. Set the project URL and anon/publishable key in `.env.local` and in your web host's environment settings.
4. Start the app. Artists request an email sign-in link, then submit metadata and audio from Artist Studio.

Audio uploads go to a 50 MB bucket under the authenticated artist's UUID. New submissions are published immediately and have a null `verified_at` until a trusted administrator verifies them in **Verify uploads** (`/admin.html`). Admins should listen to the audio, check the artist/title/cover metadata, and confirm the submitter's rights assertion. **Reject & remove** changes the status to `rejected` and removes the track from the public catalog. Existing tracks that were already published are marked verified by the migration; older pending submissions remain private until an admin uses **Publish & verify**. Audio is served with temporary signed URLs. The UI's sample tracks remain demo content.

Immediate publication means content is public before an admin checks it. Add rate limits/abuse controls, stronger content validation/scanning, a listener reporting path, backup/retention policies, and production auth email configuration before launch. If pre-publication safety is required, restore the pending-review insert policy rather than using this post-publication workflow. Browser file size/type checks are usability checks, not a security boundary.

## Deploy to Vercel

`vercel.json` configures the Vite build (`npm run build`, output `dist`) and SPA fallback. Import `Prototype20204/Junubify2` in Vercel, use the repository root as Root Directory, and deploy the `main` branch. In Vercel project settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the environments you intend to use, then redeploy. Add the deployed site URL to Supabase Auth's allowed redirect URLs.

The GitHub repository homepage is `https://junubify.vercel.app`, while an older screenshot showed `https://junubifysounds.vercel.app`. Verify which Vercel project owns the URL you are opening. In Vercel, inspect the latest deployment's source repository, branch, and commit, then assign the desired domain to that project under **Settings → Domains**. A push to GitHub only updates a Vercel project if that project is connected to this repository and branch.

If the app error screen appears, it displays the browser-side exception message to help diagnose the actual failure. Confirm the deployment is from the latest `main` commit and open the deployment's own URL, not an older deployment alias.

## Payments: not activated

This repository does not yet have a payment processor integration, and no payment or payout is made. Local providers have different merchant APIs, eligibility, webhook signatures, settlement/currency rules, and payout requirements; do not assume any provider is available for your business or country. To implement the real flow, choose the provider and merchant product you have access to and give the team its official API documentation and sandbox onboarding instructions. Keep credentials in server-side secrets, never in the browser. The `payment_events` and `royalty_ledger` tables are server-only foundations, not proof of received payments or payable earnings.

A production payment integration must create checkout sessions server-side, verify signed provider webhooks, process event IDs idempotently, reconcile settlements/refunds, grant entitlements only after verified payment, and calculate royalties from reconciled revenue. Payouts additionally need provider support, artist identity/compliance checks, and reconciliation. The proposed plan prices and 70% split are product placeholders until terms and financial rules are confirmed.
