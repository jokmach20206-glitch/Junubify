import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, HardDriveDownload, Music2, Play, Trash2, UserRound, X } from 'lucide-react';
import { createTrackAudioUrl } from './lib/catalog.js';

const DB_NAME = 'junubify-offline-library';
const STORE_NAME = 'tracks';
const PROFILE_KEY = 'junubify-profile-photo';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Offline storage is not supported by this browser.'));
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline storage.'));
  });
}

async function getOfflineTracks() {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.savedAt - a.savedAt));
    request.onerror = () => reject(request.error || new Error('Could not read your offline songs.'));
    request.onsuccess = ((original) => (event) => {
      db.close();
      original(event);
    })(request.onsuccess);
  });
}

async function hasOfflineTrack(id) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => {
      db.close();
      resolve(Boolean(request.result));
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Could not check offline songs.'));
    };
  });
}


async function saveOfflineTrack(track) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(track);
    request.onsuccess = () => { db.close(); resolve(); };
    request.onerror = () => { db.close(); reject(request.error || new Error('Could not save this song offline.')); };
  });
}

async function deleteOfflineTrack(id) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => { db.close(); resolve(); };
    request.onerror = () => { db.close(); reject(request.error || new Error('Could not remove this offline song.')); };
  });
}

function showNotice(message) {
  window.dispatchEvent(new CustomEvent('junubify-enhancement-notice', { detail: message }));
}

export function OfflineDownloadButton({ track }) {
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const locked = track.requiresSubscription === true;

  useEffect(() => {
    let active = true;
    const refreshSavedState = () => {
      hasOfflineTrack(track.id).then((exists) => {
        if (active) {
          setSaved(exists);
          setStorageAvailable(true);
        }
      }).catch(() => {
        if (active) setStorageAvailable(false);
      });
    };
    refreshSavedState();
    window.addEventListener('junubify-offline-library-updated', refreshSavedState);
    return () => {
      active = false;
      window.removeEventListener('junubify-offline-library-updated', refreshSavedState);
    };
  }, [track.id]);

  const downloadTrack = async () => {
    if (locked || saved) return;
    setDownloading(true);
    try {
      const source = track.audioPath ? await createTrackAudioUrl(track.audioPath) : track.audioUrl;
      if (!source) throw new Error('Audio is not available for this track.');
      const response = await fetch(source);
      if (!response.ok) throw new Error('The audio could not be downloaded. Check your connection and try again.');
      const blob = await response.blob();
      if (!blob.size) throw new Error('The audio file was empty. Try again.');

      await saveOfflineTrack({
        id: track.id,
        title: track.title || 'Junubify track',
        artist: track.artist || 'Junubify artist',
        cover: track.cover || '',
        blob,
        savedAt: Date.now(),
        contentType: blob.type || 'audio/mpeg',
      });
      window.dispatchEvent(new Event('junubify-offline-library-updated'));
      showNotice(`${track.title || 'This song'} is ready for offline listening.`);
    } catch (error) {
      showNotice(error.message || 'Could not save this song offline.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      className="track-action offline-download-button"
      type="button"
      onClick={downloadTrack}
      disabled={downloading || locked || saved || !storageAvailable}
      aria-label={saved
        ? `${track.title || 'Song'} is saved for offline listening`
        : storageAvailable ? `Save ${track.title || 'song'} for offline listening` : 'Offline storage is unavailable'}
      title={locked ? 'Subscription required; downloads are unavailable' : saved ? 'Saved for offline listening' : storageAvailable ? 'Save for offline listening' : 'Offline storage is unavailable in this browser'}
    >
      {saved ? <Check size={15} /> : locked || !storageAvailable ? <HardDriveDownload size={15} /> : <Download size={15} />}
      <span className="offline-button-label">{downloading ? 'Saving…' : saved ? 'Saved' : locked ? 'Locked' : storageAvailable ? 'Download' : 'Unavailable'}</span>
    </button>
  );
}


function applyProfilePhoto(photo) {
  document.querySelectorAll('.account-avatar, .account-menu-avatar').forEach((avatar) => {
    avatar.classList.add('has-profile-photo');
    avatar.style.backgroundImage = `url("${photo}")`;
    avatar.textContent = '';
    avatar.setAttribute('aria-label', 'Your profile photo');
  });
}

function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.onload = () => { image.src = reader.result; };
    image.onerror = () => reject(new Error('Choose a valid image file.'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    reader.readAsDataURL(file);
  });
}

function attachProfilePhotoControl() {
  const card = document.querySelector('.account-profile-card');
  if (!card || card.querySelector('.profile-photo-control')) return;
  const control = document.createElement('div');
  control.className = 'profile-photo-control';
  control.innerHTML = '<label class="button secondary profile-photo-button"><span>Change photo</span><input type="file" accept="image/*" aria-label="Choose a profile photo"></label><button class="text-button profile-photo-remove" type="button">Remove photo</button>';
  const input = control.querySelector('input');
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_PHOTO_BYTES) {
      showNotice('Choose an image smaller than 5 MB.');
      input.value = '';
      return;
    }
    try {
      const photo = await compressProfilePhoto(file);
      window.localStorage.setItem(PROFILE_KEY, photo);
      applyProfilePhoto(photo);
      showNotice('Profile photo saved on this device.');
    } catch (error) {
      showNotice(error.message || 'Could not save this profile photo.');
    }
    input.value = '';
  });
  control.querySelector('button').addEventListener('click', () => {
    window.localStorage.removeItem(PROFILE_KEY);
    document.querySelectorAll('.account-avatar, .account-menu-avatar').forEach((avatar) => {
      avatar.classList.remove('has-profile-photo');
      avatar.style.backgroundImage = '';
      avatar.textContent = [...(document.querySelector('.account-profile-card h2')?.textContent || 'Listener').trim().split(/\s+/)]
        .slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
      avatar.removeAttribute('aria-label');
    });
    showNotice('Profile photo removed.');
  });
  card.append(control);
}

