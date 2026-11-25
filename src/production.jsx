import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EllipsisVertical, X } from 'lucide-react';
import './production.css';

const SITE_URL = 'https://junubify.vercel.app';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'hello@junubify.com';
const POLICY_UPDATED = 'November 25, 2026';

const pages = {
  '/about': {
    title: 'About Junubify',
    description: 'Learn about Junubify, a place to discover South Sudanese music and support local artists.',
  },
  '/contact': {
    title: 'Contact Junubify',
    description: 'Get in touch with the Junubify team about music, artist submissions, or support.',
  },
  '/privacy-policy': {
    title: 'Privacy policy',
    description: 'How Junubify handles account information, local storage, analytics, and advertising.',
  },
  '/terms': {
    title: 'Terms of use',
    description: 'Terms for using Junubify and submitting music to the platform.',
  },
};

export function AdBanner({ slotId, format = 'horizontal' }) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT;
  const active = Boolean(client && slotId);

  useEffect(() => {
    if (!active) return undefined;
    const scriptId = 'junubify-adsense-script';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      document.head.appendChild(script);
    }
    const ad = document.querySelector(`[data-ad-slot="${CSS.escape(slotId)}"]`);
    if (ad && !ad.dataset.requested) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        ad.dataset.requested = 'true';
      } catch {
        // Ad blocking and unavailable inventory are normal; the reserved slot remains in place.
      }
    }
    return undefined;
  }, [active, client, slotId]);

  return (
    <aside className={`ad-banner ad-banner--${format}`} aria-label="Advertisement">
      {active ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={client}
          data-ad-slot={slotId}
          data-ad-format={format === 'horizontal' ? 'horizontal' : 'rectangle'}
          data-full-width-responsive="true"
        />
      ) : (
        <span className="ad-banner-fallback">Advertisement</span>
      )}
    </aside>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <a className="site-footer-brand" href="/" aria-label="Junubify home">JUNUBIFY</a>
      <p>South Sudan&apos;s sound, all in one place.</p>
      <nav aria-label="Information and policies">
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy-policy">Privacy policy</a>
        <a href="/terms">Terms</a>
      </nav>
      <small>© {new Date().getFullYear()} Junubify. Artist payments are not currently available.</small>
    </footer>
  );
}

