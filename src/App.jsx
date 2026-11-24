import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines, BadgeCheck, CircleDollarSign, Compass, Download, Headphones,
  Heart, Music2, Pause, Play, Radio, Smartphone, Sparkles, TrendingUp,
  Upload, Wallet,
} from 'lucide-react';
import ogAudioUrl from '../CHIEF BUTEE - OG.mp3';
import ogCoverUrl from '../1794694060126.jpg';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import {
  createTrackAudioUrl,
  fetchArtistTracks,
  fetchPublishedTracks,
  submitTrack,
} from './lib/catalog.js';

const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };

const featuredTracks = [
  { id: 'chief-butee-og', title: 'O.G.', artist: 'Chief Butee', genre: 'Afrobeat', plays: 0, cover: ogCoverUrl, audioUrl: ogAudioUrl },
];

const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', subtitle: 'Modern rhythms from Juba and beyond', color: 'genre-green' },
  { name: 'Traditional & Cultural', filter: 'Traditional', subtitle: 'Heritage sounds and cultural rhythms', color: 'genre-orange' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', subtitle: 'Stories and bars from across South Sudan', color: 'genre-purple' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', subtitle: 'Island rhythms with a South Sudan sound', color: 'genre-red' },
  { name: 'Gospel & Choir', filter: 'Gospel', subtitle: 'Choirs and voices from home', color: 'genre-blue' },
];

const featuredPlaylists = [
  { id: 'chief-butee-og', name: 'O.G. · Chief Butee', subtitle: 'Featured release', accent: 'forest', cover: ogCoverUrl, genre: 'Afrobeat' },
];

