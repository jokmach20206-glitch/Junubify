updated 
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, BadgeCheck, ChevronDown, ChevronUp, CircleDollarSign, Compass, Download, Headphones, Heart, ListMusic, Music2, Pause, Play, Radio, Search, Share2, Shuffle, SkipBack, SkipForward, Smartphone, Sparkles, Timer, TrendingUp, Upload, Volume2, Wallet } from 'lucide-react';
import chiefButeeAudioUrl from '../CHIEF BUTEE - OG.mp3?url';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createTrackAudioUrl, fetchArtistTracks, fetchPublishedTracks, submitTrack } from './lib/catalog.js';

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };
const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500';
const formatPlaybackTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const totalSeconds = Math.floor(seconds);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};
const readLikedTracks = () => {
  try {
    const savedTracks = JSON.parse(localStorage.getItem('junubify-liked-tracks') || '{}');
    return savedTracks && typeof savedTracks === 'object' && !Array.isArray(savedTracks) ? savedTracks : {};
  } catch {
    return {};
  }
};
const readFollowedArtists = () => {
  try {
    const savedArtists = JSON.parse(localStorage.getItem('junubify-followed-artists') || '{}');
    return savedArtists && typeof savedArtists === 'object' && !Array.isArray(savedArtists) ? savedArtists : {};
  } catch {
    return {};
  }
};
const demoTracks = [
  { id: 'demo-chief-butee', title: 'Chief Butee - OG', artist: 'Chief Butee', genre: 'Afrobeat', plays: 0, cover: fallbackCover, audioUrl: chiefButeeAudioUrl },
];
const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', subtitle: 'Modern rhythms from Juba and beyond', color: 'genre-green', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800' },
  { name: 'Traditional & Cultural', filter: 'Traditional', subtitle: 'Heritage sounds and cultural rhythms', color: 'genre-orange', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', subtitle: 'Stories and bars from across South Sudan', color: 'genre-purple', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', subtitle: 'Island rhythms with a South Sudan sound', color: 'genre-red', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800' },
  { name: 'Gospel & Choir', filter: 'Gospel', subtitle: 'Choirs and voices from home', color: 'genre-blue', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800' },
];
const featuredPlaylists = [
  { id: 'playlist-1', name: 'Juba Nights', subtitle: 'Late-night energy', accent: 'forest', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800', genre: 'Afrobeat' },
  { id: 'playlist-2', name: 'Nile Sunrise', subtitle: 'Warm rhythms', accent: 'gold', cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=800', genre: 'Traditional' },
  { id: 'playlist-3', name: 'Unity Mix', subtitle: 'Cross-city favorites', accent: 'sunset', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800', genre: 'Hip-Hop' },
  { id: 'playlist-4', name: 'Bassline South', subtitle: 'Dance all night', accent: 'deep', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800', genre: 'Dancehall' },
];

function PlaylistDetail({ playlist, tracks, playing, isPlaying, onBack, onPlayTrack, emptyMessage, kind = 'playlist' }) {
  const isGenre = kind === 'genre';
  return (
    <section className="playlist-detail">
      <button className="playlist-detail-back" onClick={onBack}><ArrowLeft size={16}/> {isGenre ? 'Back to genres' : 'Back to Discover'}</button>
      <section className="playlist-detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(7, 14, 10, .94), rgba(7, 14, 10, .35)), url(${playlist.cover})` }}>
        <span className="eyebrow">{isGenre ? 'GENRE COLLECTION' : 'FEATURED PLAYLIST'}</span>
        <h1>{playlist.name}</h1>
        <p>{playlist.subtitle}</p>
        <span className="playlist-detail-count">{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span>
        <button className="button primary" onClick={() => tracks[0] && onPlayTrack(tracks[0])}><Play size={16} fill="currentColor"/> Play {isGenre ? 'genre' : 'playlist'}</button>
      </section>
      <div className="playlist-detail-heading"><div><span className="eyebrow">{isGenre ? 'IN THIS GENRE' : 'IN THIS PLAYLIST'}</span><h2>Tracks</h2></div><span className="muted">{tracks.length} songs</span></div>
      {tracks.length ? <section className="track-list">{tracks.map((track, index) => {
        const trackIsPlaying = playing?.id === track.id && isPlaying;
        return <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => onPlayTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div><div className="track-stats"><span>Track</span><button className="mini-play" onClick={() => onPlayTrack(track)} aria-label={`${trackIsPlaying ? 'Pause' : 'Play'} ${track.title}`}>{trackIsPlaying ? <Pause size={15}/> : <Play size={15}/>}</button></div></article>;
      })}</section> : <p className="muted">{emptyMessage}</p>}
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState('discover');
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [expandedGenre, setExpandedGenre] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [playQueue, setPlayQueue] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [libraryGenre, setLibraryGenre] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [email, setEmail] = useState('');
  const [session, setSession] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [likedTracks, setLikedTracks] = useState(readLikedTracks);
  const [followedArtists, setFollowedArtists] = useState(readFollowedArtists);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const audioRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const deepLinkedTrackRef = useRef('');

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 5000);
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
      setTracks(publicTracks);
      if (session?.user?.id) setArtistTracks(await fetchArtistTracks(session.user.id));
      else setArtistTracks([]);
    } catch (error) {
      setCatalogError(error.message || 'Could not load the catalog.');
    } finally {
      setLoadingCatalog(false);
    }
  };
  useEffect(() => { refreshCatalog(); }, [session?.user?.id]);

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) return notify('Choose an audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC.');
    if (file.size > 50 * 1024 * 1024) return notify('Audio file must be 50 MB or smaller.');
    setSelectedFile(file);
  };

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Add the Supabase project URL and anon key to enable artist sign-in.');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (error) notify(error.message);
    else notify('Check your email for a secure sign-in link.');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else notify('You have signed out.');
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in to submit a track.');
    if (!selectedFile) return notify('Choose an audio file before submitting.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.');
    setSubmitting(true);
    try {
      const submission = await submitTrack({ file: selectedFile, form, artistId: session.user.id });
      setArtistTracks((current) => [submission, ...current]);
      setForm(emptyForm);
      setSelectedFile(null);
      setRightsConfirmed(false);
      event.currentTarget.reset();
      notify('Track uploaded and published. An admin will verify it afterward.');
    } catch (error) {
      notify(error.message || 'Track upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const catalogTracks = tracks.length ? tracks : demoTracks;
  const playerDuration = audioDuration;
  const matchesQuery = (track) => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.trim().toLowerCase());
  const selectedPlaylistTracks = selectedPlaylist
    ? catalogTracks.filter((track) => track.genre.toLowerCase().includes(selectedPlaylist.genre.toLowerCase()) && matchesQuery(track))
    : [];
  const selectedGenreTracks = selectedGenre
    ? catalogTracks.filter((track) => track.genre.toLowerCase().includes(selectedGenre.filter.toLowerCase()) && matchesQuery(track))
    : [];
  const visibleTracks = catalogTracks.filter((track) => {
    return matchesQuery(track) && (!genreFilter || track.genre.toLowerCase().includes(genreFilter.toLowerCase()));
  });
  const likedCatalogTracks = catalogTracks.filter((track) => likedTracks[track.id]);
  const libraryGenres = [...new Set(likedCatalogTracks.map((track) => track.genre).filter(Boolean))];
  const libraryTracks = likedCatalogTracks.filter((track) => !libraryGenre || track.genre === libraryGenre);

  const submitSearch = (event) => {
    event.preventDefault();
    setSelectedPlaylist(null);
    setSelectedGenre(null);
    setGenreFilter('');
    setTab('discover');
    window.setTimeout(() => {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  useEffect(() => {
    if (!audioUrl || !playing || !audioRef.current) return;
    audioRef.current.play().catch(() => notify('Playback could not start. Tap play again or check your connection.'));
  }, [audioUrl, playing]);

  const playTrack = async (track, queuedTracks = [], recordHistory = true) => {
    setPlayQueue(queuedTracks);
    if (playing?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => notify('Could not play this audio file.'));
      }
      else audioRef.current.pause();
      return;
    }
    try {
      const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      if (recordHistory && playing?.id !== track.id) {
        setPlayHistory((current) => (playing ? [playing, ...current].slice(0, 20) : current));
      }
      setPlaybackTime(0);
      setAudioDuration(0);
      setAudioUrl(url);
      setPlaying(track);
    } catch (error) {
      notify(error.message || 'Could not create a secure audio playback link.');
    }
  };

  const playAllTracks = (tracksToPlay) => {
    if (!tracksToPlay.length) return;
    playTrack(tracksToPlay[0], tracksToPlay.slice(1));
  };

  const advancePlayback = () => {
    if (playQueue.length) {
      const [nextTrack, ...remainingTracks] = playQueue;
      playTrack(nextTrack, remainingTracks);
      return;
    }
    setPlayQueue([]);
    setPlaying(null);
    setPlaybackTime(0);
  };

  const playPreviousTrack = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const [previousTrack, ...remainingHistory] = playHistory;
    if (!previousTrack) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    setPlayHistory(remainingHistory);
    playTrack(previousTrack, [], false);
  };

  const shuffleTracks = (tracksToShuffle) => {
    const shuffled = [...tracksToShuffle];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  };

  const playShuffledTracks = (tracksToShuffle) => {
    const [firstTrack, ...remainingTracks] = shuffleTracks(tracksToShuffle);
    if (firstTrack) playTrack(firstTrack, remainingTracks);
  };

  const seekPlayback = (event) => {
    if (audioRef.current && playerDuration) {
      audioRef.current.currentTime = Number(event.target.value);
    }
  };

  useEffect(() => {
    window.clearTimeout(sleepTimerRef.current);
    if (!sleepTimerMinutes) return undefined;
    sleepTimerRef.current = window.setTimeout(() => {
      audioRef.current?.pause();
      setSleepTimerMinutes(0);
      notify('Sleep timer ended. Playback is paused.');
    }, sleepTimerMinutes * 60 * 1000);
    return () => window.clearTimeout(sleepTimerRef.current);
  }, [sleepTimerMinutes]);

  useEffect(() => {
    const trackId = new URLSearchParams(window.location.search).get('track');
    if (!trackId || deepLinkedTrackRef.current === trackId) return;
    const track = catalogTracks.find((item) => String(item.id) === trackId);
    if (!track) return;
    deepLinkedTrackRef.current = trackId;
    setTab('discover');
    setSelectedPlaylist(null);
    setSelectedGenre(null);
    setPlayerExpanded(true);
    playTrack(track);
  }, [catalogTracks, playTrack]);

  const toggleLike = (trackId) => {
    const wasLiked = Boolean(likedTracks[trackId]);
    setLikedTracks((current) => {
      const next = { ...current, [trackId]: !current[trackId] };
      try { localStorage.setItem('junubify-liked-tracks', JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
      return next;
    });
    notify(wasLiked ? 'Removed from Liked Songs.' : 'Added to Liked Songs.');
  };

  const toggleFollowArtist = (artistName) => setFollowedArtists((current) => {
    const next = { ...current, [artistName]: !current[artistName] };
    try { localStorage.setItem('junubify-followed-artists', JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
    return next;
  });

  const selectAudioOutput = async () => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.selectAudioOutput || !audioRef.current?.setSinkId) {
      notify('Audio output selection is not supported by this browser.');
      return;
    }
    try {
      const device = await mediaDevices.selectAudioOutput();
      await audioRef.current.setSinkId(device.deviceId);
      notify(`Audio output changed to ${device.label || 'the selected device'}.`);
    } catch (error) {
      if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') notify('Could not change the audio output.');
    }
  };

  const scrollToQueue = () => {
    document.getElementById('up-next')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const shareTrack = async (track) => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${track.title} · Junubify`, text: `Listen to ${track.title} by ${track.artist} on Junubify`, url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); notify('Track link copied to clipboard.'); }
      else notify(url);
    } catch (error) { if (error.name !== 'AbortError') notify('Could not share this track.'); }
  };

  const openPlaylist = (playlist, autoplay = false) => {
    const matching = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase()));
    if (!matching.length) return notify(`No ${playlist.name} songs are available yet.`);
    setSelectedGenre(null);
    setSelectedPlaylist(playlist);
    setGenreFilter('');
    setQuery('');
    if (autoplay) playTrack(matching[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGenre = (genre) => {
    setSelectedPlaylist(null);
    setSelectedGenre(genre);
    setQuery('');
    setGenreFilter('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => { setSelectedPlaylist(null); setSelectedGenre(null); setTab('discover'); }} aria-label="Junubify home"><span className="brand-icon"><Radio size={21}/></span><span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span></button>
        <form className="search-form" role="search" onSubmit={submitSearch}>
          <input className="search" value={query} onChange={(event) => { setQuery(event.target.value); setGenreFilter(''); }} placeholder="Search tracks or artists" aria-label="Search tracks or artists" />
          <button className="search-button" type="submit" aria-label="Search tracks"><Search size={16}/><span>Search</span></button>
        </form>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => { setSelectedPlaylist(null); setSelectedGenre(null); setTab('discover'); }}><Headphones size={17}/> Discover</button>
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><Heart size={17}/> Your Library</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17}/> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17}/> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17}/> Get the app</button>
        </nav>
      </header>
      <main className="content">
        {tab === 'discover' && (selectedPlaylist ? <PlaylistDetail playlist={selectedPlaylist} tracks={selectedPlaylistTracks} playing={playing} isPlaying={Boolean(audioRef.current && !audioRef.current.paused)} onBack={() => setSelectedPlaylist(null)} onPlayTrack={playTrack} emptyMessage={query ? 'No songs match your search.' : 'No songs are available in this playlist yet.'}/> : selectedGenre ? <PlaylistDetail playlist={selectedGenre} tracks={selectedGenreTracks} playing={playing} isPlaying={Boolean(audioRef.current && !audioRef.current.paused)} onBack={() => setSelectedGenre(null)} onPlayTrack={playTrack} emptyMessage={query ? 'No songs match your search.' : 'No songs are available in this genre yet.'} kind="genre"/> : <>
          <section className="hero trend-hero"><div className="hero-copy"><span className="eyebrow"><AudioLines size={14}/> FEATURED JUBA PLAYLIST</span><h1>Top 50 South Sudan Trends</h1><p>Discover sounds from Juba, Wau, Malakal, and the diaspora. Explore community favorites and new releases.</p><div className="hero-actions"><button className="button primary hero-play" onClick={() => playAllTracks(visibleTracks)} disabled={!visibleTracks.length}><Play size={16} fill="currentColor"/> Play All <span>{visibleTracks.length}</span></button><button className="button secondary" onClick={() => setTab('studio')}><Upload size={16}/> Upload Song</button></div></div><div className="hero-badge"><BadgeCheck size={18}/> A home for local artists</div></section>

          <section className="featured-artist panel"><img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85" alt="Featured musician"/><div className="featured-artist-copy"><span className="eyebrow"><BadgeCheck size={14}/> FEATURED ARTIST</span><h2>Emmanuel Jal</h2><p>Artist, storyteller, and a powerful voice in South Sudanese music.</p><button className="button secondary" onClick={() => { setQuery('Emmanuel Jal'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }}><Headphones size={15}/> Explore artist</button></div><div className="artist-sparkle"><Sparkles size={24}/></div></section>

          <section className="genre-section"><div className="section-heading"><div><span className="eyebrow">EXPLORE</span><h2><Compass size={22}/> Explore Juba Genres</h2></div></div><div className="genre-grid">{genres.map((genre) => { const matchingTracks = catalogTracks.filter((track) => track.genre.toLowerCase().includes(genre.filter.toLowerCase())); const expanded = expandedGenre === genre.filter; return <article key={genre.name} className={`genre-card ${genre.color} ${expanded ? 'expanded' : ''}`}><button className="genre-toggle" style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 14, 10, .2), rgba(7, 14, 10, .9)), url(${genre.cover})` }} aria-expanded={expanded} onClick={() => setExpandedGenre((current) => current === genre.filter ? null : genre.filter)}><strong>{genre.name}</strong><span>{matchingTracks.length} {matchingTracks.length === 1 ? 'track' : 'tracks'} · {expanded ? 'Hide songs' : 'View songs'}</span></button>{expanded && <><div className="genre-song-list">{matchingTracks.length ? matchingTracks.slice(0, 3).map((track) => <button key={track.id} className="genre-song" onClick={() => playTrack(track)} aria-label={`Play ${track.title} by ${track.artist}`}><span className="genre-song-copy"><strong>{track.title}</strong><small>{track.artist} · {track.genre}</small></span><Play size={15} fill="currentColor"/></button>) : <p className="genre-empty">No songs available yet.</p>}</div><button className="genre-explore" onClick={() => openGenre(genre)} aria-label={`Explore ${genre.name}`}><Compass size={14}/> Explore genre <ArrowRight size={14}/></button></>}</article>; })}</div></section>

          <section className="featured-playlists"><div className="section-heading compact-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2><Sparkles size={22}/> Featured playlists</h2></div></div><div className="playlist-grid">{featuredPlaylists.map((playlist) => { const count = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase())).length; return <article key={playlist.id} className={`playlist-card ${playlist.accent}`}><div className="playlist-art" style={{ backgroundImage: `url(${playlist.cover})` }}><span className="playlist-tag">{count} {count === 1 ? 'track' : 'tracks'}</span><button className="playlist-play" onClick={() => openPlaylist(playlist, true)} aria-label={`Play ${playlist.name}`}><Play size={18} fill="currentColor"/></button></div><div className="playlist-body"><strong>{playlist.name}</strong><small>{playlist.subtitle}</small><button className="button secondary playlist-button" onClick={() => openPlaylist(playlist)}>Explore mix</button></div></article>; })}</div></section>

          <section className="trending-section" id="catalog"><div className="now-trending-ticker" aria-label="Featured song"><span>♪ FEATURED TRACK · CHIEF BUTEE - OG</span></div><div className="section-heading"><div><span className="eyebrow">THE JUNUBIFY CATALOG</span><h2><TrendingUp size={22}/> {query.trim() ? `Search results for “${query.trim()}”` : 'Trending tracks in Juba'}</h2></div><span className="muted">{genreFilter && <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear genre · </button>}{visibleTracks.length} tracks</span></div><div className="hot-badge"><span aria-hidden="true">✦</span> HOT RIGHT NOW</div><p className="catalog-status">Uploads are published immediately and reviewed by an administrator afterward.</p>{!tracks.length && <p className="catalog-status">Featured track · connect Supabase for the live catalog</p>}{loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}{catalogError && <div className="notice-box"><b>Catalog unavailable</b><p>{catalogError}</p><button className="button secondary" onClick={refreshCatalog}>Try again</button></div>}<section className="track-list">{visibleTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div><div className="track-stats"><span><Heart size={14}/> {Number(track.plays || 0).toLocaleString()}</span><button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15}/> : <Play size={15}/>}</button><button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} aria-pressed={Boolean(likedTracks[track.id])} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? `Unlike ${track.title}` : `Like ${track.title}`}><Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'}/></button><button className="track-action track-share" onClick={() => shareTrack(track)} aria-label={`Share ${track.title}`}><Upload size={17}/></button></div></article>)}</section>{!visibleTracks.length && <div className="panel empty-catalog"><Music2 size={26}/><b>No tracks match this filter.</b><span>Choose another genre or clear your search.</span></div>}</section>
          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Upload music to publish it immediately; an admin verifies it afterward.</p></div><button className="button primary" onClick={() => setTab('studio')}><Upload size={16}/> Open studio</button></section>
        </>)}

        {tab === 'library' && <section className="liked-library">
          <div className="liked-library-hero">
            <div className="liked-art"><Heart size={44} fill="currentColor"/></div>
            <div className="liked-library-copy"><span className="eyebrow">YOUR COLLECTION</span><h1>Liked Songs</h1><p>{likedCatalogTracks.length} {likedCatalogTracks.length === 1 ? 'song' : 'songs'} saved on this device</p></div>
            <div className="liked-library-actions">
              <button className="button primary" onClick={() => playAllTracks(libraryTracks)} disabled={!libraryTracks.length}><Play size={16} fill="currentColor"/> Play</button>
              <button className="button secondary" onClick={() => playShuffledTracks(libraryTracks)} disabled={!libraryTracks.length}><Shuffle size={16}/> Shuffle</button>
            </div>
          </div>
          {libraryGenres.length > 0 && <div className="library-filters" aria-label="Filter liked songs by genre">
            <button className={!libraryGenre ? 'active' : ''} onClick={() => setLibraryGenre('')}>All</button>
            {libraryGenres.map((genre) => <button key={genre} className={libraryGenre === genre ? 'active' : ''} onClick={() => setLibraryGenre(genre)}>{genre}</button>)}
          </div>}
          {libraryTracks.length ? <section className="track-list">{libraryTracks.map((track, index) => <article className="track-row" key={track.id}>
            <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
            <button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button>
            <div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div>
            <div className="track-stats"><button className="track-action liked" aria-pressed="true" onClick={() => toggleLike(track.id)} aria-label={`Remove ${track.title} from liked songs`}><Heart size={17} fill="currentColor"/></button><button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><Play size={15}/></button></div>
          </article>)}</section> : <div className="panel empty-catalog liked-empty"><Heart size={26}/><b>No liked songs yet.</b><span>Tap the heart on a track in Discover to save it here.</span><button className="button secondary" onClick={() => setTab('discover')}>Browse Discover</button></div>}
        </section>}

        {tab === 'studio' && <><section className="section-heading"><div><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p className="muted">Uploads go live immediately and are then verified by an administrator.</p></div></section>{!supabaseConfigured && <div className="notice-box prominent"><b>Backend setup required</b><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then apply the Supabase migrations to enable uploads.</p></div>}{!session ? <section className="panel studio-auth"><h2>Sign in to submit music</h2><p className="muted">We’ll email you a secure sign-in link.</p><form onSubmit={requestSignIn}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><button className="button primary" type="submit">Send sign-in link</button></form></section> : <><div className="studio-account"><span>Signed in as <b>{session.user.email}</b></span><button className="button secondary" onClick={signOut}>Sign out</button></div><div className="studio-grid"><form className="panel upload-form" onSubmit={publishTrack}><h2><Upload size={19}/> Submit a song</h2><p className="muted">MP3, WAV, M4A, OGG, AAC, or FLAC · up to 50 MB</p><label>Song title<input required maxLength="100" value={form.title} onChange={(event) => setForm({...form, title: event.target.value})} placeholder="e.g. Nile Sunset"/></label><label>Artist name<input required maxLength="100" value={form.artist} onChange={(event) => setForm({...form, artist: event.target.value})} placeholder="Your artist name"/></label><label>Genre<select value={form.genre} onChange={(event) => setForm({...form, genre: event.target.value})}><option>Afrobeat</option><option>Dancehall</option><option>Hip-Hop</option><option>Traditional &amp; Cultural</option><option>Gospel &amp; Choir</option><option>Afro-Pop</option></select></label><label>Album / release name<input maxLength="100" value={form.album} onChange={(event) => setForm({...form, album: event.target.value})} placeholder="Single"/></label><label>Cover image URL <span className="muted">(optional)</span><input type="url" value={form.cover} onChange={(event) => setForm({...form, cover: event.target.value})} placeholder="https://"/></label><label className="file-picker"><Music2 size={21}/><span><b>{selectedFile ? selectedFile.name : 'Choose audio file'}</b><small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Audio file · up to 50 MB'}</small></span><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" onChange={(event) => handleFile(event.target.files?.[0])}/></label><label className="rights-confirm"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)}/><span>I confirm that I own or control the rights to this audio.</span></label><button className="button primary full" type="submit" disabled={submitting || !supabaseConfigured}><Upload size={16}/>{submitting ? 'Publishing…' : 'Upload & publish now'}</button><p className="fine-print">Public immediately; admin verification follows.</p></form><section className="panel catalog-panel"><div className="catalog-title"><h2>Your submissions</h2><button className="button secondary" onClick={refreshCatalog}>Refresh</button></div>{artistTracks.length ? artistTracks.map((track) => <div className="mini-track" key={track.id}><img src={track.cover} alt=""/><div><strong>{track.title}</strong><span>{track.artist} · {track.status === 'published' ? (track.verifiedAt ? 'verified' : 'live · awaiting verification') : track.status.replace('_', ' ')}</span></div>{track.status === 'published' && <button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><Play size={14}/></button>}</div>) : <div className="catalog-empty"><div className="empty-icon"><Music2 size={22}/></div><p><strong>Your submissions will appear here</strong></p><small>Submit a track to add it to your private artist catalog.</small></div>}</section></div></>}</>}

        {tab === 'monetize' && <><section className="section-heading"><div><span className="eyebrow">CREATOR ECONOMY</span><h1>Monetization</h1><p className="muted">Plans and royalty information. Payments are not active.</p></div></section><div className="notice-box prominent"><b>Payments are not live yet</b><p>{paymentSetupMessage}</p></div><section className="plan-grid"><article className="panel plan-card"><span className="eyebrow">FOR LISTENERS</span><h2>Premium Fan</h2><div className="price">$2.99 <small>/ month</small></div><ul><li>Ad-free listening concept</li><li>Support local artists</li><li>Exclusive releases</li></ul></article><article className="panel plan-card"><span className="eyebrow">FOR ARTISTS</span><h2>Pro Creator</h2><div className="price">70% <small>proposed share</small></div><ul><li>Artist uploads</li><li>Proposed royalty share</li><li>Listener analytics concept</li></ul></article></section><section className="panel payout-panel"><div><span className="eyebrow">ROYALTIES &amp; PAYOUTS</span><h2>Artist earnings</h2><p className="muted">No earnings are calculated or transferred yet.</p></div><Wallet size={28}/></section></>}

        {tab === 'download' && <section className="app-download panel"><div className="download-icon"><Smartphone size={42}/></div><span className="eyebrow">LISTEN WHEREVER YOU ARE</span><h1>Get Junubify for Android &amp; iOS</h1><p>Use the installable web app to keep Junubify close. Native store downloads will be linked once the apps are published.</p><div className="store-buttons"><div className="store-placeholder"><Download size={22}/><span><small>ANDROID APP</small><b>Coming soon</b></span></div><div className="store-placeholder"><Download size={22}/><span><small>APPLE APP</small><b>Coming soon</b></span></div></div><div className="qr-placeholder" aria-label="Decorative QR-style pattern" role="img">{Array.from({ length: 64 }, (_, index) => <i key={index} className={(index * 7 + index % 3) % 4 === 0 ? 'qr-lit' : ''}/>)}</div><p className="muted">To install the current web app, use your browser menu and choose “Add to Home screen”.</p></section>}
      </main>
      {playerExpanded && playing && <section className="now-playing-view" role="dialog" aria-modal="true" aria-label={`Now playing ${playing.title}`}>
        <div className="now-playing-header"><button className="player-close" onClick={() => setPlayerExpanded(false)} aria-label="Close now playing"><ChevronDown size={25}/></button><span>NOW PLAYING</span><button className="player-icon-button" onClick={() => shareTrack(playing)} aria-label="Share track"><Share2 size={19}/></button></div>
        <div className="now-playing-content">
          <img className="now-playing-art" src={playing.cover || fallbackCover} alt={`Cover art for ${playing.title}`}/>
          <div className="now-playing-track"><div><h1>{playing.title}</h1><p>{playing.artist}{playing.status === 'published' && !playing.verifiedAt && <span className="track-verification"> · Live, awaiting verification</span>}</p></div><button className={`track-action ${likedTracks[playing.id] ? 'liked' : ''}`} aria-pressed={Boolean(likedTracks[playing.id])} onClick={() => toggleLike(playing.id)} aria-label={likedTracks[playing.id] ? 'Unlike track' : 'Like track'}><Heart size={20} fill={likedTracks[playing.id] ? 'currentColor' : 'none'}/></button></div>
          <div className="full-player-progress"><input aria-label="Seek through track" type="range" min="0" max={playerDuration || 1} value={Math.min(playbackTime, playerDuration || 0)} onChange={seekPlayback}/><div><span>{formatPlaybackTime(playbackTime)}</span><span>{formatPlaybackTime(playerDuration)}</span></div></div>
          <div className="full-player-controls">
            <button className="player-icon-button" onClick={() => setPlayQueue((current) => shuffleTracks(current))} aria-label="Shuffle upcoming tracks" disabled={playQueue.length < 2}><Shuffle size={21}/></button>
            <button className="player-icon-button" onClick={playPreviousTrack} aria-label="Play previous track"><SkipBack size={23} fill="currentColor"/></button>
            <button className="full-player-toggle" onClick={() => playTrack(playing)} aria-label={audioRef.current && !audioRef.current.paused ? 'Pause' : 'Play'}>{audioRef.current && !audioRef.current.paused ? <Pause size={26} fill="currentColor"/> : <Play size={26} fill="currentColor"/>}</button>
            <button className="player-icon-button" onClick={advancePlayback} aria-label="Play next track" disabled={!playQueue.length}><SkipForward size={23} fill="currentColor"/></button>
            <button className="player-icon-button" onClick={() => setSleepTimerMinutes((minutes) => minutes ? 0 : 30)} aria-label={sleepTimerMinutes ? `Turn off ${sleepTimerMinutes} minute sleep timer` : 'Set a 30 minute sleep timer'} aria-pressed={Boolean(sleepTimerMinutes)}><Timer size={21}/></button>
          </div>
          <div className="player-utility-controls">
            <button className="player-icon-button" onClick={selectAudioOutput} aria-label="Select audio output"><Volume2 size={20}/></button>
            <button className="player-icon-button" onClick={() => shareTrack(playing)} aria-label="Share track"><Share2 size={20}/></button>
            <button className="player-icon-button" onClick={scrollToQueue} aria-label="View play queue" disabled={!playQueue.length}><ListMusic size={21}/></button>
            {sleepTimerMinutes > 0 && <span className="sleep-timer-status">{sleepTimerMinutes} min timer on · tap timer to cancel</span>}
          </div>
          <section className="lyrics-preview">
            <div className="player-section-heading"><h2>Lyrics preview</h2><button className="text-button" onClick={() => setShowLyrics((visible) => !visible)}>{showLyrics ? 'Hide' : 'Show lyrics'}</button></div>
            {showLyrics && <p>{playing.lyrics || 'Lyrics are not available for this track yet.'}</p>}
          </section>
          <section className="artist-preview">
            <div className="artist-preview-art"><img src={playing.artistCover || playing.cover || fallbackCover} alt={`Artwork for ${playing.artist}`}/></div>
            <div className="artist-preview-copy">
              <span className="eyebrow">ABOUT THE ARTIST</span>
              <h2>{playing.artist}</h2>
              <p>{playing.artistBio || 'Artist profile details are not available yet.'}</p>
              <button className="button secondary follow-artist" onClick={() => toggleFollowArtist(playing.artist)}>{followedArtists[playing.artist] ? 'Following' : 'Follow'}</button>
            </div>
          </section>
          <section className="player-credits">
            <div className="player-section-heading"><h2>Credits</h2><span className="eyebrow">TRACK DETAILS</span></div>
            <div className="credit-row"><span>{playing.artist}</span><small>Main artist</small></div>
            {playing.album && <div className="credit-row"><span>{playing.album}</span><small>Album</small></div>}
            {Array.isArray(playing.credits) && playing.credits.map((credit, index) => <div className="credit-row" key={`${credit.name}-${index}`}><span>{credit.name}</span><small>{credit.role}</small></div>)}
            {(!playing.credits || !playing.credits.length) && <p>Additional credits are not available for this track yet.</p>}
          </section>
          {playQueue.length > 0 && <section className="up-next" id="up-next"><h2>Up next</h2>{playQueue.map((track, index) => <button key={`${track.id}-${index}`} onClick={() => playTrack(track, playQueue.slice(index + 1))}><img src={track.cover || fallbackCover} alt=""/><span><b>{track.title}</b><small>{track.artist}</small></span><Play size={15}/></button>)}</section>}
        </div>
      </section>}
      <footer className="player"><button className="player-track" onClick={() => playing && setPlayerExpanded(true)} disabled={!playing} aria-label={playing ? 'Open media player' : 'Nothing playing'} title={playing ? 'Open media player' : undefined}>{playing ? <><img src={playing.cover || fallbackCover} alt=""/><span><b>{playing.title}</b><small>{playing.artist}</small></span><ChevronUp className="player-open-icon" size={18}/></> : <><span className="player-note"><Music2 size={16}/></span><span><b>Nothing playing</b><small>Pick a track to listen</small></span></>}</button><audio ref={audioRef} src={audioUrl || undefined} onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setPlaybackTime(event.currentTarget.currentTime)} onEnded={() => advancePlayback()}/>{playing && <div className="player-progress" aria-label="Playback progress"><span>{formatPlaybackTime(playbackTime)}</span><progress max={playerDuration || 1} value={playerDuration ? Math.min(playbackTime, playerDuration) : 0}/><span>{formatPlaybackTime(playerDuration)}</span></div>}<button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label="Toggle playback">{playing && audioRef.current && !audioRef.current.paused ? <Pause size={16}/> : <Play size={16}/>}</button></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