function LegalLayout({ title, children }) {
  return (
    <div className="legal-site">
      <header className="legal-header">
        <a href="/" className="site-footer-brand">JUNUBIFY</a>
        <a className="legal-home-link" href="/">Back to music</a>
      </header>
      <main className="legal-content">
        <span className="legal-kicker">JUNUBIFY · INFORMATION</span>
        <h1>{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function AboutPage() {
  return <LegalLayout title="A home for South Sudanese music">
    <p>Junubify is a music discovery platform built to make it easier to find emerging voices and hometown favorites from South Sudan. Explore releases, listen to featured tracks, and share the music you love.</p>
    <h2>For artists and listeners</h2>
    <p>Artists can submit music through Artist Studio for review. Published catalog availability depends on the platform&apos;s current configuration and review process. Be sure you have the rights to any music you submit.</p>
    <h2>Built to grow responsibly</h2>
    <p>Junubify is preparing advertising and other sustainable ways to support the service. No subscription payment, artist payout, or other payment is processed through the platform at this time.</p>
  </LegalLayout>;
}

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    if (!name || !email || !message) return;
    const body = `From: ${name}\nReply to: ${email}\n\n${message}`;
    setMessageBody(body);
    setSubmitted(true);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Junubify contact: ${name}`)}&body=${encodeURIComponent(body)}`;
  };
  return <LegalLayout title="Contact us">
    <p>Questions about the platform or an artist submission? Send us a message. Submitting this form opens your email app so you can send it directly.</p>
    <form className="contact-form" onSubmit={handleSubmit}>
      <label>Name<input name="name" autoComplete="name" maxLength="100" required /></label>
      <label>Email<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
      <label>How can we help?<textarea name="message" rows="6" maxLength="5000" required /></label>
      <button type="submit">Continue to email</button>
      {submitted && <p className="contact-success" role="status">Your email app should open with your message. If it did not, copy the prepared message below and email {CONTACT_EMAIL}.</p>}
      {submitted && <label className="contact-copy-label">Prepared message<textarea readOnly value={messageBody} /></label>}
    </form>
    <p className="legal-note">To use a different support address, configure <code>VITE_CONTACT_EMAIL</code> in your deployment environment.</p>
  </LegalLayout>;
}

function PrivacyPage() {
  return <LegalLayout title="Privacy policy">
    <p><strong>Last updated: {POLICY_UPDATED}</strong></p>
    <p>This policy explains how Junubify handles information when you browse the music platform, use an account, or submit music. The service is evolving; this notice should be reviewed and updated as integrations and practices change.</p>
    <h2>Information you provide</h2>
    <p>If you request an email sign-in link, the authentication provider processes your email address to provide sign-in. Artist submissions may include account identifiers, track metadata, and audio files. These are handled by the configured Supabase project and subject to its security and retention configuration.</p>
    <h2>Local storage and cookies</h2>
    <p>Junubify stores preferences such as theme, liked tracks, and follows in your browser&apos;s local storage. Supabase authentication may use browser storage to maintain a sign-in session. These technologies are not all browser cookies, but they can store or access information on your device. You can clear local app data in your browser; doing so may sign you out or remove saved preferences.</p>
    <h2>Analytics</h2>
    <p>Optional, aggregated usage analytics may be available when configured. The app provides an analytics preference; disabling it should stop the corresponding optional event collection. Essential authentication and security operations may still run. Do not enter sensitive personal information into search or music metadata.</p>
    <h2>Advertising and third parties</h2>
    <p>Advertising is inactive unless the site owner configures an advertising client and slot. If Google AdSense or another advertising provider is enabled, that provider and its partners may use cookies, local storage, device information, and similar technologies to serve, measure, or personalize ads, subject to their own policies and the choices available in your region. Third-party providers may process information under their own privacy notices. Junubify does not control their independent practices.</p>
    <p>Before enabling personalized ads, the operator must configure the provider account, publish required disclosures, and implement any consent-management and regional controls required for the audiences served. You can also use available browser settings and provider privacy controls to manage advertising technologies.</p>
    <h2>Sharing, retention, and your choices</h2>
    <p>Information is processed by service providers needed to operate authentication, hosting, storage, analytics, or advertising integrations that are actually enabled. Retention depends on the relevant service configuration and legal or security requirements. You may clear local preferences, sign out, or contact the operator to ask about account data or artist submissions.</p>
    <h2>Children and policy changes</h2>
    <p>Junubify is not designed to knowingly collect personal information from children. This notice may change when the service or its providers change; the effective date above will be updated when a revised policy is published.</p>
    <p>For privacy questions, use the <a href="/contact">contact page</a>.</p>
  </LegalLayout>;
}

function TermsPage() {
  return <LegalLayout title="Terms of use">
    <p><strong>Last updated: {POLICY_UPDATED}</strong></p>
    <p>By using Junubify, you agree to use the service lawfully and respectfully. If you do not agree, do not use the platform.</p>
    <h2>Music and artist submissions</h2>
    <p>You are responsible for content you submit. You must own or control the necessary rights and permissions, including rights in recordings, compositions, artwork, and any people featured. By submitting content, you give Junubify permission to store, review, and display it as needed to operate the service and, if approved, make it available through the platform. You retain your ownership. Do not submit unlawful, infringing, deceptive, or harmful material.</p>
    <h2>Accounts and availability</h2>
    <p>Keep account credentials secure and provide accurate information. Submissions may be reviewed, rejected, removed, or restricted. The service, catalog, and features may change or be unavailable, and no particular level of availability is guaranteed.</p>
    <h2>Payments and advertising</h2>
    <p>Payments, subscriptions, royalties, and artist payouts are not currently active. Do not rely on play counts or platform content as a promise of earnings. Advertisements may appear if the operator configures an advertising provider; third-party ads and services are governed by their own terms.</p>
    <h2>Acceptable use and liability</h2>
    <p>Do not interfere with the service, bypass access controls, upload malicious files, or misuse another person&apos;s content or account. Junubify is provided as available, to the extent permitted by law. These terms do not limit rights or remedies that cannot legally be excluded.</p>
    <h2>Changes and contact</h2>
    <p>Terms may be updated as the service develops. Continued use after an update means you accept the revised terms to the extent allowed by law. Questions can be sent through the <a href="/contact">contact page</a>.</p>
    <p className="legal-note">These pages are a general product disclosure, not legal advice. Have the terms and privacy disclosures reviewed for the jurisdictions and services relevant to your launch.</p>
  </LegalLayout>;
}

function LegalPage({ path }) {
  if (path === '/about') return <AboutPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/privacy-policy') return <PrivacyPage />;
  if (path === '/terms') return <TermsPage />;
  return null;
}

function useProductionMeta(path) {
  useEffect(() => {
    const page = pages[path];
    const title = page ? `${page.title} | Junubify` : 'Junubify — South Sudan Beats';
    const description = page?.description || 'Discover South Sudanese music, emerging voices, and hometown favorites on Junubify.';
    document.title = title;
    const setMeta = (selector, attribute, value, create) => {
      let element = document.head.querySelector(selector);
      if (!element && create) {
        element = document.createElement('meta');
        if (selector.startsWith('meta[name=')) element.name = selector.match(/"([^"]+)"/)?.[1] || '';
        else element.setAttribute('property', selector.match(/"([^"]+)"/)?.[1] || '');
        document.head.appendChild(element);
      }
      if (element) element.setAttribute(attribute, value);
    };
    setMeta('meta[name="description"]', 'content', description, true);
    setMeta('meta[property="og:title"]', 'content', title, true);
    setMeta('meta[property="og:description"]', 'content', description, true);
    setMeta('meta[property="og:url"]', 'content', `${SITE_URL}${path === '/' ? '/' : path}`, true);
    setMeta('meta[name="twitter:title"]', 'content', title, true);
    setMeta('meta[name="twitter:description"]', 'content', description, true);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE_URL}${path === '/' ? '/' : path}`;
    document.documentElement.dataset.legalPage = String(Boolean(page));
    return () => { delete document.documentElement.dataset.legalPage; };
  }, [path]);
}

export default function ProductionReadiness() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/');
  const [header, setHeader] = useState(null);
  const [footerTarget, setFooterTarget] = useState(null);
  const [adTarget, setAdTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useProductionMeta(path);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname.replace(/\/$/, '') || '/');
    window.addEventListener('popstate', updatePath);
    const root = document.getElementById('root');
    if (!root) return () => window.removeEventListener('popstate', updatePath);

    const placeSiteChrome = () => {
      const app = root.querySelector('.app-shell');
      if (!app) return;
      const topbar = app.querySelector('.topbar');
      if (topbar && topbar !== header) setHeader(topbar);
      let footer = app.querySelector('.site-footer-mount');
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'site-footer-mount';
        app.appendChild(footer);
      }
      setFooterTarget((current) => current === footer ? current : footer);
      const hero = app.querySelector('.trend-hero');
      if (hero) {
        let ad = hero.nextElementSibling;
        if (!ad?.classList.contains('site-ad-mount')) {
          ad = document.createElement('div');
          ad.className = 'site-ad-mount';
          hero.insertAdjacentElement('afterend', ad);
        }
        setAdTarget((current) => current === ad ? current : ad);
      } else setAdTarget(null);
    };
    const observer = new MutationObserver(placeSiteChrome);
    observer.observe(root, { childList: true, subtree: true });
    placeSiteChrome();
    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', updatePath);
    };
  }, [header]);

  useEffect(() => {
    if (header) header.dataset.menuOpen = String(menuOpen);
    const onKeyDown = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    const closeOnNavigation = (event) => {
      if (event.target.closest('.nav-tabs button')) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', closeOnNavigation);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', closeOnNavigation);
    };
  }, [header, menuOpen]);

  if (pages[path]) return <LegalPage path={path} />;
  return <>
    {header && createPortal(
      <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <X size={21} /> : <EllipsisVertical size={21} />}
      </button>, header,
    )}
    {menuOpen && createPortal(<button className="mobile-menu-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />, document.body)}
    {adTarget && createPortal(<AdBanner slotId="junubify-discover-horizontal" format="horizontal" />, adTarget)}
    {footerTarget && createPortal(<SiteFooter />, footerTarget)}
  </>;
}
