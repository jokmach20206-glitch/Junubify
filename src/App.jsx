
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  AudioLines, ArrowLeft, BadgeCheck, ChevronDown, CircleDollarSign, Compass, Download,
  Eye, Headphones, Heart, ListMusic, Music2, Pause, Play, Radio, Settings,
  Search, Share2, ShieldCheck, Shuffle, SkipBack, SkipForward, Smartphone, Sparkles,
  Sun, Timer, TrendingUp, Upload, UserRound, Volume2, Wallet,
} from 'lucide-react';
import { OfflineDownloadButton } from './enhancements.jsx';
import ogCoverUrl from '../1794694060126.jpg';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import {
  createTrackAudioUrl,
  fetchArtistTracks,
  fetchPublishedTracks,
  submitTrack,
} from './lib/catalog.js';

const ogAudioUrl = new URL('../CHIEF BUTEE - OG.mp3', import.meta.url).href;
const yungAudioUrl = new URL('../Yung_Bwoy__They_Don’t_want__official_audio___ft_Dogg_Hustle(256k).mp3', import.meta.url).href;
const fallbackCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=500';
const emptyForm = { title: '', artist: '', genre: 'Afrobeat', album: '', cover: '', requiresSubscription: false };
const initialTrack = {
  id: 'chief-butee-og', title: 'O.G.', artist: 'Chief Butee', genre: 'Afrobeat',
  album: 'Single', plays: 0, cover: ogCoverUrl, audioUrl: ogAudioUrl,
};
const yungTrack = {
  id: 'yung-bwoy-they-dont-want', title: 'They Don’t Want', artist: 'Yung Bwoy', genre: 'Hip-Hop',
  album: 'Single', plays: 0, cover: ogCoverUrl, audioUrl: yungAudioUrl,
};
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const genres = [
  { name: 'Juba Afrobeat', filter: 'Afrobeat', subtitle: 'Modern rhythms from Juba and beyond', color: 'genre-green', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800' },
  { name: 'Traditional & Cultural', filter: 'Traditional', subtitle: 'Heritage sounds and cultural rhythms', color: 'genre-orange', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800' },
  { name: 'South Sudan Hip-Hop', filter: 'Hip-Hop', subtitle: 'Stories and bars from across South Sudan', color: 'genre-purple', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800' },
  { name: 'Reggae & Dancehall', filter: 'Dancehall', subtitle: 'Island rhythms with a South Sudan sound', color: 'genre-red', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800' },
  { name: 'Gospel & Choir', filter: 'Gospel', subtitle: 'Choirs and voices from home', color: 'genre-blue', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800' },
  { name: 'Oldies & Classics', filter: 'Oldies', subtitle: 'Timeless favorites and legacy sounds', color: 'genre-gold', cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800' },
];
const fallbackTracks = [initialTrack, yungTrack];
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

function readStoredValue(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.onload = () => { image.src = String(reader.result || ''); };
    image.onerror = () => reject(new Error('Choose a valid image file.'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Could not process that photo.'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    reader.readAsDataURL(file);
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function getTrackCoverFallback(track) {
  if (typeof track?.cover === 'string' && track.cover.trim()) return track.cover;
  if (typeof track?.coverUrl === 'string' && track.coverUrl.trim()) return track.coverUrl;
  return fallbackCover;

}

function handleCoverError(event) {
  if (event.currentTarget.src !== new URL(fallbackCover, window.location.href).href) {
    event.currentTarget.src = fallbackCover;
  }
}

function trackText(track) {
  return [track?.title, track?.artist, track?.genre, track?.album]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
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
  const [volume, setVolume] = useState(0.8);
  const [playQueue, setPlayQueue] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likedTracks, setLikedTracks] = useState(() => readStoredObject('junubify-liked-tracks'));
  const [likedTrackSnapshots, setLikedTrackSnapshots] = useState(() => readStoredObject('junubify-liked-track-snapshots'));
  const [followedArtists, setFollowedArtists] = useState(() => readStoredObject('junubify-followed-artists'));
  const [profileName, setProfileName] = useState(() => readStoredValue('junubify-profile-name', ''));
  const [profilePhoto, setProfilePhoto] = useState(() => readStoredValue('junubify-profile-photo', ''));
  const [theme, setTheme] = useState(() => {
    const storedTheme = readStoredValue('junubify-theme', 'system');
    return ['dark', 'light', 'system'].includes(storedTheme) ? storedTheme : 'system';
  });
  const [highContrast, setHighContrast] = useState(() => readStoredValue('junubify-high-contrast', 'false') === 'true');
  const [reduceMotion, setReduceMotion] = useState(() => readStoredValue('junubify-reduce-motion', 'false') === 'true');
  const [compactLayout, setCompactLayout] = useState(() => readStoredValue('junubify-compact-layout', 'false') === 'true');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => readStoredValue('junubify-analytics-enabled', 'true') !== 'false');
  const [libraryGenre, setLibraryGenre] = useState('');
  const [showLyrics, setShowLyrics] = useState(true);
  const [sleepTimer, setSleepTimer] = useState(false);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [notice, setNotice] = useState('');
  const audioRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const openedSharedTrackRef = useRef('');

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setNotice(''), 4500);
  };

  const updatePreference = (key, value, updateState) => {
    try {
      window.localStorage.setItem(key, String(value));
      updateState(value);
      return true;
    } catch {
      notify('Could not save this preference. Check your browser storage settings.');
      return false;
    }
  };

  const saveProfile = (event) => {
    event.preventDefault();
    const name = profileName.trim();
    if (!name) return notify('Enter a display name for your profile.');
    if (updatePreference('junubify-profile-name', name, setProfileName)) {
      notify('Your profile was saved on this device.');
    }
  };

  const saveProfilePhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_PROFILE_PHOTO_BYTES) {
      notify('Choose an image smaller than 5 MB.');
      return;
    }
    try {
      const photo = await compressProfilePhoto(file);
      if (updatePreference('junubify-profile-photo', photo, setProfilePhoto)) {
        notify('Profile photo saved on this device.');
      }
    } catch (error) {
      notify(error.message || 'Could not save this profile photo.');
    }
  };

  const removeProfilePhoto = () => {
    try {
      window.localStorage.removeItem('junubify-profile-photo');
      setProfilePhoto('');
      notify('Profile photo removed.');
    } catch {
      notify('Could not remove the profile photo. Check your browser storage settings.');
    }
  };

  const clearLocalListeningData = () => {
    try {
      window.localStorage.removeItem('junubify-liked-tracks');
      window.localStorage.removeItem('junubify-liked-track-snapshots');
      window.localStorage.removeItem('junubify-followed-artists');
      setLikedTracks({});
      setLikedTrackSnapshots({});
      setFollowedArtists({});
      setLibraryGenre('');
      notify('Your saved likes and follows were cleared from this device.');
    } catch {
      notify('Could not clear local listening data. Check your browser storage settings.');
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.contrast = highContrast ? 'high' : 'normal';
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
    document.documentElement.dataset.compact = String(compactLayout);
  }, [theme, highContrast, reduceMotion, compactLayout]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    let appUrlListener;
    const handleAuthUrl = async (rawUrl) => {
      let callbackUrl;
      try {
        callbackUrl = new URL(rawUrl);
      } catch {
        return;
      }
      if (callbackUrl.protocol !== 'junubify:' || callbackUrl.hostname !== 'auth' || callbackUrl.pathname !== '/callback') return;

      const authError = callbackUrl.searchParams.get('error_description');
      if (authError) return notify(authError);

      const authCode = callbackUrl.searchParams.get('code');
      if (!authCode) return notify('The sign-in link did not include a valid authorization code. Request a new link.');

      const { error } = await supabase.auth.exchangeCodeForSession(authCode);
      if (error) notify(error.message);
    };

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', ({ url }) => { void handleAuthUrl(url); })
        .then((listener) => {
          if (active) appUrlListener = listener;
          else void listener.remove();
        })
        .catch((error) => notify(error?.message || 'Could not initialize secure sign-in links.'));
      CapacitorApp.getLaunchUrl()
        .then((launch) => { if (launch?.url) void handleAuthUrl(launch.url); })
        .catch((error) => notify(error?.message || 'Could not read the app launch link.'));
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) notify(error.message);
      setSession(data?.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => {
      active = false;
      appUrlListener?.remove();
      subscription.unsubscribe();
    };
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

  useEffect(() => {
    const syncGenreFromUrl = () => {
      const genreParam = new URLSearchParams(window.location.search).get('genre');
      const match = genres.find((genre) => genre.filter.toLowerCase() === genreParam?.toLowerCase());
      setGenreFilter(match?.filter || '');
    };
    syncGenreFromUrl();
    window.addEventListener('popstate', syncGenreFromUrl);
    return () => window.removeEventListener('popstate', syncGenreFromUrl);
  }, []);

  const catalogTracks = useMemo(() => (tracks.length ? [...fallbackTracks, ...tracks] : fallbackTracks), [tracks]);
  const selectedGenre = genres.find((genre) => genre.filter === genreFilter);
  const accountDisplayName = profileName.trim()
    || (typeof session?.user?.user_metadata?.full_name === 'string' ? session.user.user_metadata.full_name.trim() : '')
    || 'Listener';
  const selectedGenreTracks = selectedGenre
    ? catalogTracks.filter((track) => String(track.genre || '').toLowerCase().includes(selectedGenre.filter.toLowerCase()))
    : [];
  const visibleTracks = useMemo(() => catalogTracks.filter((track) => {
    const genre = typeof track?.genre === 'string' ? track.genre : '';
    return trackText(track).includes(query.trim().toLowerCase())
      && (!genreFilter || genre.toLowerCase().includes(genreFilter.toLowerCase()));
  }).sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0)), [catalogTracks, query, genreFilter]);
  const likedCatalog = [...new Map([...catalogTracks, ...Object.values(likedTrackSnapshots)]
    .filter((track) => track && typeof track.id === 'string' && Boolean(likedTracks[track.id]))
    .map((track) => [`${track.title}\u0000${track.artist}`, track])).values()];
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
      const audioPath = track.requiresSubscription ? track.previewAudioPath : track.audioPath;
      if (track.requiresSubscription && !audioPath) {
        return notify('A preview is not available for this subscription-only release yet.');
      }
      const url = audioPath ? await createTrackAudioUrl(audioPath) : track.audioUrl;
      if (!url) return notify('Audio is not available for this track.');
      if (recordHistory && playing && playing.id !== track.id) setPlayHistory((history) => [playing, ...history].slice(0, 20));
      setPlayQueue(queue);
      setPlaybackTime(0);
      setDuration(0);
      setAudioUrl(url);
      setPlaying(track);
      setIsPlaying(true);
      if (track.requiresSubscription) notify('Preview only · subscription checkout is not available yet.');
    } catch (error) {
      notify(error?.message || 'Could not create a secure audio playback link.');
    }
  };

  useEffect(() => {
    const sharedTrackId = new URLSearchParams(window.location.search).get('track');
    if (!sharedTrackId || openedSharedTrackRef.current === sharedTrackId) return;
    const track = [...catalogTracks, initialTrack, yungTrack].find((item) => item.id === sharedTrackId);
    if (!track) return;
    openedSharedTrackRef.current = sharedTrackId;
    setTab('discover');
    setGenreFilter('');
    setPlayerOpen(true);
    playTrack(track);
  }, [catalogTracks]);

  useEffect(() => {
    if (!audioUrl || !playing || !audioRef.current) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false);
      notify('Tap play to start the audio.');
    });
  }, [audioUrl, playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

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
    const nextLikedTracks = { ...likedTracks };
    const nextSnapshots = { ...likedTrackSnapshots };
    if (nextLikedTracks[trackId]) {
      delete nextLikedTracks[trackId];
      delete nextSnapshots[trackId];
    } else {
      nextLikedTracks[trackId] = true;
      const track = catalogTracks.find((item) => item.id === trackId)
        || (playing?.id === trackId ? playing : null);
      if (track) nextSnapshots[trackId] = track;
    }
    try {
      localStorage.setItem('junubify-liked-tracks', JSON.stringify(nextLikedTracks));
      localStorage.setItem('junubify-liked-track-snapshots', JSON.stringify(nextSnapshots));
    } catch {
      notify('This like is saved for this session, but browser storage is unavailable.');
    }
    setLikedTracks(nextLikedTracks);
    setLikedTrackSnapshots(nextSnapshots);
  };

  const toggleFollow = (artist) => setFollowedArtists((current) => {
    const next = { ...current, [artist]: !current[artist] };
    try { localStorage.setItem('junubify-followed-artists', JSON.stringify(next)); } catch {}
    return next;
  });

  const shareTrack = async (track) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('genre');
    url.searchParams.set('track', track.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${track.title} · Junubify`,
          text: `Listen to ${track.title} by ${track.artist} on Junubify`,
          url: url.href,
        });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      if (await copyShareLink(url.href)) notify('Track link copied.');
      else notify(`Copy this track link to share: ${url.href}`);
    } catch {
      notify(`Copy this track link to share: ${url.href}`);
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
    if (!audioRef.current || !Number.isFinite(value)) return;
    const previewLimit = playing?.requiresSubscription ? 20 : Number.POSITIVE_INFINITY;
    audioRef.current.currentTime = Math.min(value, previewLimit);
  };

  const handlePlaybackTimeUpdate = (event) => {
    if (playing?.requiresSubscription && event.currentTarget.currentTime >= 20) {
      event.currentTarget.pause();
      event.currentTarget.currentTime = 20;
      setPlaybackTime(20);
      notify('Preview ended · subscribe to hear the full release.');
      return;
    }
    setPlaybackTime(event.currentTarget.currentTime);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) return notify('Choose an MP3, WAV, M4A, OGG, AAC, or FLAC audio file.');
    if (file.size > 50 * 1024 * 1024) return notify('Audio file must be 50 MB or smaller.');
    setSelectedFile(file);
  };

  const handlePreviewFile = (file) => {
    if (!file) return;
    if (!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name) && !file.type.startsWith('audio/')) return notify('Choose an MP3, WAV, M4A, OGG, AAC, or FLAC audio file.');
    if (file.size > 50 * 1024 * 1024) return notify('Preview audio must be 50 MB or smaller.');
    setPreviewFile(file);
  };

  const requestSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) return notify('Supabase is not configured.');
    const emailRedirectTo = Capacitor.isNativePlatform() ? 'junubify://auth/callback' : window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo } });
    notify(error?.message || 'Check your email for a secure sign-in link.');
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const publishTrack = async (event) => {
    event.preventDefault();
    if (!session?.user) return notify('Sign in to submit a track.');
    if (!selectedFile) return notify('Choose an audio file before submitting.');
    if (form.requiresSubscription && !previewFile) return notify('Add a preview clip for a subscription-only release.');
    if (!rightsConfirmed) return notify('Confirm that you own or control the rights to this audio.');
    if (!form.title.trim() || !form.artist.trim()) return notify('Add a song title and artist name.');
    setSubmitting(true);
    try {
      const submission = await submitTrack({ file: selectedFile, previewFile, form, artistId: session.user.id });
      setArtistTracks((current) => [submission, ...current]);
      setForm(emptyForm);
      setSelectedFile(null);
      setPreviewFile(null);
      setRightsConfirmed(false);
      notify(submission.status === 'published'
        ? 'Track uploaded and published automatically for your verified artist account.'
        : 'Track uploaded securely and queued for moderator review.');
    } catch (error) {
      notify(error?.message || 'Track upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectGenre = (genre) => {
    setTab('discover');
    setGenreFilter(genre.filter);
    const url = new URL(window.location.href);
    url.searchParams.set('genre', genre.filter);
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const submitGlobalSearch = () => {
    setGenreFilter('');
    setTab('discover');
    const url = new URL(window.location.href);
    url.searchParams.delete('genre');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    window.setTimeout(() => document.getElementById('catalog')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    }), 50);
  };

  const openPlaylist = (playlist, autoplay = false) => {
    const matches = catalogTracks.filter((track) => String(track.genre || '').toLowerCase().includes(playlist.genre.toLowerCase()));
    setTab('discover');
    setGenreFilter(playlist.genre);
    if (autoplay && matches.length) playTrack(matches[0], matches.slice(1));
  };

  return (
    <div className={`app-shell ${playerOpen ? 'player-is-open' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => { setTab('discover'); setGenreFilter(''); }} aria-label="Junubify home">
          <span className="brand-icon"><Radio size={21} /></span>
          <span><b>JUNUBIFY</b><small>SOUTH SUDAN BEATS</small></span>
        </button>
        <form className="search-control" role="search" onSubmit={(event) => {
          event.preventDefault();
          submitGlobalSearch();
        }}>
          <input className="search" type="search" value={query} onChange={(event) => {
            setQuery(event.target.value);
            setGenreFilter('');
            const url = new URL(window.location.href);
            url.searchParams.delete('genre');
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          }} placeholder="Search songs, artists, albums" aria-label="Search all songs, artists, and albums" />
          <button className="junubify-search-submit" type="submit" aria-label="Search all songs">
            <Search size={16} /><span>Search</span>
          </button>
        </form>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Headphones size={17} /> Discover</button>
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><Heart size={17} /> Library</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}><Upload size={17} /> Artist studio</button>
          <button className={tab === 'monetize' ? 'active' : ''} onClick={() => setTab('monetize')}><CircleDollarSign size={17} /> Monetization</button>
          <button className={tab === 'download' ? 'active' : ''} onClick={() => setTab('download')}><Smartphone size={17} /> Get the app</button>
        </nav>
        <button className={`account-menu-button ${tab === 'account' ? 'active' : ''}`} type="button" onClick={() => setTab('account')} aria-label="Open account and preferences">
          <span className={`account-menu-avatar ${profilePhoto ? 'has-profile-photo' : ''}`} style={profilePhoto ? { backgroundImage: `url("${profilePhoto}")` } : undefined} aria-hidden="true">{accountDisplayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
          <span className="account-menu-label">Account</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </header>

      <main className="content">
        {tab === 'studio' && session?.user && <section className="panel subscription-release-settings">
          <div><span className="eyebrow">OPTIONAL RELEASE ACCESS</span><h2>Subscriber preview</h2></div>
          <p>Upload a separate preview clip for subscriber-only releases. Until checkout is available, listeners can hear the preview but the full audio stays locked.</p>
          <label className="checkbox-row"><input type="checkbox" checked={form.requiresSubscription} onChange={(event) => {
            const requiresSubscription = event.target.checked;
            setForm((current) => ({ ...current, requiresSubscription }));
            if (!requiresSubscription) setPreviewFile(null);
          }} />This release requires a subscription</label>
          {form.requiresSubscription && <label className="file-picker"><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" onChange={(event) => {
            handlePreviewFile(event.target.files?.[0]);
            event.target.value = '';
          }} /><span>{previewFile ? previewFile.name : 'Choose a preview audio clip · up to 50 MB'}</span></label>}
        </section>}
        {tab === 'discover' && (selectedGenre ? <section className="genre-detail-page">
          <div className={`genre-detail-hero ${selectedGenre.color}`} style={{ backgroundImage: `linear-gradient(100deg, rgba(7,17,15,.9), rgba(7,17,15,.45)), url(${selectedGenre.cover})` }}>
            <button type="button" className="genre-detail-back" onClick={() => {
              setGenreFilter('');
              const url = new URL(window.location.href);
              url.searchParams.delete('genre');
              window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
            }}><ArrowLeft size={17} /> Back to genres</button>
            <span className="eyebrow">EXPLORE JUBA GENRES</span>
            <h1>{selectedGenre.name}</h1>
            <p>{selectedGenre.subtitle}</p>
            <span className="genre-detail-count">{selectedGenreTracks.length} tracks to explore</span>
          </div>
          <section className="genre-detail-content">
            <div className="section-heading"><div><span className="eyebrow">LISTEN NOW</span><h2>{selectedGenre.filter} music</h2></div>
              <button className="button primary" disabled={!selectedGenreTracks.length} onClick={() => playAll(selectedGenreTracks)}><Play size={16} fill="currentColor" /> Play all</button>
            </div>
            {selectedGenreTracks.length ? <section className="track-list">{selectedGenreTracks.map((track, index) => <article className="track-row" key={track.id}>
              <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
              <button className="track-art" onClick={() => playTrack(track, selectedGenreTracks.slice(index + 1))} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt="" /></button>
              <div className="track-meta"><strong>{track.title || 'Untitled track'}</strong><span>{track.artist || 'Junubify artist'} · {selectedGenre.filter}</span>{track.requiresSubscription && <small className="track-access-note">PREVIEW · SUBSCRIPTION REQUIRED</small>}</div>
              <div className="track-stats">
                <button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? 'Unlike track' : 'Like track'} aria-pressed={Boolean(likedTracks[track.id])}><Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'} /></button>
                <button className="mini-play" onClick={() => playTrack(track, selectedGenreTracks.slice(index + 1))} aria-label={`Play ${track.title}`}><Play size={15} fill="currentColor" /></button>
                <button className="track-action" onClick={() => shareTrack(track)} aria-label="Share track"><Share2 size={16} /></button>
                <OfflineDownloadButton track={track} />
              </div>
            </article>)}</section> : <div className="empty-catalog"><Music2 size={26} /><b>No tracks in this genre yet.</b><span>Check back as new releases are published.</span></div>}
          </section>
        </section> : <>
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
            {genres.map((genre) => <button type="button" key={genre.filter} className={`genre-card ${genre.color} ${genreFilter === genre.filter ? 'selected' : ''}`} onClick={() => selectGenre(genre)} style={{ backgroundImage: `linear-gradient(160deg, rgba(7, 17, 15, .46), rgba(7, 17, 15, .88)), ${genre.color === 'genre-orange' ? 'linear-gradient(135deg, rgba(201, 151, 66, .32), rgba(28, 54, 35, .22)), ' : ''}url(${genre.cover})` }}><strong>{genre.name}</strong><span>{genre.subtitle}</span>            <span className="genre-card-track-preview"><b>YOUR NEXT FAVORITE SOUND</b><span>Fresh voices. Deep roots. Pure Juba energy.</span></span></button>)}
          </div></section>

          <section className="featured-playlists"><div className="section-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2><Sparkles size={22} /> Featured releases</h2></div></div><div className="playlist-grid">
            {playlists.map((playlist) => <article className="playlist-card" key={playlist.id}><div className="playlist-art" style={{ backgroundImage: `linear-gradient(transparent, rgba(5, 10, 15, .76)), url(${playlist.cover})` }}><span className="playlist-tag">Featured release</span><button className="playlist-play" onClick={() => openPlaylist(playlist, true)} aria-label={`Play ${playlist.name}`}><Play size={18} fill="currentColor" /></button></div><div className="playlist-body"><strong>{playlist.name}</strong><small>{playlist.subtitle}</small><button className="button secondary playlist-button" onClick={() => openPlaylist(playlist)}>Explore release</button></div></article>)}
          </div></section>

          <section className="trending-section" id="catalog">
            <button type="button" className="now-trending-ticker" onClick={() => playTrack(initialTrack)} aria-label="Play O.G. by Chief Butee">
              <span className="trending-ticker-icon" aria-hidden="true"><Music2 size={21} /></span>
              <span className="trending-ticker-copy"><small>JUBA FEATURE</small><strong>Now trending</strong><span>O.G. · Chief Butee · South Sudan sounds</span></span>
              <span className="trending-ticker-play" aria-hidden="true"><Play size={17} fill="currentColor" /></span>
            </button>
            <div className="section-heading trending-heading">
              <div>
                <span className="eyebrow"><AudioLines size={14} /> JUBA&apos;S SOUNDTRACK</span>
                <h2><Music2 size={22} /> {query.trim() ? `Search results for “${query.trim()}”` : genreFilter ? `${genreFilter} tracks` : 'Trending tracks in Juba'}</h2>
              </div>
              <div className="trending-heading-meta">
                {genreFilter && <button className="clear-filter" onClick={() => {
                  setGenreFilter('');
                  const url = new URL(window.location.href);
                  url.searchParams.delete('genre');
                  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
                }}>Clear genre · </button>}
                <span className="trending-track-count"><Radio size={14} /> {visibleTracks.length} tracks</span>
              </div>
            </div>
            <div className="hot-badge"><TrendingUp size={14} aria-hidden="true" /> {query.trim() || genreFilter ? 'Juba music picks' : 'HOT RIGHT NOW IN JUBA'}</div>
            {loadingCatalog && <p className="muted catalog-status">Loading the published catalog…</p>}
            {catalogError && <div className="notice-box"><b>Catalog unavailable</b><p>{catalogError}</p><button className="button secondary" onClick={refreshCatalog}>Try again</button></div>}
            <section className="track-list">
              {visibleTracks.map((track, index) => <article className="track-row" key={track.id}>
                <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
                <button className="track-art" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}><img src={track.cover || fallbackCover} alt="" /></button>
                <div className="track-meta"><strong>{track.title || 'Untitled track'}</strong><span>{track.artist || 'Junubify artist'} · {track.genre || 'Music'}</span>{track.requiresSubscription && <small className="track-access-note">PREVIEW · SUBSCRIPTION REQUIRED</small>}</div>
                <div className="track-stats">
                  <span><Heart size={14} /> {Number(track.plays || 0).toLocaleString()}</span>
                  <button className="mini-play" onClick={() => playTrack(track)} aria-label={track.requiresSubscription ? `Play preview of ${track.title}` : `Play ${track.title}`}>{playing?.id === track.id && isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
                  <button className={`track-action ${likedTracks[track.id] ? 'liked' : ''}`} onClick={() => toggleLike(track.id)} aria-label={likedTracks[track.id] ? 'Unlike track' : 'Like track'} aria-pressed={Boolean(likedTracks[track.id])}><Heart size={17} fill={likedTracks[track.id] ? 'currentColor' : 'none'} /></button>
                  <button className="track-action" onClick={() => shareTrack(track)} aria-label="Share track"><Share2 size={16} /></button>
                  <OfflineDownloadButton track={track} />
                </div>
              </article>)}
            </section>
            {!visibleTracks.length && <div className="empty-catalog"><Music2 size={26} /><b>No tracks match this filter.</b><span>Choose another genre or clear your search.</span></div>}
          </section>
          <section className="upload-promo"><div><span className="eyebrow">ARE YOU AN ARTIST?</span><h2>Bring your sound to Junubify.</h2><p>Submit your music securely for review in Artist Studio.</p></div><button className="button primary" onClick={() => setTab('studio')}><Upload size={16} /> Open studio</button></section>
        </>)}

        {tab === 'library' && <section className="liked-library"><div className="liked-library-hero"><div className="liked-art"><Heart size={44} fill="currentColor" /></div><div className="liked-library-copy"><span className="eyebrow">YOUR COLLECTION</span><h1>Liked Songs</h1><p>{likedCatalog.length} {likedCatalog.length === 1 ? 'song' : 'songs'} saved on this device</p></div><div className="liked-library-actions"><button className="button primary" disabled={!libraryTracks.length} onClick={() => playAll(libraryTracks)}><Play size={16} fill="currentColor" /> Play</button><button className="button secondary" disabled={!libraryTracks.length} onClick={() => { const [first, ...rest] = shuffleTracks(libraryTracks); if (first) playTrack(first, rest); }}><Shuffle size={16} /> Shuffle</button></div></div>{libraryGenres.length > 0 && <div className="library-filters" role="group" aria-label="Filter liked songs by genre"><button type="button" className={!libraryGenre ? 'active' : ''} aria-pressed={!libraryGenre} onClick={() => setLibraryGenre('')}>All</button>{libraryGenres.map((genre) => <button type="button" key={genre} className={libraryGenre === genre ? 'active' : ''} aria-pressed={libraryGenre === genre} onClick={() => setLibraryGenre(genre)}>{genre}</button>)}</div>}{libraryTracks.length ? <section className="track-list">{libraryTracks.map((track, index) => <article className="track-row" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><button className="track-art" onClick={() => playTrack(track)} aria-label={track.requiresSubscription ? `Play preview of ${track.title}` : `Play ${track.title}`}><img src={track.cover || fallbackCover} alt="" /></button><div className="track-meta"><strong>{track.title}</strong><span>{track.artist} · {track.genre || 'Music'}</span>{track.requiresSubscription && <small className="track-access-note">PREVIEW · SUBSCRIPTION REQUIRED</small>}</div><div className="track-stats"><button className="track-action liked" onClick={() => toggleLike(track.id)} aria-label="Remove from liked songs"><Heart size={17} fill="currentColor" /></button><button className="mini-play" onClick={() => playTrack(track)} aria-label={track.requiresSubscription ? `Play preview of ${track.title}` : `Play ${track.title}`}><Play size={15} /></button><button className="track-action" onClick={() => shareTrack(track)} aria-label={`Share ${track.title}`}><Share2 size={16} /></button><OfflineDownloadButton track={track} /></div></article>)}</section> : <div className="empty-catalog liked-empty"><Heart size={26} /><b>No liked songs yet.</b><span>Tap the heart on a track in Discover to save it here.</span><button className="button secondary" onClick={() => setTab('discover')}>Browse Discover</button></div>}</section>}

        {tab === 'account' && <section className="account-dashboard">
          <header className="account-heading"><span className="eyebrow"><Settings size={14} /> PERSONAL DASHBOARD</span><h1>Your account</h1><p>Make Junubify feel right for you. Your profile and preferences stay on this device.</p></header>
          <section className="account-profile-card">
            <div className={`account-avatar ${profilePhoto ? 'has-profile-photo' : ''}`} style={profilePhoto ? { backgroundImage: `url("${profilePhoto}")` } : undefined} aria-hidden="true">{accountDisplayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
            <div><span className="account-card-kicker">PROFILE</span><h2>{accountDisplayName}</h2><p>{session?.user?.email || 'Guest profile · saved on this device'}</p></div>
            <div className="profile-photo-control">
              <label className="button secondary profile-photo-button"><span>{profilePhoto ? 'Change photo' : 'Add photo'}</span><input type="file" accept="image/*" aria-label="Choose a profile photo" onChange={(event) => {
                void saveProfilePhoto(event.target.files?.[0]);
                event.target.value = '';
              }} /></label>
              {profilePhoto && <button className="text-button profile-photo-remove" type="button" onClick={removeProfilePhoto}>Remove photo</button>}
            </div>
          </section>
          <div className="account-settings-grid">
            <section className="account-card">
              <div className="account-card-heading"><UserRound size={18} /><div><h2>Profile</h2><p>Choose the name shown on your personal dashboard.</p></div></div>
              <form className="account-profile-form" onSubmit={saveProfile}>
                <label htmlFor="account-display-name">Display name</label>
                <input id="account-display-name" autoComplete="nickname" maxLength={60} value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="How should we call you?" />
                <button className="button primary" type="submit">Save profile</button>
              </form>
              <small className="account-local-note">This profile name is stored locally and is not public.</small>
            </section>
            <section className="account-card">
              <div className="account-card-heading"><Sun size={18} /><div><h2>Appearance</h2><p>Pick a comfortable color theme.</p></div></div>
              <label className="account-select-label" htmlFor="account-theme">Theme</label>
              <select id="account-theme" value={theme} onChange={(event) => updatePreference('junubify-theme', event.target.value, setTheme)}>
                <option value="system">Match device</option><option value="dark">Dark</option><option value="light">Light</option>
              </select>
              <label className="account-toggle"><span><strong>High contrast</strong><small>Increase borders and text contrast.</small></span><input type="checkbox" checked={highContrast} onChange={(event) => updatePreference('junubify-high-contrast', event.target.checked, setHighContrast)} /></label>
              <label className="account-toggle"><span><strong>Reduce motion</strong><small>Turn off most animated effects.</small></span><input type="checkbox" checked={reduceMotion} onChange={(event) => updatePreference('junubify-reduce-motion', event.target.checked, setReduceMotion)} /></label>
              <label className="account-toggle"><span><strong>Compact layout</strong><small>Fit more music on screen with tighter track rows.</small></span><input type="checkbox" checked={compactLayout} onChange={(event) => updatePreference('junubify-compact-layout', event.target.checked, setCompactLayout)} /></label>
            </section>
            <section className="account-card">
              <div className="account-card-heading"><ShieldCheck size={18} /><div><h2>Privacy</h2><p>Control optional, anonymous usage measurement and local data.</p></div></div>
              <label className="account-toggle"><span><strong>Anonymous usage analytics</strong><small>Allow aggregated play, like, and search counts to help improve Junubify.</small></span><input type="checkbox" checked={analyticsEnabled} onChange={(event) => updatePreference('junubify-analytics-enabled', event.target.checked, setAnalyticsEnabled)} /></label>
              <div className="account-data-actions account-analytics-actions"><div><strong>Analytics dashboard</strong><small>Review aggregated listening and discovery activity.</small></div><a className="button secondary" href="/analytics.html">Open dashboard</a></div>
              <div className="account-data-actions"><div><strong>Saved listening data</strong><small>{likedCatalog.length} liked tracks · {Object.values(followedArtists).filter(Boolean).length} followed artists</small></div><button className="button secondary account-danger-button" type="button" onClick={() => {
                if (!window.confirm('Clear saved likes and follows from this device?')) return;
                clearLocalListeningData();
              }}>Clear local data</button></div>
            </section>
            <section className="account-card account-accessibility-card">
              <div className="account-card-heading"><Eye size={18} /><div><h2>Comfort & accessibility</h2><p>These preferences apply across the app and are saved on this device.</p></div></div>
              <div className="account-accessibility-note"><span>Keyboard friendly</span><small>Use Tab to move through controls; focused items receive a visible outline.</small></div>
              <div className="account-accessibility-note"><span>Motion aware</span><small>Reduce motion also respects your device’s reduced-motion preference.</small></div>
            </section>
          </div>
        </section>}

        {tab === 'studio' && <><div className="section-heading"><div><span className="eyebrow">ARTIST PORTAL</span><h1>Artist studio</h1><p className="muted">Verified artists with clean metadata checks are published automatically. Other releases stay private until a moderator approves them.</p></div></div>{!supabaseConfigured && <div className="notice-box"><b>Backend setup required</b><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable uploads.</p></div>}{!session?.user ? <form className="auth-card" onSubmit={requestSignIn}><h2>Receive a secure sign-in link</h2><label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="artist@junubify.com" required /></label><button className="button primary" type="submit">Send magic link</button></form> : <section className="panel studio-panel"><div className="signed-in-bar"><div><strong>{session.user.email}</strong><span>Signed in as artist</span></div><button className="button secondary" onClick={signOut}>Sign out</button></div><form className="submit-form" onSubmit={publishTrack}><label>Song title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label><label>Artist name<input value={form.artist} onChange={(event) => setForm({ ...form, artist: event.target.value })} required /></label><label>Genre<select value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })}>{genres.map((genre) => <option key={genre.filter} value={genre.filter}>{genre.name}</option>)}</select></label><label>Album or single<input value={form.album} onChange={(event) => setForm({ ...form, album: event.target.value })} /></label><label>Cover image URL<input type="url" value={form.cover} onChange={(event) => setForm({ ...form, cover: event.target.value })} placeholder="https://..." /></label><div className="upload-box"><label className="file-picker"><input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac" onChange={(event) => handleFile(event.target.files?.[0])} /><span>{selectedFile ? selectedFile.name : 'Choose audio file · up to 50 MB'}</span></label></div><label className="checkbox-row"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />I confirm that I own or control the rights to this audio.</label><button className="button primary" type="submit" disabled={submitting || !supabaseConfigured}>{submitting ? 'Submitting…' : 'Submit track'}</button></form>{artistTracks.length > 0 && <div className="artist-tracks"><h2>Your submissions</h2>{artistTracks.map((track) => <div className="mini-track" key={track.id}><strong>{track.title}</strong><span>{track.status === 'pending_review' ? 'Under review' : track.status === 'published' ? 'Published' : 'Not approved'}</span></div>)}</div>}</section>}</>}

        {tab === 'monetize' && <section className="monetization-page">
          <header className="monetization-heading">
            <span className="eyebrow"><CircleDollarSign size={15} /> CREATOR ECONOMY</span>
            <h1>Earn together</h1>
            <p>A transparent path for Junubify and its artists to earn from music.</p>
          </header>
          <section className="monetization-status" role="status">
            <span className="monetization-status-icon"><Wallet size={20} /></span>
            <div><strong>Payments are not live yet</strong><p>No checkout or payout is being processed. Provider onboarding, verified webhooks, and settlement setup are still required.</p></div>
            <span className="monetization-status-badge">Setup required</span>
          </section>
          <div className="monetization-grid">
            <article className="monetization-card membership-card">
              <span className="eyebrow">FAN MEMBERSHIP</span>
              <h2>Unlock the full Junubify catalog</h2>
              <p>One simple membership for ad-free listening and full subscriber-only releases.</p>
              <ul><li>Full-track listening</li><li>Save releases for offline playback</li><li>Cancel before the next billing period</li></ul>
              <button className="button primary full" type="button" disabled>Subscribe · Coming soon</button>
              <small>Price and local payment method will appear only after merchant setup is verified.</small>
            </article>
            <article className="monetization-card owner-revenue-card">
              <span className="eyebrow">FOR JUNUBIFY</span>
              <h2>Build sustainable platform income</h2>
              <p>Recommended starting channels are optional fan memberships and sponsored placements after the audience grows.</p>
              <ul><li>Membership checkout: not connected</li><li>Sponsorships: not configured</li><li>Platform share: terms not set</li></ul>
            </article>
            <article className="monetization-card artist-revenue-card">
              <span className="eyebrow">FOR ARTISTS</span>
              <h2>Make releases earn for their creators</h2>
              <p>Artist balances must come from verified payments and reconciled settlements—not estimated plays or client-side counters.</p>
              <ul><li>Artist payout accounts: not connected</li><li>Revenue-share terms: not agreed</li><li>Royalty ledger: foundation only</li></ul>
              <div className="payout-summary" aria-label="Artist payout summary">
                <span><small>Available</small><b>Not settled</b></span>
                <span><small>Pending</small><b>Not settled</b></span>
                <span><small>Next payout</small><b>Unavailable</b></span>
              </div>
              <button className="button primary" type="button" onClick={() => setTab('studio')}><Upload size={16} /> Open Artist Studio</button>
            </article>
          </div>
          <section className="play-readiness">
            <div><span className="eyebrow"><Smartphone size={14} /> GOOGLE PLAY READINESS</span><h2>Prepare the Android release</h2><p>This repository currently builds a web app; it does not yet produce an Android App Bundle or validate Play purchases.</p></div>
            <ul><li>Android package and signed release build</li><li>Play Billing and server-side verification for applicable digital purchases; mobile money is not a Play Billing substitute unless an exception applies</li><li>Google currently lists Rwanda for developer registration, but not merchant registration; recheck eligibility before planning Play sales</li><li>Confirm MTN MoMo or Airtel Money merchant collection, artist payouts, refunds, and settlement terms</li></ul>
            <div className="monetization-actions"><a className="button secondary" href="/analytics.html">Review audience analytics</a><button className="button secondary" type="button" onClick={() => setTab('studio')}>Prepare artist releases</button></div>
          </section>
          <p className="monetization-footnote">Do not advertise earnings or accept payments until a provider is verified, artist terms are agreed, and settlement has been tested. Keep Play-distributed digital purchases within Google Play policy. Payment credentials belong only in server-side secrets.</p>
        </section>}
        {tab === 'download' && <section className="app-download panel"><div className="download-icon"><Smartphone size={42} /></div><span className="eyebrow">LISTEN WHEREVER YOU ARE</span><h1>Get Junubify for Android & iOS</h1><p>Use your browser menu and choose “Add to Home screen”.</p><div className="store-buttons"><div className="store-placeholder"><Download size={22} /><span><small>ANDROID APP</small><b>Coming soon</b></span></div><div className="store-placeholder"><Download size={22} /><span><small>APPLE APP</small><b>Coming soon</b></span></div></div></section>}
      </main>

      <audio id="junubify-main-audio" ref={audioRef} src={audioUrl || undefined} preload="metadata" autoPlay onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={handlePlaybackTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={playNext} />

      {playerOpen && playing && (
        <section className="now-playing-view" role="dialog" aria-modal="true" aria-label={`Now playing ${playing.title}`}>
          <div className="now-playing-header">
            <button className="player-back-button" onClick={() => setPlayerOpen(false)} aria-label="Back to browsing"><ArrowLeft size={20} /><span>Back</span></button>
            <span>PLAYING FROM JUNUBIFY<br /><b>{tab === 'library' ? 'LIKED SONGS' : 'NOW PLAYING'}</b></span>
            <button className="player-icon-button" onClick={() => shareTrack(playing)} aria-label="Share track"><Share2 size={20} /></button>
          </div>
          <div className="now-playing-content">
            <img className="now-playing-art" src={playing.cover || fallbackCover} alt={`Cover art for ${playing.title}`} />
            <div className="now-playing-meta">
              <span className="eyebrow">{playing.album || 'FEATURED RELEASE'}</span>
              <div className="now-playing-track">
                <div><h1>{playing.title}</h1><p>{playing.artist}</p></div>
                <button className={`track-action ${likedTracks[playing.id] ? 'liked' : ''}`} onClick={() => toggleLike(playing.id)} aria-label="Like this song"><Heart size={22} fill={likedTracks[playing.id] ? 'currentColor' : 'none'} /></button>
              </div>
            </div>
            {playing.requiresSubscription && <section className="subscription-preview-panel">
              <span className="eyebrow">PREVIEW · SUBSCRIPTION REQUIRED</span>
              <p>You’re listening to the first 20 seconds. Subscription checkout is not available yet, so the full release remains locked.</p>
              <button className="button secondary" type="button" disabled>Subscribe · Coming soon</button>
            </section>}
            <div className="full-player-progress">
              <input aria-label="Seek through track" type="range" min="0" max={playing.requiresSubscription ? 20 : (duration || 1)} value={Math.min(playbackTime, playing.requiresSubscription ? 20 : (duration || 0))} onChange={seek} />
              <div><span>{formatTime(playbackTime)}</span><span>{formatTime(playing.requiresSubscription ? 20 : duration)}</span></div>
            </div>
            <div className="full-player-controls">
              <button className={shuffle ? 'player-icon-button active' : 'player-icon-button'} onClick={() => { setShuffle((value) => !value); if (!shuffle) setPlayQueue(shuffleTracks(playQueue)); }} aria-label="Toggle shuffle"><Shuffle size={22} /></button>
              <button className="player-icon-button" onClick={playPrevious} aria-label="Previous track" disabled={!playHistory.length && playbackTime === 0}><SkipBack size={25} fill="currentColor" /></button>
              <button className="full-player-toggle" onClick={() => playTrack(playing)} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}</button>
              <button className="player-icon-button" onClick={playNext} aria-label="Next track" disabled={!playQueue.length && !repeat}><SkipForward size={25} fill="currentColor" /></button>
              <button className={sleepTimer ? 'player-icon-button active' : 'player-icon-button'} onClick={() => setSleepTimer((value) => !value)} aria-label={sleepTimer ? 'Cancel sleep timer' : 'Start 30 minute sleep timer'}><Timer size={22} /></button>
            </div>
            <div className="player-utility-controls">
              <label className="player-volume-control">
                <Volume2 size={18} aria-hidden="true" />
                <span>Volume</span>
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.currentTarget.value))} aria-label="Volume" />
                <output>{Math.round(volume * 100)}%</output>
              </label>
              <button className="player-icon-button" onClick={selectAudioOutput} aria-label="Select audio output"><Headphones size={21} /></button>
              <button className="player-icon-button" onClick={() => shareTrack(playing)} aria-label="Share track"><Share2 size={21} /></button>
              <button className="player-icon-button" onClick={() => document.getElementById('up-next')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} aria-label="Jump to queue"><ListMusic size={22} /></button>
              {sleepTimer && <span className="sleep-timer-status">30 minute sleep timer is on · tap timer to cancel</span>}
            </div>
            <section className="lyrics-preview">
              <div className="player-section-heading"><h2>Lyrics preview</h2><button className="text-button" onClick={() => setShowLyrics((value) => !value)}>{showLyrics ? 'Hide lyrics' : 'Show lyrics'}</button></div>
              {showLyrics && <p>{playing.lyrics || 'Lyrics are not available for this track yet.'}</p>}
            </section>
            <section className="artist-preview">
              <div className="artist-preview-art"><img src={playing.artistCover || playing.cover || fallbackCover} alt={`Artwork for ${playing.artist}`} /></div>
              <div className="artist-preview-copy"><span className="eyebrow">ABOUT THE ARTIST</span><h2>{playing.artist}</h2><p>{playing.artistBio || 'Artist biography is not available yet.'}</p><button className="button secondary follow-artist" onClick={() => toggleFollow(playing.artist)}>{followedArtists[playing.artist] ? 'Following' : 'Follow'}</button></div>
            </section>
            <section className="player-credits">
              <div className="player-section-heading"><h2>Credits</h2><span className="eyebrow">TRACK DETAILS</span></div>
              <div className="credit-row"><span>{playing.artist}</span><small>Main artist</small></div>
              {playing.album && <div className="credit-row"><span>{playing.album}</span><small>Album</small></div>}
              {Array.isArray(playing.credits) && playing.credits.map((credit, index) => <div className="credit-row" key={`${credit.name}-${index}`}><span>{credit.name}</span><small>{credit.role}</small></div>)}
              {(!playing.credits || !playing.credits.length) && <p>Additional credits are not available for this track yet.</p>}
            </section>
            {playQueue.length > 0 && <section className="up-next" id="up-next"><h2>Up next</h2>{playQueue.map((track, index) => <button key={`${track.id}-${index}`} onClick={() => playTrack(track, playQueue.slice(index + 1))}><img src={track.cover || fallbackCover} alt="" /><span><b>{track.title}</b><small>{track.artist}</small></span><Play size={16} /></button>)}</section>}
          </div>
        </section>
      )}

      <footer className="player">
        <button className="player-track" onClick={() => playing && setPlayerOpen(true)} disabled={!playing} aria-label={playing ? 'Open full media player' : 'Nothing playing'}>
          {playing ? <><img src={playing.cover || fallbackCover} alt="" /><span><b>{playing.title}</b><small>{playing.artist}</small></span><ChevronDown className="player-open-icon" size={17} /></> : <><span className="player-note"><Music2 size={17} /></span><span><b>Nothing playing</b><small>Choose a track</small></span></>}
        </button>
        {playing && <div className="mini-player-progress"><span>{formatTime(playbackTime)}</span><progress max={duration || 1} value={duration ? Math.min(playbackTime, duration) : 0} /><span>{formatTime(duration)}</span></div>}
        <div className="player-right-controls">
          <button className="player-control" onClick={() => playing ? setPlayerOpen(true) : notify('Start a song to adjust its volume.')} aria-label="Open volume control"><Volume2 size={19} /></button>
          <button className="mini-play" onClick={() => playing && playTrack(playing)} aria-label={isPlaying ? 'Pause playback' : 'Start playback'}>{isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button>
        </div>
      </footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
