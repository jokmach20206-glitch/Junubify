# Build checks and Supabase setup

## Build check

The GitHub Actions workflow at `.github/workflows/build.yml` runs for pushes and pull requests targeting `main`. It installs dependencies with Node.js 20 and runs `npm run build`; it does not connect to Datadog or require repository secrets.

## Set up artist uploads

For a new Supabase project:

1. Create a Supabase project and enable email authentication.
2. Apply every SQL migration in timestamp order from the repository root:
   1. `supabase/migrations/20261109000000_platform_backend.sql`
   2. `supabase/migrations/20261109010000_audio_cleanup_policy.sql`
   3. `supabase/migrations/20261109020000_payment_foundation.sql`
   4. `supabase/migrations/20261114000000_admin_track_review.sql`
   5. `supabase/migrations/20261117000000_automated_review_checks.sql`
   6. `supabase/migrations/20261118000000_admin_moderation_workflow.sql`
   7. `supabase/migrations/20261119000000_artist_profiles.sql`
   8. `supabase/migrations/20261120000000_privacy_first_analytics.sql`
   9. `supabase/migrations/20261124000000_artist_upload_genres.sql`
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Use the same public client values in your deployed web app's environment settings.
4. Add the deployed web origin to Supabase Auth's allowed redirect URLs. For Android sign-in, also add `junubify://auth/callback`.
5. To moderate uploads, assign the trusted `role: "admin"` claim in Supabase Auth app metadata using a secure admin workflow; follow `docs/admin-review.md`.

The first migration creates the private audio bucket, track table, and artist-owned upload policies. Artists sign in through Artist Studio, upload MP3/WAV/M4A/OGG/AAC/FLAC files up to 50 MB, and get an immediate submission record. Every track stays private as `pending_review` until a trusted moderator approves it. Automated metadata checks triage submissions but do not validate copyright or publish automatically.

The second migration adds cleanup for files left behind when track metadata insertion fails. The payment migration only creates a restricted ledger foundation; checkout, webhooks, and payouts remain disabled until a provider integration is implemented and verified.

Never put Supabase service-role credentials, payment secrets, or webhook secrets in frontend `VITE_` variables. The browser app should use only the Supabase project URL and its anon/publishable key.
