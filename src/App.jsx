
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  BadgeCheck,
  CircleDollarSign,
  Compass,
  Download,
  Headphones,
  Heart,
  Music2,
  Pause,
  Play,
  Radio,
  Smartphone,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
} from 'lucide-react';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, BadgeCheck, CircleDollarSign, Compass, Copy, Download, Headphones, Heart, Music2, Pause, Play, Radio, Share2, SkipBack, SkipForward, Smartphone, Sparkles, Upload, Volume2, VolumeX, X } from 'lucide-react';

import { supabase, supabaseConfigured } from './lib/supabase.js';
import { createTrackAudioUrl, fetchArtistTracks, fetchPublishedTracks, submitTrack } from './lib/catalog.js';
import ogAudioUrl from '../CHIEF BUTEE - OG.mp3';
import ogCoverUrl from '../1794694060126.jpg';

const paymentSetupMessage = 'Checkout and payouts are not connected yet. Configure a payment provider and secure backend before accepting money or promising transfers.';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '' };
const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500';
const demoTracks = [
  { id: 'demo-1', title: 'Juba City Lights (Preview)', artist: 'Junubify Sample', genre: 'Afrobeat', plays: 124500, cover: fallbackCover, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'demo-2', title: 'White Nile Groove (Preview)', artist: 'Junubify Sample', genre: 'Dancehall', plays: 98200, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'demo-3', title: 'Peace in South Sudan (Preview)', artist: 'Junubify Sample', genre: 'Hip-Hop', plays: 215800, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'demo-4', title: 'Bahr el Ghazal Breeze (Preview)', artist: 'Junubify Sample', genre: 'Traditional & Cultural', plays: 68400, cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'demo-5', title: 'Custom Bus Dance (Preview)', artist: 'Junubify Sample', genre: 'Afro-Pop', plays: 57300, cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=500', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
const formatPlaybackTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const totalSeconds = Math.floor(seconds);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};
const featuredTracks = [
  { id: 'chief-butee-og', title: 'O.G.', artist: 'Chief Butee', genre: 'Uncategorized', plays: 0, cover: ogCoverUrl, audioUrl: ogAudioUrl },

];

const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', subtitle: 'Modern rhythms from Juba and beyond', color: 'genre-green', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=900' },
  { name: 'Traditional & Cultural', filter: 'Traditional', subtitle: 'Heritage sounds and cultural rhythms', color: 'genre-orange', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=900' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', subtitle: 'Stories and bars from across South Sudan', color: 'genre-purple', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd815?auto=format&fit=crop&q=80&w=900' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', subtitle: 'Island rhythms with a South Sudan sound', color: 'genre-red', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=900' },
  { name: 'Gospel & Choir', filter: 'Gospel', subtitle: 'Choirs and voices from home', color: 'genre-blue', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=900' },
];

const featuredPlaylists = [
  { id: 'playlist-chief-butee-og', name: 'O.G. · Chief Butee', subtitle: 'Featured release', accent: 'forest', cover: ogCoverUrl, genre: 'Uncategorized' },
];


const safeLocalStorage = {
  read(key, fallback = {}) {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore  errors in private browsing mode.
    }
  },
};

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
        return <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => onPlayTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div></article>;
      })}</section> : <p className="muted">{emptyMessage}</p>}
    </section>
  );
};

