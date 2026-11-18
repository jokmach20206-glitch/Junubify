import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, BarChart3, Music2, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase.js';
import { fetchAnalyticsDashboard, getAnalyticsRegion, setAnalyticsRegion } from './lib/analytics.js';
import './analytics.css';

const metrics = [
  ['play', 'Plays', 'plays'],
  ['like', 'Likes', 'likes'],
  ['search', 'Searches', 'searches'],
  ['submission', 'Submissions', 'submissions'],
];
const regions = [
  ['', 'Do not share my region'],
  ['south_sudan', 'South Sudan'],
  ['east_africa', 'East Africa'],
  ['africa_other', 'Other Africa'],
  ['europe', 'Europe'],
  ['north_america', 'North America'],
  ['other', 'Other / prefer not to say'],
];
const prettyRegion = (key) => regions.find(([value]) => value === key)?.[1] || key;

function AnalyticsDashboard() {
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [region, setRegion] = useState(getAnalyticsRegion());
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const isAdmin = session?.user?.app_metadata?.role === 'admin';

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (error) setNotice(error.message);
      setSession(result?.session || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    fetchAnalyticsDashboard(days).then((result) => { if (active) { setData(result); setNotice(''); } })
      .catch((error) => { if (active) setNotice(error.message || 'Analytics could not be loaded. Apply the privacy-first analytics migration.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, days]);

  const dailyRows = (data?.daily || []).reduce((map, row) => {
    if (!map.has(row.date)) map.set(row.date, { date: row.date, play: 0, like: 0, search: 0, submission: 0 });
    map.get(row.date)[row.event] = Number(row.count || 0);
    return map;
  }, new Map());
  const chartDays = [...dailyRows.values()].slice(-7);
  const maxDaily = Math.max(1, ...chartDays.flatMap((day) => metrics.map(([key]) => day[key] || 0)));
  const total = (key) => Number(data?.totals?.[key] || 0);

  return <main className="analytics-page">
    <header className="analytics-header"><a href="/" aria-label="Back to Junubify"><ArrowLeft size={17}/> Junubify</a><span><ShieldCheck size={15}/> Aggregated analytics</span></header>
    <div className="analytics-wrap">
      <div className="analytics-title"><div><span className="artist-eyebrow"><BarChart3 size={14}/> PRIVACY-FIRST INSIGHTS</span><h1>{isAdmin ? 'Platform analytics' : 'Artist analytics'}</h1><p>{isAdmin ? 'High-level listening and creator activity across Junubify.' : 'Aggregate performance for your published releases.'}</p></div><select className="analytics-range" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Analytics date range"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div>
      {notice && <p className="analytics-notice" role="status">{notice}</p>}
      {!session && !loading ? <section className="analytics-login">{supabase ? 'Sign in to view artist analytics. Platform-wide reports are restricted to trusted administrators.' : 'Configure Supabase to enable analytics. No analytics are sent while the backend is unavailable.'}</section> : loading ? <div className="analytics-empty">Loading aggregated analytics…</div> : data && <>
        <section className="analytics-cards">{metrics.map(([event, label, key]) => <article className="analytics-card" key={event}><span>{label}{!isAdmin && event === 'search' ? ' (admin only)' : ''}</span><strong>{!isAdmin && event === 'search' ? '—' : total(key).toLocaleString()}</strong></article>)}</section>
        <div className="analytics-grid">
          <section className="analytics-panel"><h2>Recent activity</h2>{chartDays.length ? <><div className="analytics-chart" role="img" aria-label="Daily plays, likes, searches, and submissions for the last seven active days">{chartDays.map((day) => <div className="analytics-day" key={day.date}><div className="analytics-bar-stack">{metrics.map(([event]) => <i key={event} className={`analytics-bar ${event === 'like' ? 'likes' : event === 'search' ? 'searches' : event === 'submission' ? 'submissions' : ''}`} title={`${event}: ${day[event]}`} style={{ height: `${Math.max(day[event] ? 4 : 0, day[event] / maxDaily * 100)}%` }}/>)}</div><small>{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>)}</div><div className="analytics-legend">{metrics.map(([event, label]) => <span key={event}><i className={event === 'like' ? 'like-dot' : event === 'search' ? 'search-dot' : event === 'submission' ? 'submission-dot' : ''}/>{label}</span>)}</div></> : <div className="analytics-empty">No activity recorded in this period yet.</div>}</section>
          <section className="analytics-panel"><h2>Top tracks</h2>{data.top_tracks?.length ? <div className="analytics-track-list">{data.top_tracks.slice(0, 8).map((track) => <article className="analytics-track-row" key={track.track_id}><div><strong>{track.title}</strong><small>{track.artist} · {Number(track.likes || 0).toLocaleString()} likes</small></div><span>{Number(track.plays || 0).toLocaleString()} plays</span></article>)}</div> : <div className="analytics-empty">Track analytics will appear after listeners play or like published releases.</div>}</section>
        </div>
        {isAdmin && <section className="analytics-panel" style={{ marginTop: 14 }}><h2>Listener regions · broad groups only</h2><div className="analytics-regions">{data.regions?.length ? data.regions.map((row) => <div className="analytics-region-row" key={row.region}><span>{prettyRegion(row.region)}</span><strong>{Number(row.plays).toLocaleString()} plays</strong></div>) : <div className="analytics-empty">Region totals appear only after at least five opted-in plays in a broad region.</div>}</div><div className="analytics-region-controls"><label htmlFor="analytics-region">Optional: share a broad region with future play counts</label><select id="analytics-region" value={region || ''} onChange={(event) => { const next = event.target.value || null; setAnalyticsRegion(next); setRegion(next); }}><option value="">Do not share my region</option>{regions.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>Your selection stays in this browser; no IP lookup, exact location, or account-level region is recorded.</small></div></section>}
        <p className="analytics-privacy"><ShieldCheck size={14}/> This dashboard reads daily aggregates only. Search text, IP addresses, device IDs, and individual listener histories are never stored. Plays count after 30 seconds of listening; region totals are opt-in and hidden until five plays are aggregated.</p>
      </>}
      <footer className="analytics-footer">{data?.scope === 'platform' ? 'Platform totals are available only to trusted administrators.' : 'Artist view is limited to aggregate activity for your own releases.'} Aggregated metrics are approximate and can be affected by repeated or automated requests.</footer>
    </div>
  </main>;
}

createRoot(document.getElementById('analytics-root')).render(<AnalyticsDashboard/>);
