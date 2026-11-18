import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BadgeCheck, Check, Clock3, Headphones, LoaderCircle, LogOut, Music2, RefreshCw, ShieldAlert, ShieldCheck, ShieldX, X } from 'lucide-react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createReviewAudioUrl, fetchArtistVerifications, fetchPendingReviewCounts, fetchPendingReviewTracks, reviewArtistVerification, reviewTrack } from './lib/admin.js';
import './admin.css';
import './admin-workflow.css';

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
  const [verifications, setVerifications] = useState([]);
  const [counts, setCounts] = useState({ passed: 0, flagged: 0 });
  const [audioUrls, setAudioUrls] = useState({});
  const [trackNotes, setTrackNotes] = useState({});
  const [artistNotes, setArtistNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [notice, setNotice] = useState('');
  const isAdmin = session?.user?.app_metadata?.role === 'admin';

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setNotice(error.message);
      setSession(data?.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  const refreshQueue = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setNotice('');
    try {
      const [pendingTracks, artistProfiles, reviewCounts] = await Promise.all([
        fetchPendingReviewTracks(), fetchArtistVerifications(), fetchPendingReviewCounts(),
      ]);
      setTracks(pendingTracks);
      setVerifications(artistProfiles);
      setCounts(reviewCounts);
      setAudioUrls({});
    } catch (error) {
      setNotice(error.message || 'Could not load the moderation queue. Apply the latest Supabase migration and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) refreshQueue();
    else { setTracks([]); setVerifications([]); setCounts({ passed: 0, flagged: 0 }); }
  }, [isAdmin]);

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setNotice('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } });
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
    const note = (trackNotes[track.id] || '').trim();
    if (status === 'rejected' && note.length < 3) {
      setNotice(`Add a short moderation reason before rejecting “${track.title}”.`);
      return;
    }
    setWorkingId(track.id);
    setNotice('');
    try {
      await reviewTrack(track.id, status, note);
      setTracks((current) => current.filter((item) => item.id !== track.id));
      setCounts((current) => ({ ...current, [track.autoReviewStatus]: Math.max(0, current[track.autoReviewStatus] - 1) }));
      setNotice(status === 'published' ? `${track.title} was approved and published.` : `${track.title} was rejected with a moderation note.`);
    } catch (error) {
      setNotice(error.message || 'Could not save this moderation decision.');
    } finally {
      setWorkingId(null);
    }
  };

  const saveArtistVerification = async (artist) => {
    const note = (artistNotes[artist.artistId] ?? artist.moderationNote ?? '').trim();
    setWorkingId(`artist:${artist.artistId}`);
    setNotice('');
    try {
      const saved = await reviewArtistVerification({ artistId: artist.artistId, artistName: artist.artist, verified: !artist.verified, moderationNote: note });
      setVerifications((current) => [saved, ...current.filter((item) => item.artistId !== artist.artistId)]);
      setNotice(saved.verified ? `${artist.artist} is now verified.` : `Verification removed for ${artist.artist}.`);
    } catch (error) {
      setNotice(error.message || 'Could not update artist verification.');
    } finally {
      setWorkingId(null);
    }
  };

  const artistRows = useMemo(() => {
    const artists = new Map();
    tracks.forEach((track) => {
      const existing = artists.get(track.artistId) || { artistId: track.artistId, artist: track.artist, pendingCount: 0 };
      existing.pendingCount += 1;
      artists.set(track.artistId, existing);
    });
    verifications.forEach((profile) => {
      const existing = artists.get(profile.artistId) || { artistId: profile.artistId, artist: profile.artist, pendingCount: 0 };
      artists.set(profile.artistId, { ...existing, ...profile });
    });
    return [...artists.values()].sort((a, b) => Number(Boolean(b.verified)) - Number(Boolean(a.verified)) || a.artist.localeCompare(b.artist));
  }, [tracks, verifications]);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="admin-brand" href="/" aria-label="Junubify home"><span><Headphones size={20}/></span><b>JUNUBIFY</b><small>ADMIN</small></a>
        {session && <button className="admin-button quiet" onClick={signOut}><LogOut size={16}/> Sign out</button>}
      </header>
      <section className="admin-content">
        <div className="admin-heading">
          <div><span className="admin-eyebrow"><BadgeCheck size={15}/> CONTENT MODERATION</span><h1>Review studio</h1><p>Listen to each submission, record a decision, and manage trusted artist profiles.</p></div>
          {isAdmin && <button className="admin-button quiet" onClick={refreshQueue} disabled={loading}><RefreshCw size={16} className={loading ? 'spinning' : ''}/> Refresh queue</button>}
        </div>
        {!supabaseConfigured ? <div className="admin-message"><ShieldAlert size={20}/><div><b>Backend setup required</b><p>Configure the Supabase URL and anon key to enable moderation.</p></div></div>
          : !session ? <section className="admin-login"><h2>Admin sign in</h2><p>Use an account with the trusted <code>admin</code> app metadata role.</p><form onSubmit={signIn}><label htmlFor="admin-email">Admin email</label><input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com"/><button className="admin-button approve" type="submit">Send secure sign-in link</button></form></section>
            : !isAdmin ? <div className="admin-message"><ShieldAlert size={20}/><div><b>Admin access required</b><p>This account does not have the trusted admin role. Ask a project owner to grant the role through a trusted Supabase Auth admin workflow.</p></div></div>
              : <>
                {notice && <p className="admin-notice" role="status">{notice}</p>}
                <section className="moderation-stats" aria-label="Queue summary">
                  <article><span>{tracks.length}</span><b>Waiting for review</b><small>Human review is required before publication</small></article>
                  <article><span>{counts.passed}</span><b>Automated checks passed</b><small>Still private until approved</small></article>
                  <article><span>{counts.flagged}</span><b>Flagged for attention</b><small>Review flags and listen carefully</small></article>
                </section>
                {loading ? <div className="queue-empty"><LoaderCircle className="spinning" size={24}/><p>Loading review queue…</p></div> : <>
                  <section className="workflow-section">
                    <div className="workflow-section-heading"><div><span className="admin-eyebrow"><Clock3 size={14}/> PRIVATE UNTIL APPROVED</span><h2>Track submissions</h2></div><span className="workflow-count">{tracks.length} pending</span></div>
                    {tracks.length ? <div className="review-list">{tracks.map((track) => <article className="review-card" key={track.id}>
                      <div className="review-art">{track.cover ? <img src={track.cover} alt=""/> : <Music2 size={26}/>}</div>
                      <div className="review-main">
                        <div className="review-title"><div><h3>{track.title}</h3><p>{track.artist} · {track.genre}</p></div><span className="pending-badge">Pending review</span></div>
                        <div className="review-details"><span>Release: {track.album || 'Single'}</span><span>Submitted: {new Date(track.createdAt).toLocaleString()}</span></div>
                        <div className="review-check-results"><b>Automated checks: {track.autoReviewStatus === 'passed' ? 'passed' : 'flagged for attention'}</b>{track.autoReviewFlags.length > 0 && <ul>{track.autoReviewFlags.map((flag) => <li key={flag}>{reviewFlagLabels[flag] || `Review flag: ${flag}`}</li>)}</ul>}</div>
                        <div className="review-audio">{audioUrls[track.id] ? <audio controls preload="none" src={audioUrls[track.id]}>Your browser does not support audio playback.</audio> : <button className="admin-button quiet" onClick={() => preview(track)}><Headphones size={16}/> Load private audio preview</button>}</div>
                        <label className="moderation-note-label" htmlFor={`track-note-${track.id}`}>Moderation note <span>Required when rejecting</span></label>
                        <textarea id={`track-note-${track.id}`} className="moderation-note" maxLength={2000} rows={3} value={trackNotes[track.id] || ''} onChange={(event) => setTrackNotes((current) => ({ ...current, [track.id]: event.target.value }))} placeholder="Record copyright, quality, metadata, or other review feedback…"/>
                        <div className="review-actions"><button className="admin-button reject" onClick={() => decide(track, 'rejected')} disabled={workingId === track.id}><X size={16}/> Reject</button><button className="admin-button approve" onClick={() => decide(track, 'published')} disabled={workingId === track.id}><Check size={16}/> Approve & publish</button></div>
                      </div>
                    </article>)}</div> : <div className="queue-empty"><BadgeCheck size={28}/><p><b>All caught up</b></p><span>New uploads appear here after submission.</span></div>}
                  </section>
                  <section className="workflow-section artist-verification-section">
                    <div className="workflow-section-heading"><div><span className="admin-eyebrow"><ShieldCheck size={14}/> TRUSTED ARTIST PROFILES</span><h2>Artist verification</h2></div><span className="workflow-count">{artistRows.filter((artist) => artist.verified).length} verified</span></div>
                    <p className="workflow-help">Verification is a moderation record for the artist account. Only trusted admins can change it; approval does not grant publishing access by itself.</p>
                    {artistRows.length ? <div className="artist-review-list">{artistRows.map((artist) => <article className="artist-review-card" key={artist.artistId}>
                      <div className="artist-review-icon">{artist.verified ? <BadgeCheck size={22}/> : <Music2 size={20}/>}</div>
                      <div className="artist-review-copy"><h3>{artist.artist}{artist.verified && <span className="verified-label"><BadgeCheck size={14}/> Verified</span>}</h3><p>{artist.pendingCount} pending {artist.pendingCount === 1 ? 'track' : 'tracks'}{artist.reviewedAt ? ` · reviewed ${new Date(artist.reviewedAt).toLocaleDateString()}` : ''}</p></div>
                      <div className="artist-review-actions"><textarea aria-label={`Verification note for ${artist.artist}`} maxLength={1000} rows={2} value={artistNotes[artist.artistId] ?? artist.moderationNote ?? ''} onChange={(event) => setArtistNotes((current) => ({ ...current, [artist.artistId]: event.target.value }))} placeholder="Verification note (optional)"/><button className={`admin-button ${artist.verified ? 'reject' : 'approve'}`} onClick={() => saveArtistVerification(artist)} disabled={workingId === `artist:${artist.artistId}`}>{artist.verified ? <><ShieldX size={16}/> Remove verification</> : <><BadgeCheck size={16}/> Verify artist</>}</button></div>
                    </article>)}</div> : <div className="queue-empty artist-empty"><Music2 size={24}/><p><b>No artist profiles to review</b></p><span>Artist profiles with pending music submissions will appear here.</span></div>}
                  </section>
                </>}
              </>}
        {notice && (!isAdmin || loading) && <p className="admin-notice" role="status">{notice}</p>}
      </section>
      <footer className="admin-footer">Every track remains private until an authorized admin approves it. Review decisions are recorded in Supabase.</footer>
    </main>
  );
}

createRoot(document.getElementById('admin-root')).render(<AdminApp/>);