function trackIdFromRow(row) {
  const title = row.querySelector('.track-meta strong')?.textContent?.trim() || 'Junubify track';
  const artist = row.querySelector('.track-meta span')?.textContent?.split('·')[0]?.trim() || 'Junubify artist';
  const image = row.querySelector('.track-art img');
  return { id: `${title}\u0000${artist}`, title, artist, cover: image?.src || '' };
}

function attachDownloadButtons() {
  document.querySelectorAll('.track-row').forEach((row) => {
    const stats = row.querySelector('.track-stats');
    if (!stats || stats.querySelector('.offline-download-button')) return;
    const button = document.createElement('button');
    button.className = 'track-action offline-download-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Save song for offline listening');
    button.title = 'Save for offline listening';
    button.innerHTML = '<span class="offline-button-label">Download</span>';
    button.addEventListener('click', async () => {
      if (row.matches('[data-premium="true"], .premium-track') || row.querySelector('[data-premium="true"]')) {
        showNotice('This release requires a subscription. Subscription payments are not available yet.');
        return;
      }
      const audio = document.getElementById('junubify-main-audio');
      if (!audio) return showNotice('The music player is not available.');
      const metadata = trackIdFromRow(row);
      const trackButton = row.querySelector('.track-art, .mini-play');
      const startingSource = audio.currentSrc || audio.src;
      const wasMuted = audio.muted;
      const wasPlaying = !audio.paused;
      audio.muted = true;
      button.disabled = true;
      button.classList.add('is-downloading');
      button.querySelector('.offline-button-label').textContent = 'Preparing…';
      try {
        if (trackButton && !row.classList.contains('is-playing') && !row.querySelector('[aria-label="Pause playback"]')) trackButton.click();
        let source = audio.currentSrc || audio.src;
        const deadline = Date.now() + 18000;
        while ((!source || (source === startingSource && metadata.title !== 'Junubify track')) && Date.now() < deadline) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          source = audio.currentSrc || audio.src;
          const currentTitle = document.querySelector('.player-track b')?.textContent?.trim();
          if (currentTitle && currentTitle !== metadata.title) source = '';
        }
        if (!source) throw new Error('Could not prepare this song. Try playing it once, then download again.');
        const response = await fetch(source);
        if (!response.ok) throw new Error('The audio could not be downloaded. Check your connection and try again.');
        const blob = await response.blob();
        if (!blob.size) throw new Error('The audio file was empty. Try again.');
        await saveOfflineTrack({ ...metadata, blob, savedAt: Date.now(), contentType: blob.type || 'audio/mpeg' });
        window.dispatchEvent(new Event('junubify-offline-library-updated'));
        showNotice(`${metadata.title} is ready for offline listening.`);
      } catch (error) {
        showNotice(error.message || 'Could not save this song offline.');
      } finally {
        audio.muted = wasMuted;
        if (!wasPlaying && audio.currentSrc) audio.pause();
        button.disabled = false;
        button.classList.remove('is-downloading');
        button.querySelector('.offline-button-label').textContent = 'Download';
      }
    });
    stats.append(button);
  });
}

