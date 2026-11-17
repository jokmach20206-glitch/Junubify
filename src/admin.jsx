import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BadgeCheck, Check, Clock3, Headphones, LoaderCircle, LogOut, Music2, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createReviewAudioUrl, fetchPendingReviewCounts, fetchPendingReviewTracks, reviewTrack } from './lib/admin.js';
import './admin.css';

const isConfirmationPage = window.location.pathname.endsWith('/admin-confirm.html');
const reviewFlagLabels = {
  blank_title: 'Song title is blank.',
  blank_artist: 'Artist name is blank.',
  unsupported_genre: 'Genre is not in the supported list.',
  cover_must_use_https: 'Cover image URL must use HTTPS.',
  unsupported_audio_extension: 'Audio file extension is not supported.',
  possible_duplicate_title: 'A track with this title already exists for this artist.',
  not_checked: 'Automated checks were not run for this older submission.',
};

function AdminApp() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [tracks, setTracks] = useState([]);
  const [counts, setCounts] = useState({ passed: 0, flagged: 0 });
  const [audioUrls, setAudioUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [notice, setNotice] = useState('');

  const isAdmin = session?.user?.app_metadata?.role === 'admin';

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  const refreshQueue = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setNotice('');
    try {
      if (isConfirmationPage) {
        setTracks(await fetchPendingReviewTracks());
        setAudioUrls({});
      } else {
        setCounts(await fetchPendingReviewCounts());
      }
    } catch (error) {
      setNotice(error.message || 'Could not load pending submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) refreshQueue();
    else {
      setTracks([]);
      setCounts({ passed: 0, flagged: 0 });
    }
  }, [isAdmin]);

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setNotice('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    setNotice(error ? error.message : 'Check your email for the secure sign-in link.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
  };

  const preview = async (track) => {
    if (audioUrls[track.id]) return;
    try {
      const url = await createReviewAudioUrl(track.audioPath);
      setAudioUrls((current) => ({ ...current, [track.id]: url }));
    } catch (error) {
      setNotice(error.message || 'Could not create an audio preview.');
    }
  };

  const decide = async (track, status) => {
    setWorkingId(track.id);
    setNotice('');
    try {
      await reviewTrack(track.id, status);
      setTracks((current) => current.filter((item) => item.id !== track.id));
      setNotice(status === 'published' ? `${track.title} was confirmed and published.` : `${track.title} was rejected.`);
    } catch (error) {
      setNotice(error.message || 'Could not update this submission.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="admin-brand" href="/" aria-label="Junubify home"><span><Headphones size={20} /></span><b>JUNUBIFY</b><small>ADMIN</small></a>
        {session && <button className="admin-button quiet" onClick={signOut}><LogOut size={16} /> Sign out</button>}
      </header>

      <section className="admin-content">
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow"><BadgeCheck size={15} /> CONTENT MODERATION</span>
            <h1>{isConfirmationPage ? 'Confirm submissions' : 'Automated review'}</h1>
            <p>{isConfirmationPage ? 'Listen to each private upload and confirm whether it can be published.' : 'Automated checks flag metadata concerns; every upload still requires human confirmation.'}</p>
          </div>
          {isAdmin && <button className="admin-button quiet" onClick={refreshQueue} disabled={loading}><RefreshCw size={16} className={loading ? 'spinning' : ''} /> Refresh {isConfirmationPage ? 'queue' : 'counts'}</button>}
        </div>

        {!supabaseConfigured ? <div className="admin-message"><ShieldAlert size={20} /><div><b>Backend setup required</b><p>Configure the Supabase URL and anon key to enable automated checks and confirmations.</p></div></div>
          : !session ? <section className="admin-login"><h2>Admin sign in</h2><p>Use an account that has the trusted <code>admin</code> app metadata role.</p><form onSubmit={signIn}><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" /><button className="admin-button approve" type="submit">Send sign-in link</button></form></section>
            : !isAdmin ? <div className="admin-message"><ShieldAlert size={20} /><div><b>Admin access required</b><p>This account does not have the trusted admin role. Ask a project owner to grant the role through a secure Supabase Auth admin workflow.</p></div></div>
              : <>
                {notice && <p className="admin-notice" role="status">{notice}</p>}
                {loading ? <div className="queue-empty"><LoaderCircle className="spinning" size={24} /><p>Loading review queue…</p></div>
                  : isConfirmationPage
                    ? <>
                      <div className="queue-summary"><span className="queue-count">{tracks.length}</span><span>{tracks.length === 1 ? 'submission' : 'submissions'} waiting for confirmation</span><Clock3 size={17} /></div>
                      {tracks.length ? <div className="review-list">{tracks.map((track) => <article className="review-card" key={track.id}>
                        <div className="review-art">{track.cover ? <img src={track.cover} alt="" /> : <Music2 size={26} />}</div>
                        <div className="review-main">
                          <div className="review-title"><div><h2>{track.title}</h2><p>{track.artist} · {track.genre}</p></div><span className="pending-badge">Pending confirmation</span></div>
                          <div className="review-details"><span>Release: {track.album || 'Single'}</span><span>Submitted: {new Date(track.createdAt).toLocaleString()}</span></div>
                          <div className="review-check-results">
                            <b>Automated checks: {track.autoReviewStatus === 'passed' ? 'passed' : 'flagged for attention'}</b>
                            {track.autoReviewFlags.length > 0 && <ul>{track.autoReviewFlags.map((flag) => <li key={flag}>{reviewFlagLabels[flag] || `Review flag: ${flag}`}</li>)}</ul>}
                          </div>
                          <div className="review-audio">{audioUrls[track.id] ? <audio controls preload="none" src={audioUrls[track.id]}>Your browser does not support audio playback.</audio> : <button className="admin-button quiet" onClick={() => preview(track)}><Headphones size={16} /> Load private audio preview</button>}</div>
                          <div className="review-actions"><button className="admin-button reject" onClick={() => decide(track, 'rejected')} disabled={workingId === track.id}><X size={16} /> Reject</button><button className="admin-button approve" onClick={() => decide(track, 'published')} disabled={workingId === track.id}><Check size={16} /> {workingId === track.id ? 'Saving…' : 'Confirm & publish'}</button></div>
                        </div>
                      </article>)}</div> : <div className="queue-empty"><BadgeCheck size={28} /><p><b>All caught up</b></p><span>New submissions will appear here after automated checks.</span></div>}
                      <a className="admin-button quiet admin-page-link" href="/admin.html">Back to automated review</a>
                    </>
                    : <section className="automation-summary">
                      <div className="automation-stats">
                        <article><span>{counts.passed}</span><b>Checks passed</b><small>Still private until confirmation</small></article>
                        <article><span>{counts.flagged}</span><b>Flagged for attention</b><small>Review the checks and audio manually</small></article>
                      </div>
                      <p>Checks cover required metadata, supported genres and audio extensions, secure cover URLs, and possible duplicate titles. They do not verify copyright or analyze audio content. Nothing is auto-published.</p>
                      <a className="admin-button approve" href="/admin-confirm.html">Open confirmation page</a>
                    </section>}
              </>}
        {notice && (!isAdmin || loading) && <p className="admin-notice" role="status">{notice}</p>}
      </section>
      <footer className="admin-footer">Automated checks are triage only. Every track stays private until a trusted admin confirms it.</footer>
    </main>
  );
}

createRoot(document.getElementById('admin-root')).render(<AdminApp />);
