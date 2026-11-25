# Production readiness additions

`/about`, `/contact`, `/privacy-policy`, and `/terms` are client-rendered pages served through Vercel rewrites. The contact form opens the visitor's email application; set `VITE_CONTACT_EMAIL` to a monitored support address before launch.

The discover page reserves a horizontal AdSense slot below the hero. Ads load only when `VITE_ADSENSE_CLIENT` contains the approved publisher ID (`ca-pub-` followed by 16 digits) and `VITE_ADSENSE_SLOT_ID` contains the numeric ID of a registered horizontal ad unit. Until both are configured, the slot remains a labeled placeholder. Configure consent-management and regional privacy controls before serving personalized ads. No checkout or artist payout is active.

The public sitemap and robots file use `https://junubify.vercel.app`; update those URLs, canonical/OG metadata, and the site URL in `src/production.jsx` if the canonical domain changes.
