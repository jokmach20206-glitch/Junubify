# Production readiness additions

`/about`, `/contact`, `/privacy-policy`, and `/terms` are client-rendered pages served through Vercel rewrites. The contact form opens the visitor's email application; set `VITE_CONTACT_EMAIL` to a monitored support address before launch.

The discover page reserves a horizontal AdSense slot below the hero. Ads remain a labeled placeholder unless `VITE_ADSENSE_CLIENT` is set and the slot ID in `src/production.jsx` is registered in the AdSense account. Configure consent-management and regional privacy controls before serving personalized ads. No checkout or artist payout is active.

The public sitemap and robots file use `https://junubify.vercel.app`; update those URLs, canonical/OG metadata, and the site URL in `src/production.jsx` if the canonical domain changes.
