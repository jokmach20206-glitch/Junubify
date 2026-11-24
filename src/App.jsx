import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines, BadgeCheck, ChevronDown, CircleDollarSign, Compass, Download,
  Headphones, Heart, ListMusic, Music2, Pause, Play, Radio, Share2,
  Shuffle, SkipBack, SkipForward, Smartphone, Sparkles, Timer, TrendingUp,
  Upload, Volume2, Wallet,
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
const initialTrack = {
  id: 'chief-butee-og', title: 'O.G.', artist: 'Chief Butee', genre: 'Afrobeat',
  album: 'Single', plays: 0, cover: ogCoverUrl, audioUrl: ogAudioUrl,
};
const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', subtitle: 'Modern rhythms from Juba and beyond', color: 'genre-green', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800' },
  { name: 'Traditional & Cultural', filter: 'Traditional', subtitle: 'Heritage sounds and cultural rhythms', color: 'genre-orange', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', subtitle: 'Stories and bars from across South Sudan', color: 'genre-purple', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', subtitle: 'Island rhythms with a South Sudan sound', color: 'genre-red', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800' },
  { name: 'Gospel & Choir', filter: 'Gospel', subtitle: 'Choirs and voices from home', color: 'genre-blue', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800' },
];
const playlists = [
  { id: 'featured-og', name: 'O.G. · Chief Butee', subtitle: 'Featured release', cover: ogCoverUrl, genre: 'Afrobeat' },
];

function readStoredObject(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function trackText(track) {
  return `${track?.title || ''} ${track?.artist || ''} ${track?.genre || ''}`.toLowerCase();
}

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [playing, setPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [playQueue, setPlayQueue] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likedTracks, setLikedTracks] = useState(() => readStoredObject('junubify-liked-tracks'));
  const [followedArtists, setFollowedArtists] = useState(() => readStoredObject('junubify-followed-artists'));
  const [libraryGenre, setLibraryGenre] = useState('');
  const [showLyrics, setShowLyrics] = useState(true);
  const [sleepTimer, setSleepTimer] = useState(false);
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
  const sleepTimerRef = useRef(null);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 4500);
  };

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) notify(error.message);
      setSession(data?.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  const refreshCatalog = async () => {
    if (!supabaseConfigured) return;
    setLoadingCatalog(true);
    setCatalogError('');
    try {
      const publicTracks = await fetchPublishedTracks();
      setTracks(Array.isArray(publicTracks) ? publicTracks : []);
      if (session?.user?.id) setArtistTracks(await fetchArtistTracks(session.user.id));
      else setArtistTracks([]);
    } catch (error) {
      setCatalogError(error?.message || 'Could not load the catalog.');
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => { refreshCatalog(); }, [session?.user?.id]);

  const catalogTracks = useMemo(() => (tracks.length ? tracks : [initialTrack]), [tracks]);
  const visibleTracks = useMemo(() => catalogTracks.filter((track) => {
    const genre = typeof track?.genre === 'string' ? track.genre : '';
    return trackText(track).includes(query.trim().toLowerCase())
      && (!genreFilter || genre.toLowerCase().includes(genreFilter.toLowerCase()));
  }), [catalogTracks, query, genreFilter]);
  const likedCatalog = catalogTracks.filter((track) => Boolean(likedTracks[track.id]));
  const libraryGenres = [...new Set(likedCatalog.map((track) => track.genre).filter((genre) => typeof genre === 'string' && genre.trim()))];
  const libraryTracks = likedCatalog.filter((track) => !libraryGenre || track.genre === libraryGenre);

  const playTrack = async (track, queue = [], recordHistory = true) => {
    if (!track) return;
    if (playing?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      else audioRef.current.pause();
      return;
    }
    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      if (recordHistory && playing && playing.id !== track.id) setPlayHistory((history) => [playing, ...history].slice(0, 20));
      setPlayQueue(queue);
      setPlaybackTime(0);
      setDuration(0);
      setAudioUrl(url);
      setPlaying(track);
      setIsPlaying(true);
    } catch (error) {
      notify(error?.message || 'Could not create a secure audio playback link.');
    }
  };

  useEffect(() => {
    if (!audioUrl || !playing || !audioRef.current) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false);
      notify('Tap play to start the audio.');
    });
  }, [audioUrl, playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.8;
  }, []);

  useEffect(() => {
    window.clearTimeout(sleepTimerRef.current);
    if (!sleepTimer) return undefined;
    sleepTimerRef.current = window.setTimeout(() => {
      audioRef.current?.pause();
      setIsPlaying(false);
      setSleepTimer(false);
      notify('Sleep timer ended. Playback paused.');
    }, 30 * 60 * 1000);
    return () => window.clearTimeout(sleepTimerRef.current);
  }, [sleepTimer]);

  const playAll = (list) => {
    if (list.length) playTrack(list[0], list.slice(1));
  };

  const shuffleTracks = (list) => {
    const shuffled = [...list];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    return shuffled;
  };

  const playNext = () => {
    if (playQueue.length) {
      const [next, ...remaining] = playQueue;
      playTrack(next, remaining);
      return;
    }
    if (repeat && playing) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      audioRef.current?.play().catch(() => {});
      return;
    }
    setIsPlaying(false);
    setPlaying(null);
    setAudioUrl('');
    setPlaybackTime(0);
  };

  const playPrevious = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const [previous, ...history] = playHistory;
    if (!previous) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    setPlayHistory(history);
    playTrack(previous, [], false);
  };

  const toggleLike = (trackId) => {
    setLikedTracks((current) => {
      const next = { ...current, [trackId]: !current[trackId] };
      try { localStorage.setItem('junubify-liked-tracks', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleFollow = (artist) => setFollowedArtists((current) => {
    const next = { ...current, [artist]: !current[artist] };
    try { localStorage.setItem('junubify-followed-artists', JSON.stringify(next)); } catch {}
    return next;
  });

  const shareTrack = async (track) => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${track.title} · Junubify`, text: `Listen to ${track.title} by ${track.artist} on Junubify`, url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify('Track link copied.');
      } else notify(url);
    } catch (error) {
      if (error.name !== 'AbortError') notify('Could not share this track.');
    }
  };

  const selectAudioOutput = async () => {
    if (!navigator.mediaDevices?.selectAudioOutput || !audioRef.current?.setSinkId) {
      notify('Audio output selection is not supported by this browser.');
      return;
    }
    try {
      const device = await navigator.mediaDevices.selectAudioOutput();
      await audioRef.current.setSinkId(device.deviceId);
      notify(`Audio output changed to ${device.label || 'selected device'}.`);
    } catch (error) {
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') notify('Could not change the audio output.');
    }
  };

  const seek = (event) => {
    const value = Number(event.target.value);
    if (audioRef.current && Number.isFinite(value)) audioRef.current.currentTime = value;
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) return notify('Choose an MP3, WAV, M4A, OGG, AAC, or FLAC audio file.');
    if (file.size > 50 * 1024 * 1024) return notify('Audio file must be 50 MB or smaller.');
    setSelectedFile(file);
  };

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    notify(error?.message || 'Check your email for a secure sign-in link.');
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in to submit a track.');
    if (!selectedFile) return notify('Choose an audio file before submitting.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.');
    if (!form.title.trim() || !form.artist.trim()) return notify('Add a song title and artist name.');
    setSubmitting(true);
    try {
      const submission = await submitTrack({ file: selectedFile, form, artistId: session.user.id });
      setArtistTracks((current) => [submission, ...current]);
      setForm(emptyForm);
      setSelectedFile(null);
      setRightsConfirmed(false);
      notify('Track uploaded securely and submitted for review.');
    } catch (error) {
      notify(error?.message || 'Track upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectGenre = (genre) => {
    setTab('discover');
    setGenreFilter((current) => current === genre.filter ? '' : genre.filter);
    setQuery('');
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const openPlaylist = (playlist, autoplay = false) => {
    const matches = catalogTracks.filter((track) => String(track.genre || '').toLowerCase().includes(playlist.genre.toLowerCase()));
    setTab('discover');
    setGenreFilter(playlist.genre);
    setQuery('');
    if (autoplay && matches.length) playTrack(matches[0], matches.slice(1));
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  return (
    <div className={`app-shell ${playerOpen ? 'player-is-open' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => { setTab('discover'); setGenreFilter(''); }} aria-label="Junubify home">
          <span className="brand-icon"><Radio size={21} /></span>
          <span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span>
        </button>
        <input className="search" value={query} onChange={(event) => { setQuery(event.target.value); setGenreFilter(''); }} placeholder="Search tracks or artists" aria-label="Search tracks or artists" />
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17} /> Discover</button>
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><Heart size={17} /> Library</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17} /> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17} /> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17} /> Get the app</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'discover' && <>
          <section className="hero trend-hero">
            <div className="hero-copy">
              <span className="eyebrow"><AudioLines size={14} /> FEATURED JUBA PLAYLIST</span>
              <h1>South Sudan&apos;s sound, all in one place.</h1>
              <p>Discover emerging voices and hometown favorites from Juba and beyond.</p>
              <div className="hero-actions"><button className="button primary" onClick={() => playAll(visibleTracks)} disabled={!visibleTracks.length}><Play size={16} fill="currentColor" /> Play all</button><button className="button secondary" onClick={() => setTab('studio')}><Upload size={16} /> Submit a track</button></div>
            </div>
            <div className="hero-badge"><BadgeCheck size={17} /> A home for local artists</div>
          </section>

          <section className="featured-artist panel">
            <img src={ogCoverUrl} alt="O.G. by Chief Butee cover art" />
            <div className="featured-artist-copy"><span className="eyebrow"><BadgeCheck size={14} /> FEATURED RELEASE</span><h2>O.G. · Chief Butee</h2><p>Listen to the featured release from South Sudan.</p><button className="button secondary" onClick={() => playTrack(initialTrack)}><Play size={15} /> Play featured track</button></div>
            <div className="artist-sparkle"><Sparkles size={24} /></div>
          </section>

          <section className="genre-section"><div className="section-heading"><div><span className="eyebrow">EXPLORE</span><h2><Compass size={22} /> Explore Juba Genres</h2></div></div><div className="genre-grid">
            {genres.map((genre) => <button key={genre.filter} className={`genre-card ${genre.color} ${genreFilter === genre.filter ? 'selected' : ''}`} onClick={() => selectGenre(genre)} style={{ backgroundImage: `linear-gradient(160deg, rgba(7, 17, 15, .16), rgba(7, 17, 15, .76)), url(${genre.cover})` }}><strong>{genre.name}</strong><span>{genre.subtitle}</span></button>)}
          </div></section>

          <section className="featured-playlists"><div className="section-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2><Sparkles size={22} /> Featured releases</h2></div></div><div className="playlist-grid">
            {playlists.map((playlist) => <article className="playlist-card" key={playlist.id}><div className="playlist-art" style={{ backgroundImage: `linear-gradient(transparent, rgba(5, 10, 15, .76)), url(${playlist.cover})` }}><span className="playlist-tag">Featured release</span><button className="playlist-play" onClick={() => openPlaylist(playlist, true)} aria-label={`Play ${playlist.name}`}><Play size={18} fill="currentColor" /></button></div><div className="playlist-body"><strong>{playlist.name}</strong><small>{playlist.subtitle}</small><button className="button secondary playlist-button" onClick={() => openPlaylist(playlist)}>Explore release</button></div></article>)}
          </div></section>

          <section className="trending-section" id="catalog"><div className="now-trending-ticker"><span>♪ NOW TRENDING · O.G. · CHIEF BUTEE · SOUTH SUDAN SOUNDS</span></div><div className="section-heading"><div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2><TrendingUp size={22} /> {query.trim() ? `Search results for “${query.trim()}”` : 'Trending tracks in Juba'}</h2></div><span className="muted">{genreFilter && <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear genre · </button>}{visibleTracks.length} tracks</span></div>
            <div className="hot-badge"><span aria-hidden="true">✦</span> HOT RIGHT NOW</div>{loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}{catalogError && <div className="notice-box"><b>Catalog unavailable</b><p>{catalogError}</p><button className="button secondary" onClick={refreshCatalog}>Try again</button></div>}
            <section className="track-list">{visibleTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt="" /></button><div className="track-meta"><strong>{track.title || 'Untitled track'}</strong><span>{track.artist || 'Junubify artist'} · {track.genre || 'Music'}</span></div><div className="track-stats"><span><Heart size={14} /> {Number(track.plays || 0).toLocaleString()}</span><button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{playing?.id === track.id && isPlaying ? <Pause size={15} /> : <Play size={15} />}</button><button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? 'Unlike track' : 'Like track'} aria-pressed={Boolean(likedTracks[track.id])}><Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'} /></button><button className="track-action" onClick={() => shareTrack(track)} aria-label="Share track"><Share2 size={16} /></button></div></article>)}</section>
            {!visibleTracks.length && <div className="empty-catalog"><Music2 size={26} /><b>No tracks match this filter.</b><span>Choose another genre or clear your search.</span></div>}
          </section>
          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Submit your music securely for review in Artist Studio.</p></div><button className="button primary" onClick={() => setTab('studio')}><Upload size={16} /> Open studio</button></section>
        </>}

        {tab === 'library' && <section className="liked-library"><div className="liked-library-hero"><div className="liked-art"><Heart size={44} fill="currentColor" /></div><div className="liked-library-copy"><span className="eyebrow">YOUR COLLECTION</span><h1>Liked Songs</h1><p>{likedCatalog.length} {likedCatalog.length === 1 ? 'song' : 'songs'} saved on this device</p></div><div className="liked-library-actions"><button className="button primary" disabled={!libraryTracks.length} onClick={() => playAll(libraryTracks)}><Play size={16} fill="currentColor" /> Play</button><button className="button secondary" disabled={!libraryTracks.length} onClick={() => { const [first, ...rest] = shuffleTracks(libraryTracks); if (first) playTrack(first, rest); }}><Shuffle size={16} /> Shuffle</button></div></div>{libraryGenres.length > 0 && <div className="library-filters"><button className={!libraryGenre ? 'active' : ''} onClick={() => setLibraryGenre('')}>All</button>{libraryGenres.map((genre) => <button key={genre} className={libraryGenre === genre ? 'active' : ''} onClick={() => setLibraryGenre(genre)}>{genre}</button>)}</div>}{libraryTracks.length ? <section className="track-list">{libraryTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt="" /></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre || 'Music'}</span></div><div className="track-stats"><button className="track-action liked" onClick={() => toggleLike(track.id)} aria-label="Remove from liked songs"><Heart size={17} fill="currentColor" /></button><button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><Play size={15} /></button></div></article>)}</section> : <div className="empty-catalog liked-empty"><Heart size={26} /><b>No liked songs yet.</b><span>Tap the heart on a track in Discover to save it here.</span><button className="button secondary" onClick={() => setTab('discover')}>Browse Discover</button></div>}</section>}

        {tab === 'studio' && <><div className="section-heading"><div><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p className="muted">Submit a track for review. Audio is stored privately until approved.</p></div></div>{!supabaseConfigured && <div className="notice-box"><b>Backend setup required</b><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable uploads.</p></div>}{!session?.user ? <form className="auth-card" onSubmit={requestSignIn}><h2>Receive a secure sign-in link</h2><label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="artist@junubify.com" required /></label><button className="button primary" type="submit">Send magic link</button></form> : <section className="panel studio-panel"><div className="signed-in-bar"><div><strong>{session.user.email}</strong><span>Signed in as artist</span></div><button className="button secondary" onClick={signOut}>Sign out</button></div><form className="submit-form" onSubmit={publishTrack}><label>Song title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label><label>Artist name<input value={form.artist} onChange={(event) => setForm({ ...form, artist: event.target.value })} required /></label><label>Genre<select value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })}>{genres.map((genre) => <option key={genre.filter} value={genre.filter}>{genre.name}</option>)}</select></label><label>Album or single<input value={form.album} onChange={(event) => setForm({ ...form, album: event.target.value })} /></label><label>Cover image URL<input type="url" value={form.cover} onChange={(event) => setForm({ ...form, cover: event.target.value })} placeholder="https://..." /></label><div className="upload-box"><label className="file-picker"><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" onChange={(event) => handleFile(event.target.files?.[0])} /><span>{selectedFile ? selectedFile.name : 'Choose audio file · up to 50 MB'}</span></label></div><label className="checkbox-row"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />I confirm that I own or control the rights to this audio.</label><button className="button primary" type="submit" disabled={submitting || !supabaseConfigured}>{submitting ? 'Submitting…' : 'Submit track for review'}</button></form>{artistTracks.length > 0 && <div className="artist-tracks"><h2>Your submissions</h2>{artistTracks.map((track) => <div className="mini-track" key={track.id}><strong>{track.title}</strong><span>{track.status}</span></div>)}</div>}</section>}</>}

        {tab === 'monetize' && <><div className="section-heading"><div><span className="eyebrow">CREATOR ECONOMY</span><h1>Monetization</h1></div></div><section className="panel monetization-panel"><div className="money-box"><Wallet size={22} /><div><strong>Payments are not live yet</strong><p>Checkout and payouts require a secure payment provider integration.</p></div></div></section></>}
        {tab === 'download' && <section className="app-download panel"><div className="download-icon"><Smartphone size={42} /></div><span className="eyebrow">LISTEN WHEREVER YOU ARE</span><h1>Get Junubify for Android & iOS</h1><p>Use your browser menu and choose “Add to Home screen”.</p><div className="store-buttons"><div className="store-placeholder"><Download size={22} /><span><small>ANDROID APP</small><b>Coming soon</b></span></div><div className="store-placeholder"><Download size={22} /><span><small>APPLE APP</small><b>Coming soon</b></span></div></div></section>}
      </main>

      <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setPlaybackTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={playNext} />

      {playerOpen && playing && <section className="now-playing-view" role="dialog" aria-modal="true" aria-label={`Now playing ${playing.title}`}><div className="now-playing-header"><button className="player-close" onClick={() => setPlayerOpen(false)} aria-label="Close player"><ChevronDown size={25} /></button><span>PLAYING FROM JUNUBIFY<br /><b>{tab === 'library' ? 'LIKED SONGS' : 'NOW PLAYING'}</b></span><button className="player-icon-button" onClick={() => shareTrack(playing)} aria-label="Share track"><Share2 size={20} /></button></div><div className="now-playing-content"><img className="now-playing-art" src={playing.cover || fallbackCover} alt={`Cover art for ${playing.title}`} /><div className="now-playing-meta"><span className="eyebrow">{playing.album || 'FEATURED RELEASE'}</span><div className="now-playing-track"><div><h1>{playing.title}</h1><p>{playing.artist}</p></div><button className={`track-action ${likedTracks[playing.id] ? 'liked' : ''}`} onClick={() => toggleLike(playing.id)} aria-label="Like this song"><Heart size={22} fill={likedTracks[playing.id] ? 'currentColor' : 'none'} /></button></div></div><div className="full-player-progress"><input aria-label="Seek through track" type="range" min="0" max={duration || 1} value={Math.min(playbackTime, duration || 0)} onChange={seek} /><div><span>{formatTime(playbackTime)}</span><span>{formatTime(duration)}</span></div></div><div className="full-player-controls"><button className={shuffle ? 'player-icon-button active' : 'player-icon-button'} onClick={() => { setShuffle((value) => !value); if (!shuffle) setPlayQueue(shuffleTracks(playQueue)); }} aria-label="Toggle shuffle"><Shuffle size={22} /></button><button className="player-icon-button" onClick={playPrevious} aria-label="Previous track" disabled={!playHistory.length && playbackTime === 0}><SkipBack size={25} fill="currentColor" /></button><button className="full-player-toggle" onClick={() => playTrack(playing)} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}</button><button className="player-icon-button" onClick={playNext} aria-label="Next track" disabled={!playQueue.length && !repeat}><SkipForward size={25} fill="currentColor" /></button><button className={sleepTimer ? 'player-icon-button active' : 'player-icon-button'} onClick={() => setSleepTimer((value) => !value)} aria-label={sleepTimer ? 'Cancel sleep timer' : 'Start 30 minute sleep timer'}><Timer size={22} /></button></div><div className="player-utility-controls"><button className="player-icon-button" onClick={selectAudioOutput} aria-label="Select audio output"><Volume2 size={21} /></button><button className="player-icon-button" onClick={() => shareTrack(playing)} aria-label="Share track"><Share2 size={21} /></button><button className="player-icon-button" onClick={() => document.getElementById('up-next')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} aria-label="Jump to queue"><ListMusic size={22} /></button>{sleepTimer && <span className="sleep-timer-status">30 minute sleep timer is on · tap timer to cancel</span>}</div><section className="lyrics-preview"><div className="player-section-heading"><h2>Lyrics preview</h2><button className="text-button" onClick={() => setShowLyrics((value) => !value)}>{showLyrics ? 'Hide lyrics' : 'Show lyrics'}</button></div>{showLyrics && <p>{playing.lyrics || 'Lyrics are not available for this track yet.'}</p>}</section><section className="artist-preview"><div className="artist-preview-art"><img src={playing.artistCover || playing.cover || fallbackCover} alt={`Artwork for ${playing.artist}`} /></div><div className="artist-preview-copy"><span className="eyebrow">ABOUT THE ARTIST</span><h2>{playing.artist}</h2><p>{playing.artistBio || 'Artist biography is not available yet.'}</p><button className="button secondary follow-artist" onClick={() => toggleFollow(playing.artist)}>{followedArtists[playing.artist] ? 'Following' : 'Follow'}</button></div></section><section className="player-credits"><div className="player-section-heading"><h2>Credits</h2><span className="eyebrow">TRACK DETAILS</span></div><div className="credit-row"><span>{playing.artist}</span><small>Main artist</small></div>{playing.album && <div className="credit-row"><span>{playing.album}</span><small>Album</small></div>}{Array.isArray(playing.credits) && playing.credits.map((credit, index) => <div className="credit-row" key={`${credit.name}-${index}`}><span>{credit.name}</span><small>{credit.role}</small></div>)}{(!playing.credits || !playing.credits.length) && <p>Additional credits are not available for this track yet.</p>}</section>{playQueue.length > 0 && <section className="up-next" id="up-next"><h2>Up next</h2>{playQueue.map((track, index) => <button key={`${track.id}-${index}`} onClick={() => playTrack(track, playQueue.slice(index + 1))}><img src={track.cover || fallbackCover} alt="" /><span><b>{track.title}</b><small>{track.artist}</small></span><Play size={16} /></button>)}</section>}</div></section>}

      <footer className="player"><button className="player-track" onClick={() => playing && setPlayerOpen(true)} disabled={!playing} aria-label={playing ? 'Open full media player' : 'Nothing playing'}>{playing ? <><img src={playing.cover || fallbackCover} alt="" /><span><b>{playing.title}</b><small>{playing.artist}</small></span><ChevronDown className="player-open-icon" size={17} /></> : <><span className="player-note"><Music2 size={17} /></span><span><b>Nothing playing</b><small>Choose a track</small></span></>}</button>{playing && <div className="mini-player-progress"><span>{formatTime(playbackTime)}</span><progress max={duration || 1} value={duration ? Math.min(playbackTime, duration) : 0} /><span>{formatTime(duration)}</span></div>}<div className="player-right-controls"><button className="player-control" onClick={() => notify('Volume control is available in the expanded player.')} aria-label="Volume"><Volume2 size={19} /></button><button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label={isPlaying ? 'Pause playback' : 'Start playback'}>{isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button></div></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
