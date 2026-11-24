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

## Configure persistent song submissions

1. Create a Supabase project and enable email authentication.
2. Follow [the Supabase setup guide](docs/build-and-supabase-setup.md) to apply every migration in timestamp order and configure redirect URLs.
3. Copy `.env.example` to `.env.local` and set the project URL and anon/publishable key. Use these same public client values in your web host's environment settings.
4. Start the app. Artists request an email sign-in link, then upload metadata and audio from Artist Studio.

Audio uploads go to a private 50 MB bucket under the authenticated artist's UUID. Database and storage row-level security restrict upload/read access. Admin-verified artists whose uploads pass metadata checks publish automatically; other tracks are queued as `pending_review` for moderator approval. Metadata checks and artist verification do not verify copyright ownership. The public catalog fetches published rows, and audio is served with temporary signed URLs. The UI's sample tracks remain demo content.

Before launch, apply all migrations, configure a trusted administrator, add rate limits/abuse controls, stronger content validation/scanning, backup/retention policies, and production auth email configuration. The browser file size/type checks are usability checks, not a security boundary.

## Deploy to Vercel

`vercel.json` configures the Vite build (`npm run build`, output `dist`) and SPA fallback. Import `Prototype20204/Junubify2` in Vercel, use the repository root as Root Directory, and deploy the `main` branch. In Vercel project settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the environments you intend to use, then redeploy. Add the deployed site URL to Supabase Auth's allowed redirect URLs.

The GitHub repository homepage is `https://junubify.vercel.app`, while an older screenshot showed `https://junubifysounds.vercel.app`. Verify which Vercel project owns the URL you are opening. In Vercel, inspect the latest deployment's source repository, branch, and commit, then assign the desired domain to that project under **Settings → Domains**. A push to GitHub only updates a Vercel project if that project is connected to this repository and branch.

If the app error screen appears, it displays the browser-side exception message to help diagnose the actual failure. Confirm the deployment is from the latest `main` commit and open the deployment's own URL, not an older deployment alias.

## Prepare the Android app

The Capacitor Android wrapper uses `com.junubify.app`. Run `npm run android:sync` to build the web app and sync it into the native project, then open it in Android Studio with `npm run android:open`. See [Google Play submission preparation](docs/google-play-submission.md) for signing, Supabase deep-link setup, and the remaining release checklist. The wrapper is not a signed or submitted Play release yet.

## Payments: not activated

This repository does not yet have a payment processor integration, and no payment or payout is made. Local providers have different merchant APIs, eligibility, webhook signatures, settlement/currency rules, and payout requirements; do not assume any provider is available for your business or country. To implement the real flow, choose the provider and merchant product you have access to and give the team its official API documentation and sandbox onboarding instructions. Keep credentials in server-side secrets, never in the browser. The `payment_events` and `royalty_ledger` tables are server-only foundations, not proof of received payments or payable earnings.

A production payment integration must create checkout sessions server-side, verify signed provider webhooks, process event IDs idempotently, reconcile settlements/refunds, grant entitlements only after verified payment, and calculate royalties from reconciled revenue. Payouts additionally need provider support, artist identity/compliance checks, and reconciliation. The proposed plan prices and 70% split are product placeholders until terms and financial rules are confirmed.