const readLikes = () => {
  try {
    const value = JSON.parse(localStorage.getItem('junubify-liked-tracks') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [playing, setPlaying] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [likedTracks, setLikedTracks] = useState(readLikes);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [notice, setNotice] = useState('');
  const audioRef = useRef(null);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 5000);
  };

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshCatalog = async () => {
    if (!supabaseConfigured) return;
    setLoadingCatalog(true);
    setCatalogError('');
    try {
      const publicTracks = await fetchPublishedTracks();
      setTracks(Array.isArray(publicTracks) ? publicTracks : []);
      if (session?.user?.id) {
        setArtistTracks(await fetchArtistTracks(session.user.id));
      }
    } catch (error) {
      setCatalogError(error?.message || 'Could not load the catalog.');
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    refreshCatalog();
  }, [session?.user?.id]);

  const catalogTracks = useMemo(() => {
    const safeTracks = Array.isArray(tracks) ? tracks : [];
    return safeTracks.length ? safeTracks : featuredTracks;
  }, [tracks]);

  const visibleTracks = useMemo(() => catalogTracks.filter((track) => {
    const title = track?.title || '';
    const artist = track?.artist || '';
    const genre = track?.genre || '';
    const matchesText = `${title} ${artist} ${genre}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesGenre = !genreFilter || genre.toLowerCase().includes(genreFilter.toLowerCase());
    return matchesText && matchesGenre;
  }), [catalogTracks, query, genreFilter]);

  const playTrack = async (track) => {
    if (!track) return;

    if (playing?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      } else {
        audioRef.current.pause();
      }
      return;
    }

    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      setAudioUrl(url);
      setPlaying(track);
      window.setTimeout(() => {
        audioRef.current?.play().catch(() => notify('Tap play to start the audio.'));
      }, 0);
    } catch (error) {
      notify(error?.message || 'Could not create a secure audio playback link.');
    }
  };

  const playAll = (list) => {
    if (list?.length) playTrack(list[0]);
  };

  const toggleLike = (trackId) => {
    setLikedTracks((current) => {
      const next = { ...current, [trackId]: !current[trackId] };
      try { localStorage.setItem('junubify-liked-tracks', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) {
      notify('Choose an MP3, WAV, M4A, OGG, AAC, or FLAC file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      notify('Audio file must be 50 MB or smaller.');
      return;
    }
    setSelectedFile(file);
  };

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    notify(error?.message || 'Check your email for a secure sign-in link.');
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in to submit a track.');
    if (!selectedFile) return notify('Choose an audio file before submitting.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.');
    if (!form.title.trim() || !form.artist.trim()) return notify('Add a song title and artist name.');

    setSubmitting(true);
    try {
      const submitted = await submitTrack({ file: selectedFile, form, artistId: session.user.id });
      setArtistTracks((current) => [submitted, ...current]);
      setForm(emptyForm);
      setSelectedFile(null);
      setRightsConfirmed(false);
      notify('Track uploaded and submitted successfully.');
    } catch (error) {
      notify(error?.message || 'Track upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openGenre = (genre) => {
    setGenreFilter(genre.filter);
    setQuery('');
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home">
          <span className="brand-icon"><Radio size={21} /></span>
          <span><b>Junubify</b><small>SOUTH SUDAN BEATS</small></span>
        </button>

        <input
          className="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setGenreFilter(''); }}
          placeholder="Search tracks or artists"
          aria-label="Search tracks or artists"
        />

        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17} /> Discover</button>
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><Heart size={17} /> Library</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17} /> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17} /> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17} /> Get the app</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'discover' && (
          <>
            <section className="hero trend-hero">
              <div className="hero-copy">
                <span className="eyebrow"><AudioLines size={14} /> Featured Juba playlist</span>
                <h1>Top 50 South Sudan Trends</h1>
                <p>Discover fresh voices, warm grooves, and powerful stories from Juba and across South Sudan.</p>
                <div className="hero-actions">
                  <button className="button primary" onClick={() => playAll(visibleTracks)}><Play size={16} fill="currentColor" /> Play all</button>
                  <button className="button secondary" onClick={() => setTab('studio')}><Upload size={16} /> Submit a track</button>
                </div>
              </div>
              <div className="hero-badge"><BadgeCheck size={17} /> A home for local artists</div>
            </section>

            <section className="featured-artist panel">
              <img src={ogCoverUrl} alt="Chief Butee" />
              <div className="featured-artist-copy">
                <span className="eyebrow"><BadgeCheck size={14} /> Featured artist</span>
                <h2>Chief Butee</h2>
                <p>Fresh South Sudanese music, featured now on Junubify.</p>
              </div>
              <div className="artist-sparkle"><Sparkles size={24} /></div>
            </section>

            <section className="genre-section">
              <div className="section-heading">
                <div><span className="eyebrow">Explore</span><h2><Compass size={22} /> Explore Juba Genres</h2></div>
              </div>
              <div className="genre-grid">
                {genres.map((genre) => (
                  <button key={genre.filter} className={`genre-card ${genre.color} ${genreFilter === genre.filter ? 'selected' : ''}`} onClick={() => openGenre(genre)}>
                    <strong>{genre.name}</strong>
                    <span>{genre.subtitle}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="featured-playlists">
              <div className="section-heading"><div><span className="eyebrow">Curated for you</span><h2><Sparkles size={22} /> Featured playlists</h2></div></div>
              <div className="playlist-grid">
                {featuredPlaylists.map((playlist) => (
                  <article className="playlist-card" key={playlist.id}>
                    <div className="playlist-art" style={{ backgroundImage: `linear-gradient(transparent, rgba(5,10,15,.75)), url(${playlist.cover})` }}>
                      <span className="playlist-tag">1 track</span>
                      <button className="playlist-play" onClick={() => playTrack(featuredTracks[0])} aria-label={`Play ${playlist.name}`}><Play size={18} fill="currentColor" /></button>
                    </div>
                    <div className="playlist-body"><strong>{playlist.name}</strong><small>{playlist.subtitle}</small></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="trending-section" id="catalog">
              <div className="now-trending-ticker"><span>♪ NOW TRENDING · O.G. · CHIEF BUTEE · SOUTH SUDAN SOUNDS</span></div>
              <div className="section-heading">
                <div><span className="eyebrow">Discover</span><h2><TrendingUp size={22} /> Now trending</h2></div>
                {genreFilter && <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear filter</button>}
              </div>

              {loadingCatalog && <p className="catalog-status">Loading the published catalog…</p>}
              {catalogError && <div className="notice-box"><b>Catalog unavailable</b><p>{catalogError}</p><button className="button secondary" onClick={refreshCatalog}>Try again</button></div>}

              <section className="track-list">
                {visibleTracks.map((track, index) => (
                  <article className="track-row" key={track.id}>
                    <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
                    <button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt="" /></button>
                    <div className="track-meta"><strong>{track.title}</strong><span>{track.artist || 'Junubify artist'} · {track.genre || 'Music'}</span></div>
                    <div className="track-stats">
                      <button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>
                        {playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label="Like track"><Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'} /></button>
                    </div>
                  </article>
                ))}
              </section>

              {!visibleTracks.length && <div className="empty-catalog"><Music2 size={26} /><b>No tracks match this filter.</b><span>Choose another genre or clear your search.</span></div>}
            </section>

            <section className="upload-promo">
              <div><span className="eyebrow">Are you an artist?</span><h2>Bring your sound to Junubify.</h2><p>Submit your music securely for review in Artist Studio.</p></div>
              <button className="button primary" onClick={() => setTab('studio')}><Upload size={16} /> Open studio</button>
            </section>
          </>
        )}

        {tab === 'library' && (
          <section>
            <div className="section-heading"><div><span className="eyebrow">Your collection</span><h1>Liked Songs</h1></div></div>
            {catalogTracks.filter((track) => likedTracks[track.id]).length ? (
              <section className="track-list">
                {catalogTracks.filter((track) => likedTracks[track.id]).map((track, index) => (
                  <article className="track-row" key={track.id}><span className="track-number">{index + 1}</span><button className="track-art" onClick={() => playTrack(track)}><img src={track.cover || fallbackCover} alt="" /></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre || 'Music'}</span></div><button className="mini-play" onClick={() => playTrack(track)}><Play size={15} /></button></article>
                ))}
              </section>
            ) : <div className="empty-catalog"><Heart size={26} /><b>No liked songs yet.</b><span>Tap the heart on a track to save it here.</span></div>}
          </section>
        )}

        {tab === 'studio' && (
          <>
            <div className="section-heading"><div><span className="eyebrow">Artist portal</span><h1>Artist studio</h1><p className="muted">Submit music and review your uploads.</p></div></div>
            {!supabaseConfigured && <div className="notice-box"><b>Backend setup required</b><p>Set the Supabase URL and anon key to enable uploads.</p></div>}
            {!session?.user ? (
              <form className="auth-card" onSubmit={requestSignIn}><h2>Receive a secure sign-in link</h2><label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="artist@junubify.com" required /></label><button className="button primary" type="submit">Send magic link</button></form>
            ) : (
              <section className="panel studio-panel">
                <div className="signed-in-bar"><div><strong>{session.user.email}</strong><span>Signed in as artist</span></div><button className="button secondary" onClick={signOut}>Sign out</button></div>
                <form className="submit-form" onSubmit={publishTrack}>
                  <label>Song title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
                  <label>Artist name<input value={form.artist} onChange={(event) => setForm({ ...form, artist: event.target.value })} required /></label>
                  <label>Genre<select value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })}>{genres.map((genre) => <option key={genre.filter} value={genre.filter}>{genre.name}</option>)}</select></label>
                  <label>Album or single<input value={form.album} onChange={(event) => setForm({ ...form, album: event.target.value })} /></label>
                  <label>Cover image URL<input value={form.cover} onChange={(event) => setForm({ ...form, cover: event.target.value })} placeholder="https://..." /></label>
                  <div className="upload-box"><label className="file-picker"><input type="file" accept="audio/*" onChange={(event) => handleFile(event.target.files?.[0])} /><span>{selectedFile ? selectedFile.name : 'Choose audio file'}</span></label></div>
                  <label className="checkbox-row"><input type="checkbox" checked={rightsConfirmed} onChange={() => setRightsConfirmed((value) => !value)} />I confirm that I own or control the rights to this audio.</label>
                  <button className="button primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit track'}</button>
                </form>
                {artistTracks.length > 0 && <div className="artist-tracks"><h2>Your submissions</h2>{artistTracks.map((track) => <div className="mini-track" key={track.id}><strong>{track.title}</strong><span>{track.status}</span></div>)}</div>}
              </section>
            )}
          </>
        )}

        {tab === 'monetize' && (
          <><div className="section-heading"><div><span className="eyebrow">Creator economy</span><h1>Monetization</h1></div></div><section className="panel monetization-panel"><div className="money-box"><Wallet size={22} /><div><strong>Payments are not live yet</strong><p>Checkout and payouts require a secure payment provider integration.</p></div></div></section></>
        )}

        {tab === 'download' && (
          <section className="app-download panel"><div className="download-icon"><Smartphone size={42} /></div><span className="eyebrow">Listen wherever you are</span><h1>Get Junubify for Android & iOS</h1><p>Use your browser menu and choose “Add to Home screen”.</p></section>
        )}
      </main>

      <footer className="player">
        <div className="player-track">{playing ? <><img src={playing.cover || fallbackCover} alt="" /><div><b>{playing.title}</b><span>{playing.artist}</span></div></> : <><span className="player-note"><Music2 size={16} /></span><div><b>Nothing playing</b><span>Choose a track</span></div></>}</div>
        <audio ref={audioRef} src={audioUrl || undefined} onEnded={() => { setPlaying(null); setAudioUrl(''); }} />
        <button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label="Toggle playback">{playing && audioRef.current && !audioRef.current.paused ? <Pause size={16} /> : <Play size={16} />}</button>
      </footer>

      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
