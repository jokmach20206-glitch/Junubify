# Automated checks and admin confirmation

The automated-check dashboard is available at `/admin.html`; manual decisions are made separately at `/admin-confirm.html`. Both require an authenticated Supabase user whose trusted **app metadata** contains `role: "admin"`.

## Enable checks and confirmation

1. Apply `supabase/migrations/20261114000000_admin_track_review.sql` after the platform backend migration.
2. Apply `supabase/migrations/20261117000000_automated_review_checks.sql`.
3. Apply later timestamped migrations, including `20261118000000_admin_moderation_workflow.sql`, `20261124000000_artist_upload_genres.sql`, and `20261124010000_verified_artist_fast_lane.sql`.
4. Assign `role: "admin"` in the selected user's Supabase Auth **app metadata** using a trusted Auth admin workflow. Never allow the user to set this role from the client or put a service-role key in the browser. Refresh the user's session after changing the role so the JWT includes the updated claim.
5. Sign in at `/admin.html` using that account, then open its confirmation page to preview audio, publish, or reject submissions.

Automated checks flag blank names, unsupported genres or audio extensions, non-HTTPS cover URLs, and possible duplicate titles. They do not scan audio or verify copyright. Only an admin-verified artist with no metadata flags is eligible for automatic publication; all other tracks stay private for manual review. Artist verification and the rights-confirmation checkbox do not replace a real rights review. Supabase Storage enforces its configured size and MIME-type limits.

The database policies enforce admin access even if someone bypasses the UI. Artists and ordinary signed-in users cannot see the review queue or update track status. The database records the authenticated admin and timestamp when a pending submission is published or rejected.