export default function App() {
  const [tab, setTab] = useState('discover');
  const [mobilePlayerOpen, setMobilePlayerOpen] = useState(false);
  const [shareModalTrack, setShareModalTrack] = useState(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [paymentProvider, setPaymentProvider] = useState('m-gurush');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [artistTracks, setArtistTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [expandedGenre, setExpandedGenre] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [playQueue, setPlayQueue] = useState([]);
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

  const [likedTracks, setLikedTracks] = useState(() => safeLocalStorage.read('junubify-liked-tracks', {}))
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [likedTracks, setLikedTracks] = useState(() => { try { return JSON.parse(localStorage.getItem('junubify-liked-tracks') || '{}'); } catch { return {}; } });

  const audioRef = useRef(null);

  const notify = (message) => { setNotice(message); window.clearTimeout(notify.timeout); notify.timeout = window.setTimeout(() => setNotice(''), 5000); };

  useEffect(() => {
    if (!supabase) return undefined;


    supabase.auth.getSession().then(({ data, error }) => {
      if (error) notify(error.message);
      setSession(data?.session ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });


    supabase.auth.getSession().then(({ data, error }) => { if (error) notify(error.message); setSession(data?.session ?? null); });
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
      if (session?.user?.id) {
        setArtistTracks(await fetchArtistTracks(session.user.id));
      } else {
        setArtistTracks([]);
      }
    } catch (error) {
      setCatalogError(error.message || 'Could not load the catalog.');
    } finally {
      setLoadingCatalog(false);
    }

    setLoadingCatalog(true); setCatalogError('');
    try { const publicTracks = await fetchPublishedTracks(); setTracks(publicTracks); if (session?.user?.id) setArtistTracks(await fetchArtistTracks(session.user.id)); else setArtistTracks([]); }
    catch (error) { setCatalogError(error.message || 'Could not load the catalog.'); }
    finally { setLoadingCatalog(false); }

  };

  useEffect(() => {
    refreshCatalog();
  }, [session?.user?.id]);


  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) {
      return notify('Choose an audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC.');
    }
    if (file.size > 50 * 1024 * 1024) {
      return notify('Audio file must be 50 MB or smaller.');
    }
    setSelectedFile(file);
  };

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Add the Supabase project URL and anon key to enable artist sign-in.');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) notify(error.message);
    else notify('Check your email for a secure sign-in link.');
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else notify('You have signed out.');
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
      event.currentTarget.reset();
      notify('Track uploaded securely and submitted for review. It will appear in Discover after approval.');
    } catch (error) {
      notify(error.message || 'Track upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const catalogTracks = tracks.length ? tracks : demoTracks;
  const visibleTracks = useMemo(() => {
    return catalogTracks.filter((track) => {
      const text = `${track.title} ${track.artist} ${track.genre}`.toLowerCase();
      const matchesText = text.includes(query.toLowerCase());
      const matchesGenre = !genreFilter || track.genre.toLowerCase().includes(genreFilter.toLowerCase());
      return matchesText && matchesGenre;
    });
  }, [catalogTracks, query, genreFilter]);

  useEffect(() => {
    if (!audioUrl || !playing || !audioRef.current) return;
    audioRef.current.play().catch(() => notify('Playback could not start. Tap play again or check your connection.'));
  }, [audioUrl, playing]);

  const playTrack = async (track) => {
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
    } catch (error) {
      notify(error.message || 'Could not create a secure audio playback link.');
    }
  };

  const toggleLike = (trackId) => {
    setLikedTracks((current) => {
      const next = { ...current, [trackId]: !current[trackId] };
      safeLocalStorage.write('junubify-liked-tracks', next);
      return next;
    });
  };

  const shareTrack = async (track) => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${track.title} · Junubify`, text: `Listen to ${track.title} by ${track.artist} on Junubify`, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify('Track link copied to clipboard.');
      } else {
        notify(url);
      }
    } catch (error) {
      if (error.name !== 'AbortError') notify('Could not share this track.');
    }
  };

  const selectGenre = (genre) => {
    setGenreFilter((current) => current === genre ? '' : genre);
    setQuery('');
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const openPlaylist = (playlist, autoplay = false) => {
    const matching = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase()));
    if (!matching.length) return notify(`No ${playlist.name} songs are available yet.`);
    setGenreFilter(playlist.genre);
    setQuery('');
    if (autoplay) playTrack(matching[0]);
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const handleFile = (file) => { if (!file) return; if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) return notify('Choose an audio file such as MP3, WAV, M4A, OGG, AAC, or FLAC.'); if (file.size > 50 * 1024 * 1024) return notify('Audio file must be 50 MB or smaller.'); setSelectedFile(file); };
  const requestSignIn = async (event) => { event.preventDefault(); if (!supabase) return notify('Add the Supabase project URL and anon key to enable artist sign-in.'); const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } }); if (error) notify(error.message); else notify('Check your email for a secure sign-in link.'); };
  const signOut = async () => { const { error } = await supabase.auth.signOut(); if (error) notify(error.message); else notify('You have signed out.'); };
  const publishTrack = async (event) => { event.preventDefault(); if (!session?.user) return notify('Sign in to submit a track.'); if (!selectedFile) return notify('Choose an audio file before submitting.'); if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.'); setSubmitting(true); try { const submission = await submitTrack({ file: selectedFile, form, artistId: session.user.id }); setArtistTracks((current) => [submission, ...current]); setForm(emptyForm); setSelectedFile(null); setRightsConfirmed(false); event.currentTarget.reset(); notify('Track uploaded securely and submitted for review. It will appear in Discover after approval.'); } catch (error) { notify(error.message || 'Track upload failed. Please try again.'); } finally { setSubmitting(false); } };

  const catalogTracks = tracks.length ? tracks : featuredTracks;
  const playerDuration = audioDuration;
  const matchesQuery = (track) => `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase());
  const selectedPlaylistTracks = selectedPlaylist ? catalogTracks.filter((track) => track.genre.toLowerCase().includes(selectedPlaylist.genre.toLowerCase()) && matchesQuery(track)) : [];
  const selectedGenreTracks = selectedGenre ? catalogTracks.filter((track) => track.genre.toLowerCase().includes(selectedGenre.filter.toLowerCase()) && matchesQuery(track)) : [];
  const visibleTracks = catalogTracks.filter((track) => matchesQuery(track) && (!genreFilter || track.genre.toLowerCase().includes(genreFilter.toLowerCase())));

  useEffect(() => { if (!audioUrl || !playing || !audioRef.current) return; audioRef.current.play().catch(() => notify('Playback could not start. Tap play again or check your connection.')); }, [audioUrl, playing]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = muted ? 0 : volume; }, [volume, muted]);

  const playTrack = async (track, queuedTracks = []) => { setPlayQueue(queuedTracks); if (playing?.id === track.id && audioRef.current) { if (audioRef.current.paused) audioRef.current.play().catch(() => notify('Could not play this audio file.')); else audioRef.current.pause(); return; } try { const url = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl; if (!url) return notify('Audio is not available for this track.'); setPlaybackTime(0); setAudioDuration(0); setAudioUrl(url); setPlaying(track); if (window.matchMedia('(max-width: 760px)').matches) setMobilePlayerOpen(true); } catch (error) { notify(error.message || 'Could not create a secure audio playback link.'); } };
  const playAllTracks = (tracksToPlay) => { if (!tracksToPlay.length) return; playTrack(tracksToPlay[0], tracksToPlay.slice(1)); };
  const advancePlayback = () => { if (repeat && playing) { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => notify('Could not replay this audio file.')); } return; } if (playQueue.length) { const [nextTrack, ...remainingTracks] = playQueue; playTrack(nextTrack, remainingTracks); return; } if (catalogTracks.length) { const currentIndex = catalogTracks.findIndex((track) => track.id === playing?.id); const nextIndex = shuffle ? Math.floor(Math.random() * catalogTracks.length) : (currentIndex + 1 + catalogTracks.length) % catalogTracks.length; playTrack(catalogTracks[nextIndex], catalogTracks.filter((_, index) => index !== nextIndex)); } else { setPlayQueue([]); setPlaying(null); setPlaybackTime(0); } };
  const previousPlayback = () => { if (!catalogTracks.length) return; const currentIndex = catalogTracks.findIndex((track) => track.id === playing?.id); const previousIndex = (currentIndex - 1 + catalogTracks.length) % catalogTracks.length; playTrack(catalogTracks[previousIndex], catalogTracks.slice(previousIndex + 1)); };
  const toggleLike = (trackId) => setLikedTracks((current) => { const next = { ...current, [trackId]: !current[trackId] }; try { localStorage.setItem('junubify-liked-tracks', JSON.stringify(next)); } catch {} return next; });
  const shareTrack = (track) => setShareModalTrack(track);
  const copyShareLink = async (track) => { const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`; try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url); else notify(url); notify('Track link copied to clipboard.'); setShareModalTrack(null); } catch { notify('Could not copy the track link.'); } };
  const openPlaylist = (playlist, autoplay = false) => { const matching = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase())); if (!matching.length) return notify(`No ${playlist.name} songs are available yet.`); setSelectedGenre(null); setSelectedPlaylist(playlist); setGenreFilter(''); setQuery(''); if (autoplay) playTrack(matching[0]); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openGenre = (genre) => { setSelectedPlaylist(null); setSelectedGenre(genre); setQuery(''); setGenreFilter(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };


  return (
    <div className="app-shell">
      <header className="topbar">

        <button className="brand" onClick={() => setTab('discover')} aria-label="Junubify home">
          <span className="brand-icon"><Radio size={21} /></span>
          <span>
            <b>JUNUBIFY</b>
            <small>SOUTH SUDAN BEATS</small>
          </span>
        </button>

        <input
          className="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setGenreFilter('');
          }}
          placeholder="Search tracks or artists"
          aria-label="Search tracks or artists"
        />

        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17} /> Discover</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17} /> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17} /> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17} /> Get the app</button>

        <button className="brand" onClick={() => { setSelectedPlaylist(null); setSelectedGenre(null); setTab('discover'); }} aria-label="Junubify home"><span className="brand-icon"><Radio size={20}/></span><span><b>Junubify</b><small>SOUTH SUDAN BEATS</small></span></button>
        <input className="search" value={query} onChange={(event) => { setQuery(event.target.value); setGenreFilter(''); }} placeholder="Search tracks or artists" aria-label="Search tracks or artists"/>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => { setSelectedPlaylist(null); setSelectedGenre(null); setTab('discover'); }}><Headphones size={17}/> Discover</button>
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><Heart size={17}/> Library</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17}/> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17}/> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17}/> Get the app</button>

        </nav>
      </header>

      <main className="content">

        {tab === 'discover' && (
          <>
            <section className="hero trend-hero">
              <div className="hero-copy">
                <span className="eyebrow"><AudioLines size={14} /> FEATURED JUBA PLAYLIST</span>
                <h1>Top 50 South Sudan Trends</h1>
                <p>Discover fresh voices, warm grooves, and powerful stories from Juba, Malakal, Yei, and every rhythm city across the Republic.</p>
                <div className="hero-actions">
                  <button className="button primary" onClick={() => setTab('studio')}><Upload size={16} /> Submit a track</button>
                  <button className="button secondary" onClick={() => setTab('download')}><Download size={16} /> Get the app</button>
                </div>
              </div>

              <div className="hero-visual panel">
                <img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85" alt="Featured musician" />
                <div className="hero-metrics">
                  <span><TrendingUp size={16} /> +17% this week</span>
                  <span><BadgeCheck size={16} /> Verified listeners</span>
                </div>
              </div>
            </section>

            <section className="featured-artist panel">
              <img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=85" alt="Featured musician" />
              <div className="featured-artist-copy">
                <span className="eyebrow"><BadgeCheck size={14} /> FEATURED ARTIST</span>
                <h2>Emmanuel Jal</h2>
                <p>Artist, storyteller, and a powerful voice in South Sudanese music.</p>
                <button className="button secondary" onClick={() => { setQuery('Emmanuel Jal'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  <Headphones size={15} /> Explore artist
                </button>
              </div>
              <div className="artist-sparkle"><Sparkles size={24} /></div>
            </section>

            <section className="genre-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">EXPLORE</span>
                  <h2><Compass size={22} /> Explore Juba Genres</h2>
                </div>
              </div>

              <div className="genre-grid">
                {genres.map((genre) => {
                  const count = catalogTracks.filter((track) => track.genre.toLowerCase().includes(genre.filter.toLowerCase())).length;
                  return (
                    <button key={genre.name} className={`genre-card ${genre.color} ${genreFilter === genre.filter ? 'selected' : ''}`} onClick={() => selectGenre(genre.filter)}>
                      <strong>{genre.name}</strong>
                      <span>{count} sample {count === 1 ? 'track' : 'tracks'}</span>
                    </button>
                  );
                 
                })};
              </div>
            </section>

            <section className="featured-playlists">
              <div className="section-heading compact-heading">
                <div>
                  <span className="eyebrow">CURATED FOR YOU</span>
                  <h2><Sparkles size={22} /> Featured playlists</h2>
                </div>
              </div>

              <div className="playlist-grid">
                {featuredPlaylists.map((playlist) => {
                  const count = catalogTracks.filter((track) => track.genre.toLowerCase().includes(playlist.genre.toLowerCase())).length;
                  return (
                    <article key={playlist.id} className={`playlist-card ${playlist.accent}`}>
                      <div className="playlist-art" style={{ backgroundImage: `url(${playlist.cover})` }}>
                        <span className="playlist-tag">{count} sample {count === 1 ? 'track' : 'tracks'}</span>
                        <button className="playlist-play" onClick={() => openPlaylist(playlist, true)} aria-label={`Play ${playlist.name}`}>
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>
                      <div className="playlist-body">
                        <strong>{playlist.name}</strong>
                        <small>{playlist.subtitle}</small>
                        <button className="button secondary playlist-button" onClick={() => openPlaylist(playlist)}>Explore mix</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="trending-section" id="catalog">
              <div className="now-trending-ticker" aria-label="Now trending community sample previews">
                <span>♪ NOW TRENDING · JUBA CITY LIGHTS · WHITE NILE GROOVE · PEACE IN SOUTH SUDAN · SAMPLE PREVIEWS</span>
              </div>

              <div className="section-heading">
                <div>
                  <span className="eyebrow">THE JUNUBIFY CATALOG</span>
                  <h2><TrendingUp size={22} /> Trending tracks in Juba</h2>
                </div>
                <span className="muted">
                  {genreFilter && <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear genre · </button>}
                  {visibleTracks.length} tracks
                </span>
              </div>

              <div className="hot-badge"><span aria-hidden="true">✦</span> HOT RIGHT NOW</div>

              {!tracks.length && <p className="catalog-status">Sample previews · connect Supabase for the live catalog</p>}
              {loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}
              {catalogError && (
                <div className="notice-box">
                  <b>Catalog unavailable</b>
                  <p>{catalogError}</p>
                  <button className="button secondary" onClick={refreshCatalog}>Try again</button>
                </div>
              )}

              <section className="track-list">
                {visibleTracks.map((track, index) => (
                  <article className="track-row" key={track.id}>
                    <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
                    <button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>
                      <img src={track.cover || fallbackCover} alt="" />
                    </button>
                    <div className="track-meta">
                      <strong>{track.title}</strong>
                      <span>{track.artist} · {track.genre}</span>
                    </div>
                    <div className="track-stats">
                      <span><Heart size={14} /> {Number(track.plays || 0).toLocaleString()}</span>
                      <button className="mini-play" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>
                        {playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? `Unlike ${track.title}` : `Like ${track.title}`}>
                        <Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'} />
                      </button>
                      <button className="track-action" onClick={() => shareTrack(track)} aria-label={`Share ${track.title}`}>
                        <Upload size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              {!visibleTracks.length && (
                <div className="panel empty-catalog">
                  <Music2 size={26} />
                  <b>No tracks match this filter.</b>
                  <span>Choose another genre or clear your search.</span>
                </div>
              )}
            </section>

            <section className="upload-promo">
              <div>
                <span className="eyebrow">ARE YOU AN ARTIST?</span>
                <h2>Bring your sound to Junubify.</h2>
                <p>Submit your music securely for review in Artist Studio.</p>
              </div>
              <button className="button primary" onClick={() => setTab('studio')}><Upload size={16} /> Open studio</button>
            </section>
          </>
        )}

        {tab 'studio' && (
          <>
            <section className="section-heading">
              <div>
                <span className="eyebrow">ARTIST PORTAL</span>
                <h1>Artist studio</h1>
                <p className="muted">Submit a track for review. Audio files are stored in a secure Supabase bucket with review status tracking.</p>
              </div>
            </section>

            <section className="panel studio-panel">
              {!session?.user ? (
                <form className="auth-card" onSubmit={requestSignIn}>
                  <h2>Receive a secure sign-in link</h2>
                  <label>
                    Work email
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="artist@junubify.com" required />
                  </label>
                  <button className="button primary" type="submit">Send magic link</button>
                </form>
              ) : (
                <>
                  <div className="signed-in-bar">
                    <div>
                      <strong>{session.user.email}</strong>
                      <span>Signed in as artist</span>
                    </div>
                    <button className="button secondary" onClick={signOut}>Sign out</button>
                  </div>

                  <form className="submit-form" onSubmit={publishTrack}>
                    <label>
                      Song title
                      <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Juba Morning" required />
                    </label>
                    <label>
                      Artist name
                      <input value={form.artist} onChange={(event) => setForm({ ...form, artist: event.target.value })} placeholder="Your stage name" required />
                    </label>
                    <label>
                      Genre
                      <select value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })}>
                        {genres.map((genre) => <option key={genre.filter} value={genre.filter}>{genre.name}</option>)}
                      </select>
                    </label>
                    <label>
                      Album or single
                      <input value={form.album} onChange={(event) => setForm({ ...form, album: event.target.value })} placeholder="Single" />
                    </label>
                    <label>
                      Cover image URL
                      <input value={form.cover} onChange={(event) => setForm({ ...form, cover: event.target.value })} placeholder="https://..." />
                    </label>

                    <div className="upload-box">
                      <label className="file-picker">
                        <input type="file" accept="audio/*" onChange={(event) => handleFile(event.target.files?.[0])} />
                        <span>{selectedFile ? selectedFile.name : 'Choose audio file'}</span>
                      </label>
                    </div>

                    <label className="checkbox-row">
                      <input type="checkbox" checked={rightsConfirmed} onChange={() => setRightsConfirmed((value) => !value)} />
                      I confirm that I own or control the rights to this audio and have permission to upload it.
                    </label>

                    <button className="button primary" type="submit" disabled={submitting}>
                      {submitting ? 'Submitting…' : 'Submit track for review'}
                    </button>
                  </form>
                </>
              )}
            </section>
          </>
        )}

        {tab === 'monetize' && (
          <>
            <section className="section-heading">
              <div>
                <span className="eyebrow">CREATOR ECONOMY</span>
                <h1>Monetization</h1>
                <p className="muted">Developing a secure creator payout system with payment provider integration and protected revenue flows.</p>
              </div>
            </section>

            <section className="panel monetization-panel">
              <div className="money-box">
                <Wallet size={22} />
                <div>
                  <strong>Payments are not live yet</strong>
                  <p>{paymentSetupMessage}</p>
                </div>
              </div>
              <div className="money-grid">
                <div className="mini-card">
                  <span>Royalties</span>
                  <strong>Coming soon</strong>
                </div>
                <div className="mini-card">
                  <span>Subscriptions</span>
                  <strong>Secure checkout</strong>
                </div>
                <div className="mini-card">
                  <span>Disbursements</span>
                  <strong>Provider-backed</strong>
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'download' && (
          <section className="app-download panel">
            <div className="download-icon"><Smartphone size={42} /></div>
            <span className="eyebrow">LISTEN WHEREVER YOU ARE</span>
            <h1>Get Junubify for Android & iOS</h1>
            <p>Use the installable web app to keep Junubify close. Native store downloads will be linked once the apps are published.</p>
            <div className="store-buttons">
              <div className="store-placeholder">
                <Download size={22} />
                <span><small>ANDROID APP</small><b>Coming soon</b></span>
              </div>
              <div className="store-placeholder">
                <Download size={22} />
                <span><small>APPLE APP</small><b>Coming soon</b></span>
              </div>
            </div>
            <div className="qr-placeholder" aria-label="Decorative QR-style pattern" role="img">
              {Array.from({ length: 64 }, (_, index) => <i key={index} className={(index * 7 + index % 3) % 4 === 0 ? 'qr-lit' : ''} />)}
            </div>
            <p className="muted">To install the current web app, use your browser menu and choose “Add to Home screen”.</p>
          </section>
        )}
      </main>

      <footer className="player">
        <div className="player-track">
          {playing ? (
            <>
              <img src={playing.cover || fallbackCover} alt="" />
              <div>
                <b>{playing.title}</b>
                <span>{playing.artist}</span>
              </div>
            </>
          ) : (
            <>
              <span className="player-note"><Music2 size={16} /></span>
              <div>
                <b>Nothing playing</b>
                <span>Pick a track to listen</span>
              </div>
            </>
          )}
        </div>

        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onEnded={() => {
            setPlaying(null);
            setAudioUrl('');
          }}
        />

        <button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label="Toggle playback">
          {playing && audioRef.current && !audioRef.current.paused ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </footer>


        {tab === 'discover' && (selectedPlaylist ? <PlaylistDetail playlist={selectedPlaylist} tracks={selectedPlaylistTracks} playing={playing} isPlaying={Boolean(audioRef.current && !audioRef.current.paused)} onBack={() => setSelectedPlaylist(null)} onPlayTrack={(track) => playTrack(track, selectedPlaylistTracks)} emptyMessage="No songs in this playlist match your search."/> : selectedGenre ? <PlaylistDetail playlist={selectedGenre} tracks={selectedGenreTracks} playing={playing} isPlaying={Boolean(audioRef.current && !audioRef.current.paused)} onBack={() => setSelectedGenre(null)} onPlayTrack={(track) => playTrack(track, selectedGenreTracks)} emptyMessage="No songs in this genre match your search." kind="genre"/> : <>
          <section className="home-intro panel" aria-labelledby="home-intro-title">
            <div className="home-intro-content">
              <span className="home-intro-kicker"><AudioLines size={17}/> MUSIC FROM HOME</span>
              <h1 id="home-intro-title">South Sudan&apos;s sound,<br/><span>all in one place.</span></h1>
              <p>Discover emerging voices and hometown favorites from Juba and beyond.</p>
              <button className="home-intro-play" onClick={() => playAllTracks(catalogTracks)}><Play size={21} fill="currentColor"/> Play a track</button>
            </div>
          </section>

          <section className="hero trend-hero"><div className="hero-copy"><span className="eyebrow"><AudioLines size={14}/> FEATURED RELEASE</span><h1>O.G. by Chief Butee</h1><p>Listen to the featured release and discover the latest from South Sudan.</p><div className="hero-actions"><button className="button primary" onClick={() => playAllTracks(catalogTracks)}><Play size={16} fill="currentColor"/> Play now</button><button className="button secondary" onClick={() => openPlaylist(featuredPlaylists[0])}><Music2 size={16}/> View release</button></div></div></section>

          <section className="featured-artist panel"><img src={ogCoverUrl} alt="Junubify cover artwork"/><div className="featured-artist-copy"><span className="eyebrow"><BadgeCheck size={14}/> FEATURED ARTIST</span><h2>Chief Butee</h2><p>Fresh South Sudanese music, now featured on Junubify.</p><button className="button secondary" onClick={() => openPlaylist(featuredPlaylists[0])}>Explore artist</button></div><Sparkles className="artist-sparkle" size={18}/></section>

          <section className="genre-section"><div className="section-heading"><div><span className="eyebrow">EXPLORE</span><h2><Compass size={22}/> Explore Juba Genres</h2></div></div><div className="genre-grid">{genres.map((genre) => { const genreTracks = catalogTracks.filter((track) => track.genre.toLowerCase().includes(genre.filter.toLowerCase())); const expanded = expandedGenre === genre.name; return <article className={`genre-card ${genre.color} ${expanded ? 'expanded' : ''}`} key={genre.name}><button className="genre-toggle" onClick={() => setExpandedGenre(expanded ? null : genre.name)}><strong>{genre.name}</strong><span>{genre.subtitle}</span></button>{expanded && <><div className="genre-song-list">{genreTracks.length ? genreTracks.slice(0, 3).map((track) => <button className="genre-song" key={track.id} onClick={() => playTrack(track, genreTracks)}><span className="genre-song-copy"><strong>{track.title}</strong><small>{track.artist}</small></span><Play size={13} fill="currentColor"/></button>) : <p className="genre-empty">No tracks yet</p>}</div><button className="genre-explore" onClick={() => openGenre(genre)}>Explore genre <ArrowRight size={14}/></button></>}</article>; })}</div></section>

          <section className="featured-playlists"><div className="section-heading compact-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2><Sparkles size={22}/> Featured releases</h2></div></div><div className="playlist-grid">{featuredPlaylists.map((playlist) => <article className="playlist-card" key={playlist.id}><div className="playlist-art" style={{ backgroundImage: `url(${playlist.cover})` }}><span className="playlist-tag">{playlist.accent}</span><button className="playlist-play" onClick={() => openPlaylist(playlist, true)} aria-label={`Play ${playlist.name}`}><Play size={17} fill="currentColor"/></button></div><div className="playlist-body"><strong>{playlist.name}</strong><small>{playlist.subtitle}</small><button className="button secondary playlist-button" onClick={() => openPlaylist(playlist)}>View release</button></div></article>)}</div></section>

          <section className="trending-section" id="catalog"><div className="now-trending-ticker" aria-label="Featured track: O.G. by Chief Butee"><span>♪ NOW TRENDING · O.G. · CHIEF BUTEE</span></div><div className="section-heading"><div><span className="eyebrow">DISCOVER</span><h2>Now trending</h2></div>{genreFilter && <button className="clear-filter" onClick={() => setGenreFilter('')}>Clear filter</button>}</div>{loadingCatalog && <p className="catalog-status muted">Loading catalog…</p>}{catalogError && <p className="catalog-status muted">{catalogError}</p>}<section className="track-list">{visibleTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track, visibleTracks)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt=""/></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div><div className="track-stats"><span>{track.plays || 0} plays</span><button className="mini-play" onClick={() => playTrack(track, visibleTracks)} aria-label={`Play ${track.title}`}>{playing?.id === track.id && audioRef.current && !audioRef.current.paused ? <Pause size={15}/> : <Play size={15} fill="currentColor"/>}</button><button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label="Like track"><Heart size={16} fill={likedTracks[track.id] ? 'currentColor' : 'none'}/></button><button className="track-action" onClick={() => shareTrack(track)} aria-label="Share track"><Share2 size={15}/></button></div></article>)}</section></section>

          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Submit your music securely for review in Artist Studio.</p></div><button className="button primary" onClick={() => setTab('studio')}><Upload size={16}/> Submit a track</button></section>
        </>)}
      </main>

      <footer className="player">
        <button className="player-track" onClick={() => playing && setMobilePlayerOpen(true)} aria-label="Open now playing">{playing ? <><img src={playing.cover || fallbackCover} alt=""/><div><b>{playing.title}</b><span>{playing.artist}</span></div></> : <><span className="player-note"><Music2 size={16}/></span><div><b>Nothing playing</b><span>Choose a track</span></div></>}</button>
        <audio ref={audioRef} src={audioUrl || undefined} onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setPlaybackTime(event.currentTarget.currentTime)} onEnded={advancePlayback}/>
        {playing && <div className="player-progress"><button className={shuffle ? 'player-control active' : 'player-control'} onClick={() => setShuffle((current) => !current)} aria-label="Toggle shuffle"><Radio size={14}/></button><button className="player-control" onClick={previousPlayback} aria-label="Previous track"><SkipBack size={16}/></button><span>{formatPlaybackTime(playbackTime)}</span><input className="seek-control" type="range" min="0" max={playerDuration || 1} value={Math.min(playbackTime, playerDuration || 1)} onChange={(event) => { const nextTime = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = nextTime; }}/><span>{formatPlaybackTime(playerDuration)}</span><button className="player-control" onClick={advancePlayback} aria-label="Next track"><SkipForward size={16}/></button><button className={repeat ? 'player-control active' : 'player-control'} onClick={() => setRepeat((current) => !current)} aria-label="Toggle repeat"><Sparkles size={14}/></button></div>}
        <div className="player-right-controls"><button className="player-control" onClick={() => setMuted((current) => !current)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}</button><input className="volume-control" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} aria-label="Volume"/><button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label="Toggle playback">{playing && audioRef.current && !audioRef.current.paused ? <Pause size={16}/> : <Play size={16} fill="currentColor"/>}</button></div>
      </footer>

      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
};
