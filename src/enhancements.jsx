import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, HardDriveDownload, Music2, Play, Trash2, UserRound, X } from 'lucide-react';
import { createTrackAudioUrl } from './lib/catalog.js';

const DB_NAME = 'junubify-offline-library';
const STORE_NAME = 'tracks';

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
    request.onsuccess = () => {
      db.close();
      resolve(request.result.sort((a, b) => b.savedAt - a.savedAt));
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Could not read your offline songs.'));
    };
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
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(track);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Could not save this song offline.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Could not save this song offline.'));
    };
  });
}

async function deleteOfflineTrack(id) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Could not remove this offline song.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Could not remove this offline song.'));
    };
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
    window.addEventListener('junubify-enhancement-notice', displayNotice);
    window.addEventListener('junubify-offline-library-updated', refreshOfflineTracks);
    refreshOfflineTracks();
    return () => {
      window.removeEventListener('junubify-enhancement-notice', displayNotice);
      window.removeEventListener('junubify-offline-library-updated', refreshOfflineTracks);
      window.clearTimeout(noticeTimer.current);
      offlineAudioRef.current?.pause();
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    };
  }, [refreshOfflineTracks]);

  const playOfflineTrack = (track) => {
    if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    activeUrlRef.current = URL.createObjectURL(track.blob);
    setActiveTrack(track);
    const audio = offlineAudioRef.current;
    if (audio) {
      audio.src = activeUrlRef.current;
      audio.play().catch(() => showNotice('Tap play on the offline player to start this song.'));
    }
  };

  const removeOfflineTrack = async (track) => {
    try {
      await deleteOfflineTrack(track.id);
      await refreshOfflineTracks();
      window.dispatchEvent(new Event('junubify-offline-library-updated'));
      if (activeTrack?.id === track.id) {
        offlineAudioRef.current?.pause();
        if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = '';
        setActiveTrack(null);
      }
      showNotice(`${track.title} removed from offline songs.`);
    } catch (error) {
      showNotice(error.message || 'Could not remove this offline song.');
    }
  };

  return <>
    <button className="offline-library-launcher" type="button" onClick={() => { setDrawerOpen((open) => !open); refreshOfflineTracks(); }} aria-expanded={drawerOpen} aria-label="Open offline songs">
      <HardDriveDownload size={17} /><span>Offline</span>{offlineTracks.length > 0 && <b>{offlineTracks.length}</b>}
    </button>
    <aside className="offline-library-drawer" hidden={!drawerOpen} aria-label="Offline songs">
      <header><div><span className="eyebrow">YOUR DOWNLOADS</span><h2>Listen offline</h2></div><button type="button" className="offline-close" onClick={() => setDrawerOpen(false)} aria-label="Close offline songs"><X size={18} /></button></header>
      <p className="offline-library-note">Saved audio stays on this device. Use Download on any available song to keep it here.</p>
      {offlineTracks.length ? <ul>{offlineTracks.map((track) => <li className={activeTrack?.id === track.id ? 'is-active' : ''} key={track.id}>
        <div className="offline-track-art">{track.cover ? <img src={track.cover} alt="" /> : <Music2 size={19} aria-hidden="true" />}</div>
        <span><strong>{track.title}</strong><small>{track.artist}</small>{activeTrack?.id === track.id && <small className="offline-track-active">Selected for playback</small>}</span>
        <button type="button" onClick={() => playOfflineTrack(track)} aria-label={`Play ${track.title} offline`}><Play size={16} fill="currentColor" /></button>
        <button type="button" onClick={() => removeOfflineTrack(track)} aria-label={`Remove ${track.title} from offline songs`}><Trash2 size={16} /></button>
      </li>)}</ul> : <div className="offline-empty"><Music2 size={25} /><b>No offline songs yet</b><span>Use Download on a song to save it to this device.</span></div>}
      <div className="subscription-readiness"><strong>Subscription-only releases</strong><span>Subscription checkout is not active yet, so locked songs cannot be purchased in the app.</span></div>
      <div className="offline-now-playing" hidden={!activeTrack}>
        <span>OFFLINE NOW PLAYING</span>
        {activeTrack && <b>{activeTrack.title} · {activeTrack.artist}</b>}
        <audio ref={offlineAudioRef} controls onEnded={() => setActiveTrack(null)} />
      </div>
    </aside>
    {notice && <div className="enhancement-toast" role="status">{notice}</div>}
    <span className="visually-hidden"><UserRound /></span>
  </>;
}