export default function JunubifyEnhancements() {
  const [notice, setNotice] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [offlineTracks, setOfflineTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const offlineAudioRef = useRef(null);
  const activeUrlRef = useRef('');
  const noticeTimer = useRef(null);

  const refreshOfflineTracks = useCallback(async () => {
    try {
      setOfflineTracks(await getOfflineTracks());
    } catch (error) {
      setNotice(error.message || 'Offline storage is unavailable.');
    }
  }, []);

  useEffect(() => {
    const displayNotice = (event) => {
      setNotice(typeof event.detail === 'string' ? event.detail : '');
      window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => setNotice(''), 4500);
    };
    const observer = new MutationObserver(() => {
      attachProfilePhotoControl();
      const photo = window.localStorage.getItem(PROFILE_KEY);
      if (photo) applyProfilePhoto(photo);
      document.querySelectorAll('.genre-card-track-preview').forEach((preview) => {
        preview.innerHTML = '<b>CURATED SOUNDS</b><span>Discover the rhythm. Find your next favorite.</span>';
      });
    });
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    window.addEventListener('junubify-enhancement-notice', displayNotice);
    window.addEventListener('junubify-offline-library-updated', refreshOfflineTracks);
    attachProfilePhotoControl();
    refreshOfflineTracks();
    return () => {
      observer.disconnect();
      window.removeEventListener('junubify-enhancement-notice', displayNotice);
      window.removeEventListener('junubify-offline-library-updated', refreshOfflineTracks);
      window.clearTimeout(noticeTimer.current);
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    };
  }, [refreshOfflineTracks]);

  const playOfflineTrack = (track) => {
    if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    activeUrlRef.current = URL.createObjectURL(track.blob);
    setActiveTrack(track);
    window.setTimeout(() => offlineAudioRef.current?.play().catch(() => showNotice('Tap play again to start offline audio.')), 0);
  };

  const removeOfflineTrack = async (track) => {
    await deleteOfflineTrack(track.id);
    await refreshOfflineTracks();
    window.dispatchEvent(new Event('junubify-offline-library-updated'));
    if (activeTrack?.id === track.id) {
      offlineAudioRef.current?.pause();
      setActiveTrack(null);
    }
    showNotice(`${track.title} removed from offline songs.`);
  };

  return <>
    <button className="offline-library-launcher" type="button" onClick={() => { setDrawerOpen((open) => !open); refreshOfflineTracks(); }} aria-expanded={drawerOpen} aria-label="Open offline songs">
      <HardDriveDownload size={17} /><span>Offline</span>{offlineTracks.length > 0 && <b>{offlineTracks.length}</b>}
    </button>
    {drawerOpen && <aside className="offline-library-drawer" aria-label="Offline songs">
      <header><div><span className="eyebrow">YOUR DOWNLOADS</span><h2>Listen offline</h2></div><button type="button" className="offline-close" onClick={() => setDrawerOpen(false)} aria-label="Close offline songs"><X size={18} /></button></header>
      <p className="offline-library-note">Saved audio stays on this device. Start a song, then tap Download to keep it here.</p>
      {offlineTracks.length ? <ul>{offlineTracks.map((track) => <li key={track.id}>
        {track.cover && <img src={track.cover} alt="" />}
        <span><strong>{track.title}</strong><small>{track.artist}</small></span>
        <button type="button" onClick={() => playOfflineTrack(track)} aria-label={`Play ${track.title} offline`}><Play size={16} fill="currentColor" /></button>
        <button type="button" onClick={() => removeOfflineTrack(track)} aria-label={`Remove ${track.title} from offline songs`}><Trash2 size={16} /></button>
      </li>)}</ul> : <div className="offline-empty"><Music2 size={25} /><b>No offline songs yet</b><span>Use Download on a song to save it to this device.</span></div>}
      <div className="subscription-readiness"><strong>Subscription-only releases</strong><span>Premium downloads will be marked when available. Subscription checkout is not active yet, so locked songs cannot be purchased in the app.</span></div>
      {activeTrack && <div className="offline-now-playing"><span>OFFLINE NOW PLAYING</span><b>{activeTrack.title} · {activeTrack.artist}</b><audio ref={offlineAudioRef} controls src={activeUrlRef.current} onEnded={() => setActiveTrack(null)} /></div>}
    </aside>}
    {notice && <div className="enhancement-toast" role="status">{notice}</div>}
    <span className="visually-hidden"><Download /> <UserRound /></span>
  </>;
}
